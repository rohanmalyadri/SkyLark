import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { BILLING_CURRENCY, CURRENCIES, noRates, type FxRates } from "@/lib/domain/money";
import { getJson, UpstreamError } from "@/lib/infra/http";
import { logger } from "@/lib/infra/logger";

/*
 * Live exchange rates from the European Central Bank's daily reference rates, via
 * Frankfurter (https://frankfurter.dev) — free, documented, no API key, nothing scraped.
 *
 * If the rates can't be fetched we show the plan currency alone. A stale or invented rate
 * attached to a price is worse than no conversion at all, so this fails closed like the job
 * catalog does.
 */

export const FX_TAG = "fx";

interface FrankfurterLatest {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

/**
 * Fetches and validates the rates. Kept free of cache directives so it can be exercised
 * directly in tests; callers in the app should use `exchangeRates`.
 */
export async function fetchExchangeRates(): Promise<FxRates> {
  const targets = CURRENCIES.map((c) => c.code).filter((c) => c !== BILLING_CURRENCY);
  try {
    const data = await getJson<FrankfurterLatest>(
      "frankfurter",
      `https://api.frankfurter.dev/v1/latest?base=${BILLING_CURRENCY}&symbols=${targets.join(",")}`,
      { timeoutMs: 6_000 },
    );

    // Zero, negative and non-numeric rates are upstream nonsense, not prices.
    const rates: Record<string, number> = { [BILLING_CURRENCY]: 1 };
    for (const [code, rate] of Object.entries(data.rates ?? {})) {
      if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) rates[code] = rate;
    }
    if (Object.keys(rates).length === 1) return noRates("Exchange rates came back empty.");

    return { live: true, base: data.base || BILLING_CURRENCY, rates, date: data.date ?? null, problem: null };
  } catch (err) {
    logger.warn("fx.unavailable", { error: err instanceof Error ? err.message : String(err) });
    return noRates(err instanceof UpstreamError ? "Live exchange rates couldn't be reached." : "Exchange rates are unavailable.");
  }
}

/**
 * Today's reference rates against the billing currency. Cached for hours because the ECB
 * publishes once per working day; the failure case is cached too, so a flaky upstream is not
 * re-contacted on every page view.
 */
export async function exchangeRates(): Promise<FxRates> {
  "use cache";
  cacheTag(FX_TAG);
  cacheLife("hours");
  return fetchExchangeRates();
}
