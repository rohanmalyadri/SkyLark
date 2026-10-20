/*
 * Money shared by the server and the browser: the currencies we display, and how a price is
 * converted and formatted. Fetching live rates is a server concern and lives in
 * `@/lib/services/fx`; everything here is pure so the pricing table can use it directly.
 *
 * The rule the types are shaped around: billing always happens in the plan's own currency.
 * A converted figure is a courtesy, never a quote, so `convert` can return null and every
 * formatted conversion is marked approximate.
 */

export const BILLING_CURRENCY = "USD";

export interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  /** Currencies conventionally written without decimal places. */
  zeroDecimal?: boolean;
}

/** The currencies our candidates are actually based in, all covered by ECB reference rates. */
export const CURRENCIES: CurrencyMeta[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", zeroDecimal: true },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "PLN", name: "Polish Złoty", symbol: "zł" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
];

export const currencyMeta = (code: string) => CURRENCIES.find((c) => c.code === code);

export interface FxRates {
  live: boolean;
  base: string;
  /** Multiply a `base` amount by this to get the target currency. `base` itself is 1. */
  rates: Record<string, number>;
  /** The ECB publication date these rates come from, as YYYY-MM-DD. */
  date: string | null;
  /** Set when rates are unavailable, so the UI can say why rather than guess. */
  problem: string | null;
}

/** What the pricing page falls back to: the billing currency alone, never an invented rate. */
export const noRates = (problem: string | null = null): FxRates => ({
  live: false,
  base: BILLING_CURRENCY,
  rates: { [BILLING_CURRENCY]: 1 },
  date: null,
  problem,
});

/** Converts an amount in `fx.base`. Returns null when we hold no rate for `code`. */
export function convert(amount: number, code: string, fx: FxRates): number | null {
  const rate = fx.rates[code];
  if (!rate || !Number.isFinite(rate)) return null;
  return amount * rate;
}

/**
 * Formats money for display. Conversions round to whole units on purpose: "≈ ₹17,431.26"
 * implies a precision a daily reference rate does not have.
 */
export function formatCurrency(amount: number, code: string, opts: { approximate?: boolean } = {}) {
  const meta = currencyMeta(code);
  const whole = Boolean(opts.approximate || meta?.zeroDecimal);
  const value = whole ? Math.round(amount) : amount;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: whole ? 0 : value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
  return opts.approximate ? `≈ ${formatted}` : formatted;
}
