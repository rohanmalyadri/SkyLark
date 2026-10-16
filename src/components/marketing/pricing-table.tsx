"use client";

import Link from "next/link";
import { useCallback, useId, useState } from "react";
import { quotePromoCodeAction } from "@/app/actions/public";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { BILLING_CURRENCY, CURRENCIES, convert, formatCurrency, noRates, type FxRates } from "@/lib/domain/money";
import type { DiscountQuote, Plan, PlanId } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const limit = (n: number | null, unit: string) => (n === null ? "Unlimited" : n === 0 ? "Not included" : `${n} ${unit}`);
/** Allowances are shown in the rows above, so bullets that only restate them are skipped. */
const restatesLimit = (f: string) => /(matches|tailored applications|human-reviewed applications)/i.test(f);

export function PricingTable({
  plans,
  ctaHref = "/signup",
  initialPromoCode = "",
  fx = noRates(),
}: {
  plans: Plan[];
  ctaHref?: string;
  initialPromoCode?: string;
  /** Live ECB rates from the server. Omitted or unavailable means billing currency only. */
  fx?: FxRates;
}) {
  const [yearly, setYearly] = useState(false);
  const maxSavings = Math.max(0, ...plans.map((p) => (p.priceMonthly ? Math.round((1 - p.priceYearly / (p.priceMonthly * 12)) * 100) : 0)));
  const promo = usePromoCode(plans, initialPromoCode, yearly);
  const [display, setDisplay] = useState(BILLING_CURRENCY);

  /**
   * Prices are authored in the plan's currency and charged in it. When a visitor picks
   * another currency we show an approximate figure beside what will actually be billed —
   * and if we hold no rate, we silently stay in the billing currency rather than guess.
   */
  const show = (amount: number, planCurrency: string) => {
    if (display === planCurrency) return { text: formatCurrency(amount, planCurrency), approximate: false };
    const converted = fx.live && planCurrency === fx.base ? convert(amount, display, fx) : null;
    if (converted === null) return { text: formatCurrency(amount, planCurrency), approximate: false };
    return { text: formatCurrency(converted, display, { approximate: true }), approximate: true };
  };

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

      <div className="pricing-controls">
        <PromoBox promo={promo} />
        <CurrencyPicker fx={fx} value={display} onChange={setDisplay} />
      </div>

      <div className="plans">
        {plans.map((plan) => {
          const price = yearly ? plan.priceYearly / 12 : plan.priceMonthly;
          const quote = promo.quotes[plan.id];
          const headline = show(quote ? (yearly ? quote.net / 12 : quote.net) : price, plan.currency);
          const struck = show(price, plan.currency);
          return (
            <article key={plan.id} className={cn("plan --magnet", plan.highlighted && "--highlighted")}>
              <div className="head">
                <h3 className="display --xsmall">{plan.name}</h3>
                {plan.highlighted && <span className="text --xsmall --uppercase --bold" style={{ color: "var(--main)" }}>Recommended</span>}
              </div>
              <p className="text --medium plan-tagline">{plan.tagline}</p>
              <div className="price">
                {quote && (
                  <span className="display --large --serif plan-was" aria-label={`Normally ${struck.text} per month`}>
                    {struck.text}
                  </span>
                )}
                <span className="display --xlarge --serif">{headline.text}</span>
                <span className="per">/ month</span>
              </div>
              <p className="terms text --xsmall">
                {quote
                  ? `${quote.code} applied${quote.firstPeriodOnly ? ` — first ${yearly ? "year" : "month"} only, then ${formatCurrency(price, plan.currency)}/month` : ""}`
                  : yearly
                    ? `${formatCurrency(plan.priceYearly, plan.currency)} billed once a year, renews annually`
                    : "Billed every month, renews monthly until cancelled"}
                {headline.approximate && (
                  <>
                    {" "}
                    <span className="plan-billed">
                      Charged in {plan.currency}: {formatCurrency(quote ? (yearly ? quote.net : quote.net * 12) : yearly ? plan.priceYearly : plan.priceMonthly, plan.currency)}
                      {yearly ? " a year" : " a month"}.
                    </span>
                  </>
                )}
              </p>
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
              <Link
                href={`${ctaHref}${ctaHref.includes("?") ? "&" : "?"}plan=${plan.id}${quote ? `&promo=${encodeURIComponent(quote.code)}` : ""}`}
                className={cn("button", plan.highlighted ? "--primary" : "--outline")}
              >
                Start with {plan.name}
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/*
 * Promo codes are priced on the server against the real plan prices, so a visitor can try a
 * code without us trusting anything the page says about its value — and without redeeming
 * it. Redemption happens only when a payment succeeds.
 */
interface PromoState {
  code: string;
  setCode: (v: string) => void;
  apply: () => void;
  requote: (forYear: boolean) => void;
  clear: () => void;
  pending: boolean;
  error: string | null;
  quotes: Partial<Record<PlanId, DiscountQuote>>;
}

function usePromoCode(plans: Plan[], initial: string, yearly: boolean): PromoState {
  const [code, setCode] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<Partial<Record<PlanId, DiscountQuote>>>({});

  const quote = useCallback(
    async (raw: string, forYear: boolean) => {
      const candidate = raw.trim().toUpperCase();
      if (!candidate) {
        setQuotes({});
        setError(null);
        return;
      }
      setPending(true);
      // Quoted per plan: a code can be restricted to some plans and not others.
      const results = await Promise.all(
        plans.map(async (p) => {
          const res = await quotePromoCodeAction(candidate, p.id, forYear ? "year" : "month");
          return { id: p.id, quote: res.ok && res.data.ok ? res.data.quote : null, error: res.ok && !res.data.ok ? res.data.error : null };
        }),
      );
      const next: Partial<Record<PlanId, DiscountQuote>> = {};
      for (const r of results) if (r.quote) next[r.id] = r.quote;
      setQuotes(next);
      setError(Object.keys(next).length === 0 ? (results.find((r) => r.error)?.error ?? `${candidate} can't be applied.`) : null);
      setPending(false);
    },
    [plans],
  );

  const applied = Object.keys(quotes).length > 0;
  return {
    code,
    setCode,
    apply: () => void quote(code, yearly),
    // Only worth re-quoting a code that is actually in effect.
    requote: (forYear: boolean) => {
      if (applied) void quote(code, forYear);
    },
    clear: () => {
      setCode("");
      setQuotes({});
      setError(null);
    },
    pending,
    error,
    quotes,
  };
}

function PromoBox({ promo }: { promo: PromoState }) {
  const id = useId();
  const active = Object.values(promo.quotes)[0];
  return (
    <div className="promo-box">
      <label htmlFor={id} className="text --xsmall --uppercase promo-box__label">
        Promo code
      </label>
      <div className="promo-box__row">
        <Input
          id={id}
          value={promo.code}
          onChange={(e) => promo.setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              promo.apply();
            }
          }}
          placeholder="If you have one"
          aria-describedby={`${id}-msg`}
          aria-invalid={Boolean(promo.error)}
          className="promo-box__input"
        />
        {active ? (
          <Button size="md" variant="secondary" onClick={promo.clear}>
            Remove
          </Button>
        ) : (
          <Button size="md" variant="secondary" onClick={promo.apply} loading={promo.pending} disabled={promo.code.trim().length < 3}>
            Apply
          </Button>
        )}
      </div>
      <p id={`${id}-msg`} className={cn("text --xsmall promo-box__msg", promo.error && "promo-box__msg--error")} role={promo.error ? "alert" : "status"}>
        {promo.error ?? (active ? active.description || `${active.code} applied.` : "\u00a0")}
      </p>
    </div>
  );
}

/**
 * Lets a visitor read prices in their own currency. Deliberately not auto-detected from the
 * browser locale: silently restating a price in a currency we do not charge in is the kind of
 * helpfulness that turns into a complaint.
 */
function CurrencyPicker({ fx, value, onChange }: { fx: FxRates; value: string; onChange: (code: string) => void }) {
  const id = useId();
  const available = CURRENCIES.filter((c) => c.code === BILLING_CURRENCY || (fx.live && fx.rates[c.code]));

  if (available.length <= 1) {
    return (
      <div className="currency-picker">
        <p className="text --xsmall currency-picker__note" role="status">
          {fx.problem ?? "Prices are shown in US dollars."} Prices are in {BILLING_CURRENCY}.
        </p>
      </div>
    );
  }

  return (
    <div className="currency-picker">
      <label htmlFor={id} className="text --xsmall --uppercase currency-picker__label">
        Show prices in
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="currency-picker__select">
        {available.map((c) => (
          <option key={c.code} value={c.code}>
            {c.code} — {c.name}
          </option>
        ))}
      </Select>
      <p className="text --xsmall currency-picker__note">
        {value === BILLING_CURRENCY
          ? `Billed in ${BILLING_CURRENCY}.`
          : `Indicative only — you are charged in ${BILLING_CURRENCY}. European Central Bank rates${fx.date ? ` of ${fx.date}` : ""}.`}
      </p>
    </div>
  );
}
