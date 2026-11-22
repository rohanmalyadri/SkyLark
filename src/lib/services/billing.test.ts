import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RazorpayPayment, RazorpaySubscription } from "./razorpay";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));

const KEY_SECRET = "test_key_secret_1234567890";
const WEBHOOK_SECRET = "whsec_test_123";
const RZP_ENV = { RAZORPAY_KEY_ID: "rzp_test_abc123", RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET };
const hmac = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("hex");

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
  for (const k of Object.keys(RZP_ENV)) delete process.env[k];
});
afterEach(() => vi.unstubAllGlobals());

async function candidate() {
  const { systemRepo } = await import("@/lib/data");
  return systemRepo().createUser({ email: `b${Math.random()}@example.org`, fullName: "Billing Candidate", role: "candidate", avatarUrl: null, onboardedAt: new Date().toISOString() });
}

const now = () => Math.floor(Date.now() / 1000);
const rzpSub = (userId: string, over: Partial<RazorpaySubscription> = {}): RazorpaySubscription => ({
  id: "sub_TEST1",
  plan_id: "plan_P1",
  status: "active",
  current_start: now(),
  current_end: now() + 30 * 86_400,
  ended_at: null,
  paid_count: 1,
  notes: { userId, planId: "professional", interval: "month" },
  ...over,
});
const rzpPayment = (over: Partial<RazorpayPayment> = {}): RazorpayPayment => ({ id: "pay_X1", amount: 4900, currency: "USD", status: "captured", ...over });

/** Stands in for the Razorpay REST API: records requests and answers reads from the given state. */
function stubRazorpay(state: { sub: () => RazorpaySubscription; payment?: () => RazorpayPayment; plans?: unknown[] }) {
  const calls: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      const method = init?.method ?? "GET";
      calls.push({ url, method, body });
      const path = new URL(url).pathname.replace("/v1", "");
      if (path === "/plans" && method === "GET") return Response.json({ items: state.plans ?? [] });
      if (path === "/plans") return Response.json({ id: "plan_NEW", ...body });
      if (path === "/subscriptions") return Response.json({ ...state.sub(), status: "created", id: "sub_TEST1", notes: body.notes, paid_count: 0 });
      if (path.startsWith("/subscriptions/") && path.endsWith("/cancel")) return Response.json({ ...state.sub(), status: "cancelled" });
      if (path.startsWith("/subscriptions/")) return Response.json(state.sub());
      if (path.startsWith("/payments/")) return Response.json((state.payment ?? rzpPayment)());
      return Response.json({ error: { description: "unexpected" } }, { status: 404 });
    }),
  );
  return calls;
}

describe("Razorpay signatures", () => {
  it("accepts the checkout signature Razorpay computes and rejects anything else", async () => {
    const { verifySubscriptionSignature } = await import("./razorpay");
    const signature = hmac("pay_B|sub_A", KEY_SECRET);
    expect(verifySubscriptionSignature({ subscriptionId: "sub_A", paymentId: "pay_B", signature }, KEY_SECRET)).toBe(true);
    expect(verifySubscriptionSignature({ subscriptionId: "sub_A", paymentId: "pay_C", signature }, KEY_SECRET)).toBe(false);
    expect(verifySubscriptionSignature({ subscriptionId: "sub_A", paymentId: "pay_B", signature: "" }, KEY_SECRET)).toBe(false);
  });

  it("verifies webhooks against the raw body and fails closed without a secret", async () => {
    const { verifyWebhookSignature } = await import("./razorpay");
    const body = '{"event":"order.paid"}';
    expect(verifyWebhookSignature(body, hmac(body, WEBHOOK_SECRET), WEBHOOK_SECRET)).toBe(true);
    expect(verifyWebhookSignature(body + " ", hmac(body, WEBHOOK_SECRET), WEBHOOK_SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, hmac(body, WEBHOOK_SECRET), undefined)).toBe(false);
  });
});

