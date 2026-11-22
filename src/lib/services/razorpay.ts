import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { razorpayEnabled, serverEnv } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";

/**
 * Minimal Razorpay Subscriptions client. We need a handful of calls (plans, subscriptions,
 * payments, signatures), so this talks to the REST API directly instead of pulling in the SDK.
 * https://razorpay.com/docs/api/payments/subscriptions/
 */

const API = "https://api.razorpay.com/v1";

type Notes = Record<string, string> | [];

export interface RazorpayPlan {
  id: string;
  period: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  item: { name: string; amount: number; currency: string };
  notes: Notes;
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired" | "paused";
  /** Unix seconds; null until the first charge. */
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  paid_count: number;
  notes: Notes;
}

export interface RazorpayPayment {
  id: string;
  amount: number; // smallest currency unit (paise, cents)
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id?: string | null;
  invoice_id?: string | null;
}

function keys() {
  const { RAZORPAY_KEY_ID: id, RAZORPAY_KEY_SECRET: secret } = serverEnv();
  if (!id || !secret || !razorpayEnabled()) throw new AppError("internal", "Payments aren't set up yet. Please try again later.");
  return { id, secret };
}

async function call<T>(path: string, init?: { method: "POST" | "PATCH"; body: unknown }): Promise<T> {
  const { id, secret } = keys();
  const res = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "content-type": "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { description?: string; code?: string } };
  if (!res.ok) {
    logger.error("razorpay.api_error", { path: path.replace(/(sub|pay|plan)_\w+/g, "$1_*"), status: res.status, code: json.error?.code, description: json.error?.description });
    throw new AppError(
      "internal",
      res.status >= 500 || res.status === 429
        ? "The payment provider couldn't be reached. Please try again in a moment."
        : "Payments are temporarily unavailable. Please try again later or contact us.",
    );
  }
  return json;
}

/** Two-decimal currencies only (INR, USD, …), which covers every plan currency we offer. */
export const toMinorUnits = (amount: number) => Math.round(amount * 100);
export const fromMinorUnits = (minor: number) => Math.round(minor) / 100;

export const notesOf = (o: { notes: Notes }): Record<string, string> => (Array.isArray(o.notes) ? {} : o.notes);

const planCache = new Map<string, string>();

/**
 * Razorpay plans are immutable, so each (plan, interval, price, currency) gets its own,
 * tagged with a key in its notes. Found by that key, or created on first use, so a price
 * change in our plans table simply produces a new Razorpay plan for new subscribers.
 */
export async function ensurePlan(input: { key: string; name: string; amount: number; currency: string; period: "monthly" | "yearly" }) {
  const cached = planCache.get(input.key);
  if (cached) return cached;
  for (let skip = 0; skip < 1000; skip += 100) {
    const page = await call<{ items: RazorpayPlan[] }>(`/plans?count=100&skip=${skip}`);
    const hit = page.items.find((p) => notesOf(p).key === input.key);
    if (hit) {
      planCache.set(input.key, hit.id);
      return hit.id;
    }
    if (page.items.length < 100) break;
  }
  const plan = await call<RazorpayPlan>("/plans", {
    method: "POST",
    body: { period: input.period, interval: 1, item: { name: input.name, amount: toMinorUnits(input.amount), currency: input.currency }, notes: { key: input.key } },
  });
  planCache.set(input.key, plan.id);
  return plan.id;
}

export function createSubscription(input: { planId: string; totalCount: number; notes: Record<string, string> }) {
  return call<RazorpaySubscription>("/subscriptions", { method: "POST", body: { plan_id: input.planId, total_count: input.totalCount, quantity: 1, customer_notify: 1, notes: input.notes } });
}

const SUB_ID = /^sub_[A-Za-z0-9]+$/;

export function fetchSubscription(subscriptionId: string) {
  if (!SUB_ID.test(subscriptionId)) throw new AppError("validation", "That subscription reference isn't valid.");
  return call<RazorpaySubscription>(`/subscriptions/${subscriptionId}`);
}

/** At cycle end the subscriber keeps what they paid for; immediately is for replaced plans. */
export function cancelRazorpaySubscription(subscriptionId: string, atCycleEnd: boolean) {
  if (!SUB_ID.test(subscriptionId)) throw new AppError("validation", "That subscription reference isn't valid.");
  return call<RazorpaySubscription>(`/subscriptions/${subscriptionId}/cancel`, { method: "POST", body: { cancel_at_cycle_end: atCycleEnd ? 1 : 0 } });
}

export function fetchPayment(paymentId: string) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new AppError("validation", "That payment reference isn't valid.");
  return call<RazorpayPayment>(`/payments/${paymentId}`);
}

function hmacMatches(payload: string, secret: string, signature: string) {
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Subscription checkout handler: signature = HMAC_SHA256(payment_id + "|" + subscription_id, key_secret). */
export function verifySubscriptionSignature(input: { subscriptionId: string; paymentId: string; signature: string }, secret = keys().secret) {
  return hmacMatches(`${input.paymentId}|${input.subscriptionId}`, secret, input.signature);
}

/** Webhooks: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string, secret = serverEnv().RAZORPAY_WEBHOOK_SECRET) {
  if (!secret) return false;
  return hmacMatches(rawBody, secret, signature);
}
