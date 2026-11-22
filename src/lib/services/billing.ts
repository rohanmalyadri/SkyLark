import "server-only";
import { randomUUID } from "node:crypto";
import { systemRepo, userRepo } from "@/lib/data";
import { isDemoMode, razorpayEnabled, serverEnv } from "@/lib/env";
import type { Plan, PlanId, Subscription, User } from "@/lib/domain/types";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";
import { audit } from "./audit";
import { quoteDiscount, recordConversion } from "./partners";
import { notify } from "./notifications";
import {
  cancelRazorpaySubscription,
  createSubscription,
  ensurePlan,
  fetchPayment,
  fetchSubscription,
  fromMinorUnits,
  notesOf,
  toMinorUnits,
  verifySubscriptionSignature,
  type RazorpayPayment,
  type RazorpaySubscription,
} from "./razorpay";

/* ---------- Payment providers ----------
 *
 * Plans are auto-renewing subscriptions (monthly or yearly), billed through Razorpay
 * Subscriptions. The server prices the plan and opens a Razorpay subscription, the browser
 * runs Razorpay Checkout (card or UPI mandate), and access is granted only after the server
 * has verified the signature and read the subscription back from Razorpay. Renewals, failed
 * charges and cancellations arrive by webhook. Every path is idempotent: a charge is recorded
 * once per Razorpay payment id (payments.provider_ref is unique), and the subscription row is
 * always set from Razorpay's own state.
 *
 * Without Razorpay keys, demo mode keeps an instant mock charge; a real deployment refuses
 * to sell plans rather than hand them out for free.
 */

const PERIOD_DAYS = { month: 30, year: 365 } as const;
/** Renewal charges can land a little after the period ends; don't cut access while one is in flight. */
const RENEWAL_GRACE_MS = 3 * 86_400_000;
/** Razorpay needs a finite cycle count: ten years either way. */
const TOTAL_COUNT = { month: 120, year: 10 } as const;

/* ---------- Plans & limits ---------- */

export async function listPlans() {
  return systemRepo().listPlans();
}

export async function currentPlan(userId: string): Promise<{ plan: Plan; subscription: Awaited<ReturnType<ReturnType<typeof systemRepo>["getSubscription"]>> }> {
  const repo = systemRepo();
  const [sub, plans] = await Promise.all([repo.getSubscription(userId), repo.listPlans({ includeInactive: true })]);
  // Access follows payment. A renewal that is late or being retried keeps the plan for a short
  // grace period; after that, or once a subscription has ended, the user is back on Entry.
  const live = sub && (sub.status === "active" || sub.status === "past_due") && Date.parse(sub.currentPeriodEnd) + RENEWAL_GRACE_MS > Date.now() ? sub : null;
  const plan = plans.find((p) => p.id === (live?.planId ?? "entry")) ?? plans[0]!;
  return { plan, subscription: live };
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
};

export async function assertWithinLimit(userId: string, kind: "tailored" | "review") {
  const { plan } = await currentPlan(userId);
  const repo = systemRepo();
  if (kind === "tailored") {
    const limit = plan.limits.tailoredPerMonth;
    if (limit === null) return;
    const used = await repo.countTailoredSince(userId, monthStart());
    if (used >= limit) throw new AppError("plan_limit", `You've used all ${limit} tailored applications on ${plan.name} this month. Upgrade for more.`);
  } else {
    const limit = plan.limits.humanReviewsPerMonth;
    if (limit === null) return;
    if (limit === 0) throw new AppError("plan_limit", `Human review is included from the Professional plan.`);
    const used = await repo.countReviewsSince(userId, monthStart());
    if (used >= limit) throw new AppError("plan_limit", `You've used all ${limit} human reviews on ${plan.name} this month.`);
  }
}

export async function usage(userId: string) {
  const repo = systemRepo();
  const since = monthStart();
  const [{ plan, subscription }, tailored, reviews] = await Promise.all([currentPlan(userId), repo.countTailoredSince(userId, since), repo.countReviewsSince(userId, since)]);
  return { plan, subscription, tailored, reviews };
}

async function priceFor(planId: PlanId, interval: "month" | "year", promoCode?: string) {
  const plan = (await systemRepo().listPlans()).find((p) => p.id === planId);
  if (!plan) throw new AppError("not_found", "That plan isn't available.");
  const gross = interval === "year" ? plan.priceYearly : plan.priceMonthly;
  // A code is priced before the charge and only redeemed after it succeeds, so a failed
  // payment never burns a redemption.
  const quote = promoCode ? await quoteDiscount(promoCode, planId, gross, plan.currency) : null;
  return { plan, gross, amount: quote?.net ?? gross, quote };
}

const paymentLabel = (plan: Plan, interval: "month" | "year", code?: string | null) => `${plan.name} — ${interval === "year" ? "annual" : "monthly"}${code ? ` with ${code}` : ""}`;

