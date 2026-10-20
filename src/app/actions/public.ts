"use server";

import { z } from "zod";
import { requestIp } from "@/lib/auth/dal";
import { LeadSchema, PromoCodeInputSchema } from "@/lib/domain/schemas";
import { toActionError, type ActionResult } from "@/lib/infra/errors";
import { captureLead } from "@/lib/services/leads";
import { tryQuoteDiscount } from "@/lib/services/partners";
import { publicPlans } from "@/lib/services/public";

/*
 * Actions reachable without signing in. They deliberately do not use the authenticated
 * `run` wrapper: there is no user to authorize or rate-limit against, so each one limits by
 * IP inside its service and returns nothing that could be used to probe for data.
 */

async function runPublic<T>(context: string, fn: () => Promise<T>, message?: string): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn(), message };
  } catch (err) {
    return toActionError(err, context);
  }
}

export async function submitLeadAction(input: unknown) {
  return runPublic(
    "lead.capture",
    async () => {
      const data = LeadSchema.parse(input);
      return captureLead(data, await requestIp());
    },
    "Thanks — we'll be in touch within one working day.",
  );
}

/**
 * Prices a promo code for the pricing page. Read-only: nothing is redeemed here, so a
 * visitor can try a code they were given without consuming it.
 */
export async function quotePromoCodeAction(code: string, planId: string, interval: string) {
  return runPublic("promo.quote", async () => {
    const parsedCode = PromoCodeInputSchema.parse(code);
    const plan = z.enum(["entry", "professional", "executive"]).parse(planId);
    const every = z.enum(["month", "year"]).parse(interval);
    const plans = await publicPlans();
    const chosen = plans.find((p) => p.id === plan);
    if (!chosen) return { ok: false as const, error: "That plan isn't available." };
    const gross = every === "year" ? chosen.priceYearly : chosen.priceMonthly;
    return tryQuoteDiscount(parsedCode, plan, gross, chosen.currency);
  });
}
