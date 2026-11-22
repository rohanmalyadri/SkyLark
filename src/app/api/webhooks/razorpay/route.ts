import type { NextRequest } from "next/server";
import { logger } from "@/lib/infra/logger";
import { syncRazorpaySubscription } from "@/lib/services/billing";
import { fetchSubscription, verifyWebhookSignature, type RazorpayPayment } from "@/lib/services/razorpay";

/**
 * Razorpay webhook (Dashboard → Account & Settings → Webhooks). Subscribe it to the
 * subscription.* events below. It records renewals, marks failed charges, ends cancelled
 * plans, and covers first payments whose browser tab closed before the success handler ran.
 * The body is only trusted after its HMAC checks out, and the subscription's state is read
 * back from Razorpay rather than taken from the event. Sync is idempotent, so retries are fine.
 */
const EVENTS = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.updated",
]);

type WebhookEvent = {
  event?: string;
  payload?: { subscription?: { entity?: { id?: string } }; payment?: { entity?: RazorpayPayment } };
};

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature") ?? "")) {
    logger.warn("razorpay.webhook_rejected", { eventId: req.headers.get("x-razorpay-event-id") });
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(raw);
  } catch {
    return Response.json({ error: "bad payload" }, { status: 400 });
  }

  const subscriptionId = event.payload?.subscription?.entity?.id;
  if (!subscriptionId || !EVENTS.has(event.event ?? "")) return Response.json({ ok: true, ignored: event.event ?? null });

  try {
    const sub = await fetchSubscription(subscriptionId);
    // The payment entity is part of the signed body, so it can be used as sent.
    const payment = event.event === "subscription.charged" ? (event.payload?.payment?.entity ?? null) : null;
    const result = await syncRazorpaySubscription(sub, payment);
    logger.info("razorpay.webhook", { event: event.event, subscriptionId, status: sub.status, active: result.active });
    return Response.json({ ok: true, active: result.active });
  } catch (err) {
    // A non-2xx makes Razorpay retry later, which is what we want for transient failures.
    logger.error("razorpay.webhook_failed", { subscriptionId, error: err });
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
