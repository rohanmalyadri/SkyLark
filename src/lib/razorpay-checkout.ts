"use client";

/** Browser side of Razorpay Checkout: loads checkout.js once and opens the payment sheet. */

const SRC = "https://checkout.razorpay.com/v1/checkout.js";

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open(): void;
}
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let loading: Promise<RazorpayCtor> | null = null;

function loadCheckout(): Promise<RazorpayCtor> {
  const existing = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
  if (existing) return Promise.resolve(existing);
  loading ??= new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => {
      const ctor = (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay;
      if (ctor) resolve(ctor);
      else reject(new Error("Razorpay failed to load"));
    };
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("Razorpay failed to load"));
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type CheckoutOutcome = { kind: "paid"; result: RazorpaySuccess } | { kind: "dismissed" };

/** Resolves once the person pays or closes the sheet. */
export async function openRazorpayCheckout(order: {
  keyId: string;
  subscriptionId: string;
  description: string;
  prefill: { name: string; email: string };
}): Promise<CheckoutOutcome> {
  const Razorpay = await loadCheckout();
  return new Promise<CheckoutOutcome>((resolve) => {
    let settled = false;
    const done = (o: CheckoutOutcome) => {
      if (settled) return;
      settled = true;
      resolve(o);
    };
    const rzp = new Razorpay({
      key: order.keyId,
      subscription_id: order.subscriptionId,
      name: "Skylark",
      description: order.description,
      prefill: order.prefill,
      theme: { color: "#2b2b2b" },
      handler: (result: RazorpaySuccess) => done({ kind: "paid", result }),
      modal: { ondismiss: () => done({ kind: "dismissed" }), confirm_close: true },
    });
    // After a failed attempt Razorpay keeps the sheet open so the person can retry.
    rzp.open();
  });
}
