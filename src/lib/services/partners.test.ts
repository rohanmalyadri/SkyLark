import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PromoCode } from "@/lib/domain/types";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
});

const iso = (daysFromNow: number) => new Date(Date.now() + daysFromNow * 86_400_000).toISOString();

async function seedCode(over: Partial<PromoCode> & { code: string }) {
  const { systemRepo } = await import("@/lib/data");
  return systemRepo().upsertPromoCode({
    kind: "percent",
    value: 20,
    currency: "USD",
    description: "Test code",
    partnerId: null,
    appliesToPlans: [],
    firstPeriodOnly: true,
    maxRedemptions: null,
    startsAt: iso(-1),
    expiresAt: null,
    active: true,
    ...over,
  });
}

describe("promo code quoting", () => {
  it("takes a percentage off and rounds to cents", async () => {
    await seedCode({ code: "PCT15", kind: "percent", value: 15 });
    const { quoteDiscount } = await import("./partners");
    const q = await quoteDiscount("pct15", "professional", 49, "USD");
    expect(q.code).toBe("PCT15");
    expect(q.discount).toBe(7.35);
    expect(q.net).toBe(41.65);
  });

  it("takes a fixed amount off", async () => {
    await seedCode({ code: "FLAT25", kind: "amount", value: 25 });
    const { quoteDiscount } = await import("./partners");
    expect((await quoteDiscount("FLAT25", "professional", 49, "USD")).net).toBe(24);
  });

  it("never discounts below zero", async () => {
    await seedCode({ code: "HUGE", kind: "amount", value: 500 });
    const { quoteDiscount } = await import("./partners");
    const q = await quoteDiscount("HUGE", "entry", 19, "USD");
    expect(q.discount).toBe(19);
    expect(q.net).toBe(0);
  });

  it("refuses a fixed-amount code in another currency rather than treating the number as equivalent", async () => {
    await seedCode({ code: "EUR10", kind: "amount", value: 10, currency: "EUR" });
    const { quoteDiscount } = await import("./partners");
    await expect(quoteDiscount("EUR10", "entry", 19, "USD")).rejects.toThrow(/only valid in EUR/);
  });

  it("rejects unknown, inactive, unstarted, expired and exhausted codes", async () => {
    const { quoteDiscount } = await import("./partners");
    await expect(quoteDiscount("NOPE", "entry", 19, "USD")).rejects.toThrow(/don't|isn't a code/i);

    await seedCode({ code: "OFF", active: false });
    await expect(quoteDiscount("OFF", "entry", 19, "USD")).rejects.toThrow(/no longer active/);

    await seedCode({ code: "SOON", startsAt: iso(5) });
    await expect(quoteDiscount("SOON", "entry", 19, "USD")).rejects.toThrow(/isn't active yet/);

    await seedCode({ code: "GONE", expiresAt: iso(-1) });
    await expect(quoteDiscount("GONE", "entry", 19, "USD")).rejects.toThrow(/expired/);

    const full = await seedCode({ code: "FULL", maxRedemptions: 1 });
    const { systemRepo } = await import("@/lib/data");
    await systemRepo().redeemPromoCode(full.code);
    await expect(quoteDiscount("FULL", "entry", 19, "USD")).rejects.toThrow(/fully claimed/);
  });

  it("honours a plan restriction", async () => {
    await seedCode({ code: "PROONLY", appliesToPlans: ["professional", "executive"] });
    const { quoteDiscount } = await import("./partners");
    await expect(quoteDiscount("PROONLY", "entry", 19, "USD")).rejects.toThrow(/doesn't apply to this plan/);
    await expect(quoteDiscount("PROONLY", "professional", 49, "USD")).resolves.toBeTruthy();
  });

  it("quoting does not consume a redemption", async () => {
    const code = await seedCode({ code: "KEEP", maxRedemptions: 1 });
    const { quoteDiscount } = await import("./partners");
    const { systemRepo } = await import("@/lib/data");
    await quoteDiscount("KEEP", "entry", 19, "USD");
    await quoteDiscount("KEEP", "entry", 19, "USD");
    expect((await systemRepo().getPromoCode(code.code))!.redemptions).toBe(0);
  });
});

describe("redemption caps", () => {
  it("stops at the cap so the last redemption can't be taken twice", async () => {
    await seedCode({ code: "ONCE", maxRedemptions: 1 });
    const { systemRepo } = await import("@/lib/data");
    const repo = systemRepo();
    expect(await repo.redeemPromoCode("ONCE")).toBe(true);
    expect(await repo.redeemPromoCode("ONCE")).toBe(false);
    expect((await repo.getPromoCode("ONCE"))!.redemptions).toBe(1);
  });
});

describe("referral attribution", () => {
  it("attributes a sign-up by share token and does not double-count a repeat visit", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { attributeSignUp } = await import("./partners");
    const repo = systemRepo();
    const partner = await repo.createPartner({
      userId: null,
      name: "Test Partner",
      email: `p${Math.random()}@example.org`,
      promoCode: "TESTPART",
      linkToken: "tok123456789012",
      status: "active",
      payout: { perReferral: 25, flatMonthly: 0, currency: "USD", barter: false },
      note: "",
      createdBy: null,
    });
    const user = await repo.createUser({ email: `u${Math.random()}@example.org`, fullName: "Referred", role: "candidate", avatarUrl: null, onboardedAt: null });

    const first = await attributeSignUp(user.id, { linkToken: partner.linkToken });
    expect(first?.partnerId).toBe(partner.id);
    expect(first?.status).toBe("signed_up");

    const second = await attributeSignUp(user.id, { linkToken: partner.linkToken });
    expect(second?.id).toBe(first?.id);
    expect(await repo.listReferrals({ partnerId: partner.id })).toHaveLength(1);
  });

  it("ignores an unknown code and a paused partner instead of failing a sign-up", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { attributeSignUp } = await import("./partners");
    const repo = systemRepo();
    const user = await repo.createUser({ email: `u${Math.random()}@example.org`, fullName: "Referred", role: "candidate", avatarUrl: null, onboardedAt: null });
    expect(await attributeSignUp(user.id, { promoCode: "WHOKNOWS" })).toBeNull();

    const paused = await repo.createPartner({
      userId: null,
      name: "Paused",
      email: `pp${Math.random()}@example.org`,
      promoCode: "PAUSEDP",
      linkToken: "tok999999999999",
      status: "paused",
      payout: { perReferral: 10, flatMonthly: 0, currency: "USD", barter: false },
      note: "",
      createdBy: null,
    });
    expect(await attributeSignUp(user.id, { promoCode: paused.promoCode })).toBeNull();
  });

  it("converts an open referral once and credits the partner's rate", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { attributeSignUp, recordConversion, partnerStats } = await import("./partners");
    const repo = systemRepo();
    const admin = await repo.createUser({ email: `a${Math.random()}@example.org`, fullName: "Admin", role: "admin", avatarUrl: null, onboardedAt: null });
    const partner = await repo.createPartner({
      userId: null,
      name: "Converter",
      email: `cv${Math.random()}@example.org`,
      promoCode: "CONVERT",
      linkToken: "tok111111111111",
      status: "active",
      payout: { perReferral: 30, flatMonthly: 100, currency: "USD", barter: false },
      note: "",
      createdBy: admin.id,
    });
    const user = await repo.createUser({ email: `u${Math.random()}@example.org`, fullName: "Buyer", role: "candidate", avatarUrl: null, onboardedAt: null });
    await attributeSignUp(user.id, { promoCode: partner.promoCode });

    const res = await recordConversion(user.id, { planId: "professional", amount: 49, currency: "USD" });
    expect(res.converted).toBe(true);

    // A second attempt finds nothing open rather than paying twice for one customer.
    expect((await recordConversion(user.id, { planId: "professional", amount: 49, currency: "USD" })).converted).toBe(false);

    const stats = await partnerStats(admin, partner.id);
    expect(stats.conversions).toBe(1);
    expect(stats.revenue).toBe(49);
    expect(stats.earnings).toBe(130); // one referral at 30 plus the 100 monthly retainer
  });

  it("reports no cash earnings for a barter partner", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { attributeSignUp, recordConversion, partnerStats } = await import("./partners");
    const repo = systemRepo();
    const admin = await repo.createUser({ email: `a${Math.random()}@example.org`, fullName: "Admin", role: "admin", avatarUrl: null, onboardedAt: null });
    const partner = await repo.createPartner({
      userId: null,
      name: "Barter",
      email: `b${Math.random()}@example.org`,
      promoCode: "BARTERED",
      linkToken: "tok222222222222",
      status: "active",
      payout: { perReferral: 30, flatMonthly: 0, currency: "USD", barter: true },
      note: "",
      createdBy: admin.id,
    });
    const user = await repo.createUser({ email: `u${Math.random()}@example.org`, fullName: "Buyer", role: "candidate", avatarUrl: null, onboardedAt: null });
    await attributeSignUp(user.id, { promoCode: partner.promoCode });
    await recordConversion(user.id, { planId: "entry", amount: 19, currency: "USD" });

    const stats = await partnerStats(admin, partner.id);
    expect(stats.conversions).toBe(1);
    expect(stats.earnings).toBe(0);
  });

  it("refuses the conversion when the code is already exhausted", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { recordConversion } = await import("./partners");
    await seedCode({ code: "LASTONE", maxRedemptions: 1 });
    const repo = systemRepo();
    await repo.redeemPromoCode("LASTONE");
    const user = await repo.createUser({ email: `u${Math.random()}@example.org`, fullName: "Late", role: "candidate", avatarUrl: null, onboardedAt: null });

    const res = await recordConversion(user.id, { planId: "entry", amount: 19, currency: "USD", promoCode: "LASTONE" });
    expect(res).toEqual({ converted: false, reason: "promo_unavailable" });
  });
});