export type CheckoutStart =
  | { kind: "activated"; planName: string }
  | {
      kind: "razorpay";
      keyId: string;
      subscriptionId: string;
      description: string;
      prefill: { name: string; email: string };
    };

/** Step 1: price the plan on the server and open a subscription for it. */
export async function startCheckout(user: User, planId: PlanId, interval: "month" | "year", promoCode?: string): Promise<CheckoutStart> {
  const { plan, gross, amount, quote } = await priceFor(planId, interval, promoCode);
  if (gross <= 0) throw new AppError("validation", "This plan is free, so there's nothing to pay.");
  const current = await systemRepo().getSubscription(user.id);
  if (current?.planId === planId && current.interval === interval && current.status === "active" && !current.cancelAtPeriodEnd) {
    throw new AppError("conflict", `You're already on ${plan.name}.`);
  }

  if (razorpayEnabled()) {
    // Razorpay discounts on subscriptions need dashboard offers; until those exist, codes stay off here.
    if (quote) throw new AppError("validation", "Promo codes can't be used with online subscriptions yet. Please contact us to apply yours.");
    const rzpPlan = await ensurePlan({
      key: `skylark:${plan.id}:${interval}:${plan.currency}:${toMinorUnits(gross)}`,
      name: `Skylark ${plan.name} (${interval === "year" ? "annual" : "monthly"})`,
      amount: gross,
      currency: plan.currency,
      period: interval === "year" ? "yearly" : "monthly",
    });
    const sub = await createSubscription({ planId: rzpPlan, totalCount: TOTAL_COUNT[interval], notes: { userId: user.id, planId, interval } });
    await audit(user, "checkout.started", "subscription", sub.id, { planId, interval, amount: gross, currency: plan.currency });
    return { kind: "razorpay", keyId: serverEnv().RAZORPAY_KEY_ID!, subscriptionId: sub.id, description: paymentLabel(plan, interval), prefill: { name: user.fullName ?? "", email: user.email } };
  }

  if (!isDemoMode()) throw new AppError("internal", "Online payments aren't switched on yet. Please contact us to upgrade.");
  const periodEnd = new Date(Date.now() + PERIOD_DAYS[interval] * 86_400_000).toISOString();
  const subscription = await systemRepo().upsertSubscription({ userId: user.id, planId, status: "active", interval, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: false });
  await recordCharge({ userId: user.id, subscriptionId: subscription.id, amount, currency: plan.currency, provider: "mock", providerRef: `pi_mock_${randomUUID().slice(0, 18)}`, description: paymentLabel(plan, interval, quote?.code) });
  await afterFirstCharge(user, { plan, interval, amount, promoCode: quote?.code, from: current?.planId ?? null, subscriptionId: subscription.id, provider: "mock" });
  return { kind: "activated", planName: plan.name };
}

/** Step 2 (browser): Razorpay Checkout reported success. Trust nothing until it is verified. */
export async function confirmCheckout(user: User, input: { subscriptionId: string; paymentId: string; signature: string }) {
  if (!verifySubscriptionSignature(input)) {
    logger.warn("billing.bad_signature", { userId: user.id, subscriptionId: input.subscriptionId });
    throw new AppError("validation", "We couldn't verify that payment. If you were charged, your plan will switch on automatically within a few minutes.");
  }
  const sub = await fetchSubscription(input.subscriptionId);
  if (notesOf(sub).userId !== user.id) throw new AppError("forbidden", "That payment belongs to another account.");
  const payment = await fetchPayment(input.paymentId);
  const result = await syncRazorpaySubscription(sub, payment.status === "captured" ? payment : null, user);
  return result.active ? { status: "active" as const, planName: result.planName } : { status: "pending" as const };
}

const toStatus = (s: RazorpaySubscription["status"]): Subscription["status"] =>
  s === "active" || s === "authenticated" ? "active" : s === "pending" || s === "halted" || s === "paused" ? "past_due" : "canceled";

/**
 * Brings our subscription row in line with Razorpay's and records a captured charge.
 * Called from the checkout handler and from webhooks, in any order and any number of times.
 */