describe("checkout without Razorpay (demo mode)", () => {
  it("activates a monthly subscription straight away", async () => {
    const user = await candidate();
    const { startCheckout, currentPlan } = await import("./billing");
    const res = await startCheckout(user, "professional", "month");
    expect(res).toEqual({ kind: "activated", planName: "Professional" });
    const { plan, subscription } = await currentPlan(user.id);
    expect(plan.id).toBe("professional");
    expect(subscription?.cancelAtPeriodEnd).toBe(false);
  });

  it("drops back to Entry once a subscription lapses past the grace period", async () => {
    const user = await candidate();
    const { systemRepo } = await import("@/lib/data");
    const end = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
    await systemRepo().upsertSubscription({ userId: user.id, planId: "executive", status: "past_due", interval: "month", currentPeriodEnd: end(-1), cancelAtPeriodEnd: false });
    const { currentPlan } = await import("./billing");
    expect((await currentPlan(user.id)).plan.id).toBe("executive"); // renewal being retried
    await systemRepo().upsertSubscription({ userId: user.id, planId: "executive", status: "past_due", interval: "month", currentPeriodEnd: end(-4), cancelAtPeriodEnd: false });
    expect((await currentPlan(user.id)).plan.id).toBe("entry");
  });

  it("refuses to sell plans on a real deployment without keys", async () => {
    vi.doMock("@/lib/env", async (orig) => ({ ...(await orig<typeof import("@/lib/env")>()), isDemoMode: () => false }));
    const user = await candidate();
    const { startCheckout } = await import("./billing");
    await expect(startCheckout(user, "professional", "month")).rejects.toMatchObject({ code: "internal" });
    vi.doUnmock("@/lib/env");
  });
});

