"use client";

import Link from "next/link";
import { useState } from "react";
import type { Plan } from "@/lib/domain/types";
import { cn, formatMoney } from "@/lib/utils";

const limit = (n: number | null, unit: string) => (n === null ? "Unlimited" : n === 0 ? "Not included" : `${n} ${unit}`);
/** Allowances are shown in the rows above, so bullets that only restate them are skipped. */
const restatesLimit = (f: string) => /(matches|tailored applications|human-reviewed applications)/i.test(f);

export function PricingTable({ plans, ctaHref = "/signup" }: { plans: Plan[]; ctaHref?: string }) {
  const [yearly, setYearly] = useState(false);
  const maxSavings = Math.max(0, ...plans.map((p) => (p.priceMonthly ? Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100) : 0)));

  return (
    <div>
      <div role="radiogroup" aria-label="Billing interval" className="billing">
        {(["month", "year"] as const).map((k) => {
          const active = (k === "year") === yearly;
          return (
            <button key={k} role="radio" aria-checked={active} onClick={() => setYearly(k === "year")}>
              {k === "month" ? "Billed monthly" : "Billed annually"}
              {k === "year" && maxSavings > 0 && <span className="save">−{maxSavings}%</span>}
              <span className="u" aria-hidden />
            </button>
          );
        })}
      </div>

      <div className="plans">
        {plans.map((plan) => {
          const price = yearly ? plan.priceYearly / 12 : plan.priceMonthly;
          return (
            <article key={plan.id} className={cn("plan --magnet", plan.highlighted && "--highlighted")}>
              <div className="head">
                <h3 className="display --xsmall">{plan.name}</h3>
                {plan.highlighted && <span className="text --xsmall --uppercase --bold" style={{ color: "var(--main)" }}>Recommended</span>}
              </div>
              <p className="text --medium plan-tagline">{plan.tagline}</p>
              <div className="price">
                <span className="display --xlarge --serif">{formatMoney(price, plan.currency)}</span>
                <span className="per">/ month</span>
              </div>
              <p className="terms text --xsmall">{yearly ? `${formatMoney(plan.priceYearly, plan.currency)} billed once a year, renews annually` : "Billed every month, renews monthly until cancelled"}</p>
              <dl>
                {[
                  ["Ranked matches", limit(plan.limits.matchesPerWeek, "per week")],
                  ["Tailored applications", limit(plan.limits.tailoredPerMonth, "per month")],
                  ["Specialist-submitted", limit(plan.limits.humanReviewsPerMonth, "per month")],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text --xsmall --uppercase plan-key">{k}</dt>
                    <dd className={cn("text --small", v === "Not included" && "plan-none")}>{v}</dd>
                  </div>
                ))}
              </dl>
              <ul className="text --medium">
                {plan.features.filter((f) => !restatesLimit(f)).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <Link href={`${ctaHref}${ctaHref.includes("?") ? "&" : "?"}plan=${plan.id}`} className={cn("button", plan.highlighted ? "--primary" : "--outline")}>
                Start with {plan.name}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}