export async function syncRazorpaySubscription(sub: RazorpaySubscription, payment: RazorpayPayment | null, actor: User | null = null): Promise<{ active: boolean; planName: string | null }> {
  const repo = systemRepo();
  const notes = notesOf(sub);
  const interval = notes.interval === "year" ? "year" : notes.interval === "month" ? "month" : null;
  const plan = (await repo.listPlans({ includeInactive: true })).find((p) => p.id === notes.planId);
  const userId = notes.userId;
  if (!userId || !plan || !interval) {
    logger.error("billing.subscription_unrecognised", { subscriptionId: sub.id });
    return { active: false, planName: null };
  }

  const current = await repo.getSubscription(userId);
  const status = toStatus(sub.status);
  // "authenticated" means the mandate is set up but the first charge hasn't been captured yet.
  const paidUp = sub.status === "active" || (sub.status === "authenticated" && payment?.status === "captured");
  const replacing = current?.providerRef && current.providerRef !== sub.id;

  // A stale subscription (one the user has since replaced) must not overwrite the new one.
  if (replacing && !paidUp) return { active: false, planName: plan.name };

  let subscriptionId = current?.id ?? null;
  if (status !== "active" || paidUp) {
    const periodEnd = sub.current_end ? new Date(sub.current_end * 1000).toISOString() : new Date(Date.now() + PERIOD_DAYS[interval] * 86_400_000).toISOString();
    const row = await repo.upsertSubscription({
      userId,
      planId: plan.id,
      status: paidUp ? "active" : status,
      interval,
      currentPeriodEnd: status === "canceled" && sub.ended_at ? new Date(sub.ended_at * 1000).toISOString() : periodEnd,
      cancelAtPeriodEnd: status === "canceled" ? true : (current?.providerRef === sub.id && current.cancelAtPeriodEnd) || false,
      providerRef: sub.id,
    });
    subscriptionId = row.id;
  }

  // Switching plans: the new subscription is paid for, so stop billing the old one now.
  if (replacing && paidUp && current?.providerRef?.startsWith("sub_")) {
    await cancelRazorpaySubscription(current.providerRef, false).catch((err) => logger.error("billing.old_subscription_cancel_failed", { userId, providerRef: current.providerRef, error: err }));
  }

  if (payment?.status === "captured") {
    const recorded = await recordCharge({
      userId,
      subscriptionId,
      amount: fromMinorUnits(payment.amount),
      currency: payment.currency.toUpperCase(),
      provider: "razorpay",
      providerRef: payment.id,
      description: paymentLabel(plan, interval),
    });
    if (recorded && sub.paid_count <= 1) {
      await afterFirstCharge(actor, { plan, interval, amount: fromMinorUnits(payment.amount), userId, from: current?.planId ?? null, subscriptionId: subscriptionId ?? sub.id, provider: "razorpay" });
    }
  }
  return { active: paidUp, planName: plan.name };
}

/** One row per charge; a duplicate (browser and webhook both reporting it) is a no-op. */
async function recordCharge(input: { userId: string; subscriptionId: string | null; amount: number; currency: string; provider: string; providerRef: string; description: string }): Promise<boolean> {
  const repo = systemRepo();
  if (await repo.getPaymentByRef(input.providerRef)) return false;
  try {
    await repo.createPayment({ ...input, status: "succeeded" });
    return true;
  } catch (err) {
    if (await repo.getPaymentByRef(input.providerRef)) return false;
    logger.error("billing.payment_record_failed", { userId: input.userId, providerRef: input.providerRef, error: err });
    throw err;
  }
}

async function afterFirstCharge(
  actor: User | null,
  input: { plan: Plan; interval: "month" | "year"; amount: number; promoCode?: string; from: PlanId | null; subscriptionId: string; provider: string; userId?: string },
) {
  const userId = input.userId ?? actor!.id;
  const { plan } = input;
  await audit(actor, "subscription.changed", "subscription", input.subscriptionId, { userId, from: input.from, to: plan.id, interval: input.interval, provider: input.provider, promoCode: input.promoCode ?? null });
  // Attribution and redemption happen only on a successful charge.
  const conversion = await recordConversion(userId, { planId: plan.id, amount: input.amount, currency: plan.currency, promoCode: input.promoCode });
  if (!conversion.converted && conversion.reason === "promo_unavailable") {
    logger.warn("billing.promo_exhausted", { userId, code: input.promoCode });
  }
  await notify(userId, { type: "billing", title: `You're on ${plan.name}`, body: `Payment received. Your plan is now ${plan.name}, renewing ${input.interval === "year" ? "yearly" : "monthly"}. Receipts are in Settings.`, href: "/settings#billing" });
}

export async function cancelSubscription(user: User) {
  const repo = systemRepo();
  const sub = await repo.getSubscription(user.id);
  if (!sub) throw new AppError("not_found", "No active subscription.");
  if (sub.providerRef?.startsWith("sub_")) {
    // Razorpay stops future charges; access runs to the end of the period already paid for.
    await cancelRazorpaySubscription(sub.providerRef, true);
  }
  await repo.upsertSubscription({ ...sub, cancelAtPeriodEnd: true });
  await audit(user, "subscription.cancel_scheduled", "subscription", sub.id);
}

export async function billingOverview(user: User) {
  const [u, paymentsList] = await Promise.all([usage(user.id), (await userRepo()).listPayments(user.id)]);
  return { ...u, payments: paymentsList };
}