describe("checkout with Razorpay", () => {
  it("creates (once) a Razorpay plan at the server-side price and a subscription tagged with the buyer", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    const calls = stubRazorpay({ sub: () => rzpSub(user.id) });
    const { startCheckout } = await import("./billing");
    const res = await startCheckout(user, "professional", "year");
    expect(res).toMatchObject({ kind: "razorpay", keyId: "rzp_test_abc123", subscriptionId: "sub_TEST1" });
    const createPlan = calls.find((c) => c.url.endsWith("/v1/plans") && c.method === "POST")!;
    expect(createPlan.body).toMatchObject({ period: "yearly", interval: 1, item: { currency: "USD" } });
    expect(Number.isInteger((createPlan.body as { item: { amount: number } }).item.amount)).toBe(true);
    const createSub = calls.find((c) => c.url.endsWith("/v1/subscriptions"))!;
    expect(createSub.body).toMatchObject({ plan_id: "plan_NEW", total_count: 10, notes: { userId: user.id, planId: "professional", interval: "year" } });
  });

  it("reuses an existing Razorpay plan with the same key", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    const { systemRepo } = await import("@/lib/data");
    const pro = (await systemRepo().listPlans()).find((p) => p.id === "professional")!;
    const key = `skylark:professional:month:${pro.currency}:${Math.round(pro.priceMonthly * 100)}`;
    const calls = stubRazorpay({ sub: () => rzpSub(user.id), plans: [{ id: "plan_OLD", notes: { key } }] });
    const { startCheckout } = await import("./billing");
    await startCheckout(user, "professional", "month");
    expect(calls.some((c) => c.url.endsWith("/v1/plans") && c.method === "POST")).toBe(false);
    expect(calls.find((c) => c.url.endsWith("/v1/subscriptions"))!.body).toMatchObject({ plan_id: "plan_OLD" });
  });

  it("grants the plan only after a valid signature, and records the charge once", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    stubRazorpay({ sub: () => rzpSub(user.id) });
    const { confirmCheckout, syncRazorpaySubscription, currentPlan } = await import("./billing");
    const { systemRepo } = await import("@/lib/data");

    await expect(confirmCheckout(user, { subscriptionId: "sub_TEST1", paymentId: "pay_X1", signature: "0".repeat(64) })).rejects.toMatchObject({ code: "validation" });
    expect((await currentPlan(user.id)).plan.id).toBe("entry");

    const signature = hmac("pay_X1|sub_TEST1", KEY_SECRET);
    expect(await confirmCheckout(user, { subscriptionId: "sub_TEST1", paymentId: "pay_X1", signature })).toEqual({ status: "active", planName: "Professional" });
    const { plan, subscription } = await currentPlan(user.id);
    expect(plan.id).toBe("professional");
    expect(subscription).toMatchObject({ providerRef: "sub_TEST1", cancelAtPeriodEnd: false, status: "active" });

    // The subscription.charged webhook for the same payment arriving afterwards is a no-op.
    await syncRazorpaySubscription(rzpSub(user.id), rzpPayment());
    const payments = await systemRepo().listPayments(user.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ provider: "razorpay", providerRef: "pay_X1", amount: 49, currency: "USD", status: "succeeded" });
  });

  it("refuses a subscription that belongs to someone else", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    stubRazorpay({ sub: () => rzpSub("someone-else") });
    const { confirmCheckout } = await import("./billing");
    const signature = hmac("pay_X1|sub_TEST1", KEY_SECRET);
    await expect(confirmCheckout(user, { subscriptionId: "sub_TEST1", paymentId: "pay_X1", signature })).rejects.toMatchObject({ code: "forbidden" });
  });

  it("extends on renewal, and cancelling stops renewals at the period end", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    let sub = rzpSub(user.id);
    const calls = stubRazorpay({ sub: () => sub });
    const { syncRazorpaySubscription, cancelSubscription, currentPlan } = await import("./billing");
    const { systemRepo } = await import("@/lib/data");
    await syncRazorpaySubscription(sub, rzpPayment());

    sub = rzpSub(user.id, { current_end: now() + 60 * 86_400, paid_count: 2 });
    await syncRazorpaySubscription(sub, rzpPayment({ id: "pay_X2" }));
    expect(await systemRepo().listPayments(user.id)).toHaveLength(2);
    expect(Date.parse((await currentPlan(user.id)).subscription!.currentPeriodEnd)).toBe(sub.current_end! * 1000);

    await cancelSubscription(user);
    expect(calls.find((c) => c.url.endsWith("/sub_TEST1/cancel"))!.body).toEqual({ cancel_at_cycle_end: 1 });
    expect((await currentPlan(user.id)).subscription!.cancelAtPeriodEnd).toBe(true);

    // At the period end Razorpay reports it cancelled, and the user is back on Entry.
    sub = rzpSub(user.id, { status: "cancelled", ended_at: now() });
    await syncRazorpaySubscription(sub, null);
    expect((await currentPlan(user.id)).plan.id).toBe("entry");
  });

  it("switching plans stops the old subscription, and late events for it are ignored", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    const calls = stubRazorpay({ sub: () => rzpSub(user.id) });
    const { syncRazorpaySubscription, currentPlan } = await import("./billing");
    await syncRazorpaySubscription(rzpSub(user.id), rzpPayment());

    const exec = rzpSub(user.id, { id: "sub_EXEC", notes: { userId: user.id, planId: "executive", interval: "month" } });
    await syncRazorpaySubscription(exec, rzpPayment({ id: "pay_E1", amount: 14900 }));
    expect(calls.find((c) => c.url.endsWith("/sub_TEST1/cancel"))!.body).toEqual({ cancel_at_cycle_end: 0 });
    expect((await currentPlan(user.id)).plan.id).toBe("executive");

    await syncRazorpaySubscription(rzpSub(user.id, { status: "cancelled", ended_at: now() }), null);
    expect((await currentPlan(user.id)).plan.id).toBe("executive");
  });
});

describe("Razorpay webhook", () => {
  it("rejects unsigned calls and records signed subscription.charged events once", async () => {
    Object.assign(process.env, RZP_ENV);
    const user = await candidate();
    stubRazorpay({ sub: () => rzpSub(user.id) });
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const body = JSON.stringify({ event: "subscription.charged", payload: { subscription: { entity: { id: "sub_TEST1" } }, payment: { entity: rzpPayment() } } });
    const req = (sig: string) => new Request("https://x/api/webhooks/razorpay", { method: "POST", body, headers: { "x-razorpay-signature": sig } });

    expect((await POST(req("bad") as never)).status).toBe(401);
    expect(await (await POST(req(hmac(body, WEBHOOK_SECRET)) as never)).json()).toEqual({ ok: true, active: true });
    expect(await (await POST(req(hmac(body, WEBHOOK_SECRET)) as never)).json()).toEqual({ ok: true, active: true });
    const { systemRepo } = await import("@/lib/data");
    expect(await systemRepo().listPayments(user.id)).toHaveLength(1);
    const { currentPlan } = await import("./billing");
    expect((await currentPlan(user.id)).plan.id).toBe("professional");
  });
});
