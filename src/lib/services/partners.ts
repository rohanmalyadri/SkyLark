import "server-only";
import { randomBytes } from "node:crypto";
import { systemRepo, userRepo } from "@/lib/data";
import type { DiscountQuote, Partner, PartnerStats, PlanId, PromoCode, Referral, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { audit } from "./audit";
import { notify } from "./notifications";

/*
 * The affiliate programme. A partner gets a promo code and a share link; a visitor who
 * arrives through it is attributed to them, and the attribution survives until the visitor
 * subscribes — at which point the referral converts and earns.
 *
 * Unlike the service we took this idea from, the link token carries no information: it is
 * random, not a reversible encoding of the promo code.
 */

const newLinkToken = () => randomBytes(12).toString("base64url");

export const normalizeCode = (code: string) => code.trim().toUpperCase();

/* ---------- Discounts ---------- */

/** Rounds money to cents, so a percentage never produces a fraction of a cent. */
const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Prices a promo code against a plan. Read-only: nothing is redeemed until the payment
 * actually succeeds, so a visitor can try codes on the pricing page without burning them.
 */
export async function quoteDiscount(code: string, planId: PlanId, gross: number, currency: string): Promise<DiscountQuote> {
  const c = normalizeCode(code);
  if (!c) throw new AppError("validation", "Enter a promo code.");
  const promo = await systemRepo().getPromoCode(c);
  if (!promo) throw new AppError("not_found", `${c} isn't a code we recognise.`);

  const now = new Date().toISOString();
  if (!promo.active) throw new AppError("validation", `${c} is no longer active.`);
  if (promo.startsAt > now) throw new AppError("validation", `${c} isn't active yet.`);
  if (promo.expiresAt && promo.expiresAt <= now) throw new AppError("validation", `${c} has expired.`);
  if (promo.maxRedemptions !== null && promo.redemptions >= promo.maxRedemptions) throw new AppError("validation", `${c} has been fully claimed.`);
  if (promo.appliesToPlans.length && !promo.appliesToPlans.includes(planId)) throw new AppError("validation", `${c} doesn't apply to this plan.`);
  if (promo.kind === "amount" && promo.currency !== currency) throw new AppError("validation", `${c} is only valid in ${promo.currency}.`);

  const raw = promo.kind === "percent" ? (gross * promo.value) / 100 : promo.value;
  // Never discount below zero, and never hand back more than the price.
  const discount = money(Math.min(raw, gross));
  return { code: c, description: promo.description, gross: money(gross), discount, net: money(gross - discount), currency, firstPeriodOnly: promo.firstPeriodOnly };
}

/** Quote without throwing, for surfaces that show a code's effect as the user types. */
export async function tryQuoteDiscount(code: string, planId: PlanId, gross: number, currency: string) {
  try {
    return { ok: true as const, quote: await quoteDiscount(code, planId, gross, currency) };
  } catch (err) {
    return { ok: false as const, error: err instanceof AppError ? err.message : "That code can't be applied." };
  }
}

/* ---------- Attribution ---------- */

/** Resolves a share link token to the partner behind it. */
export async function partnerForLink(token: string) {
  if (!token || token.length > 64) return null;
  return systemRepo().getPartnerByLinkToken(token);
}

/**
 * Attributes a newly created account to a partner, by promo code or share token. Called
 * from sign-up; a missing or unknown code is not an error, it just means no attribution.
 */
export async function attributeSignUp(userId: string, ref: { promoCode?: string; linkToken?: string }) {
  const repo = systemRepo();
  const partner = ref.linkToken ? await repo.getPartnerByLinkToken(ref.linkToken) : ref.promoCode ? await repo.getPartnerByPromoCode(normalizeCode(ref.promoCode)) : null;
  if (!partner || partner.status !== "active") return null;
  // One referral per account per partner: a second visit is not a second referral.
  const existing = await repo.getReferral(partner.id, userId);
  if (existing) return existing;
  return repo.createReferral({ partnerId: partner.id, userId, promoCode: partner.promoCode, status: "signed_up", planId: null, amount: 0, currency: partner.payout.currency, convertedAt: null });
}

/**
 * Converts a referral once the customer has actually paid, and redeems the promo code.
 * Returns false when the code could not be redeemed, so the caller can refuse the discount.
 */
export async function recordConversion(userId: string, input: { planId: PlanId; amount: number; currency: string; promoCode?: string }) {
  const repo = systemRepo();
  if (input.promoCode) {
    const redeemed = await repo.redeemPromoCode(normalizeCode(input.promoCode));
    if (!redeemed) return { converted: false, reason: "promo_unavailable" as const };
  }

  const open = (await repo.listReferrals({ userId, status: ["visited", "signed_up"], limit: 5 }))[0];
  if (!open) return { converted: false, reason: "no_referral" as const };

  const now = new Date().toISOString();
  const referral = await repo.updateReferral(open.id, { status: "converted", planId: input.planId, amount: input.amount, currency: input.currency, convertedAt: now });
  const partner = await repo.getPartner(referral.partnerId);
  if (partner?.userId) {
    await notify(partner.userId, {
      type: "billing",
      title: "A referral converted",
      body: `Someone you referred subscribed to ${input.planId}. Your earnings are updated.`,
      href: "/partner",
    });
  }
  return { converted: true as const, referral };
}

/* ---------- Partner dashboard ---------- */

function statsFor(partner: Partner, referrals: Referral[]): PartnerStats {
  const conversions = referrals.filter((r) => r.status === "converted");
  const revenue = conversions.reduce((n, r) => n + r.amount, 0);
  const byDay = new Map<string, { day: string; signUps: number; conversions: number }>();
  for (let i = 29; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    byDay.set(day, { day, signUps: 0, conversions: 0 });
  }
  for (const r of referrals) {
    const bucket = byDay.get(r.createdAt.slice(0, 10));
    if (bucket) bucket.signUps++;
    if (r.convertedAt) {
      const c = byDay.get(r.convertedAt.slice(0, 10));
      if (c) c.conversions++;
    }
  }
  return {
    partner,
    visits: referrals.filter((r) => r.status === "visited").length,
    signUps: referrals.filter((r) => r.status !== "void").length,
    conversions: conversions.length,
    revenue: money(revenue),
    // Barter partners are paid in kind, so their cash earnings are zero by definition.
    earnings: partner.payout.barter ? 0 : money(conversions.length * partner.payout.perReferral + partner.payout.flatMonthly),
    currency: partner.payout.currency,
    byDay: [...byDay.values()],
    recent: referrals.slice(0, 20),
  };
}

/** The signed-in partner's own numbers. */
export async function myPartnerStats(user: User) {
  const repo = await userRepo();
  const partner = await repo.getPartnerForUser(user.id);
  if (!partner) return null;
  return statsFor(partner, await repo.listReferrals({ partnerId: partner.id, limit: 500 }));
}

export async function partnerStats(staff: User, partnerId: string) {
  const repo = systemRepo();
  const partner = await repo.getPartner(partnerId);
  if (!partner) throw notFound("Partner");
  void staff;
  return statsFor(partner, await repo.listReferrals({ partnerId, limit: 500 }));
}

/* ---------- Staff administration ---------- */

export async function listPartnersWithStats(staff: User) {
  const repo = systemRepo();
  const partners = await repo.listPartners({ limit: 200 });
  const all = await repo.listReferrals({ limit: 5000 });
  void staff;
  return partners.map((p) => statsFor(p, all.filter((r) => r.partnerId === p.id)));
}

export async function createPartner(
  staff: User,
  input: { name: string; email: string; promoCode: string; perReferral: number; flatMonthly: number; currency: string; barter: boolean; note: string; discountPercent: number },
) {
  const repo = systemRepo();
  const promoCode = normalizeCode(input.promoCode);
  if (await repo.getPartnerByPromoCode(promoCode)) throw new AppError("conflict", `${promoCode} is already used by another partner.`);
  if (await repo.getPromoCode(promoCode)) throw new AppError("conflict", `${promoCode} already exists as a promo code.`);

  const partner = await repo.createPartner({
    userId: null,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    promoCode,
    linkToken: newLinkToken(),
    status: "active",
    payout: { perReferral: input.perReferral, flatMonthly: input.flatMonthly, currency: input.currency, barter: input.barter },
    note: input.note.trim(),
    createdBy: staff.id,
  });

  // A partner without a working code is useless, so the code is created with them.
  await repo.upsertPromoCode({
    code: promoCode,
    kind: "percent",
    value: input.discountPercent,
    currency: input.currency,
    description: `${partner.name}: ${input.discountPercent}% off your first month`,
    partnerId: partner.id,
    appliesToPlans: [],
    firstPeriodOnly: true,
    maxRedemptions: null,
    startsAt: new Date().toISOString(),
    expiresAt: null,
    active: true,
  });
  await audit(staff, "partner.created", "partner", partner.id, { promoCode, discountPercent: input.discountPercent });
  return partner;
}

export async function updatePartner(staff: User, partnerId: string, patch: Partial<Pick<Partner, "name" | "email" | "status" | "note">> & { payout?: Partner["payout"] }) {
  const repo = systemRepo();
  if (!(await repo.getPartner(partnerId))) throw notFound("Partner");
  const updated = await repo.updatePartner(partnerId, patch);
  await audit(staff, "partner.updated", "partner", partnerId, { fields: Object.keys(patch) });
  return updated;
}

export async function listPromoCodes(staff: User) {
  void staff;
  return systemRepo().listPromoCodes({ limit: 200 });
}

export async function savePromoCode(staff: User, input: Omit<PromoCode, "redemptions" | "createdAt">) {
  const repo = systemRepo();
  const saved = await repo.upsertPromoCode({ ...input, code: normalizeCode(input.code) });
  await audit(staff, "promo_code.saved", "promo_code", saved.code, { kind: saved.kind, value: saved.value, active: saved.active });
  return saved;
}
