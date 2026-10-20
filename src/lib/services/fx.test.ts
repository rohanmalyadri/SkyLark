import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BILLING_CURRENCY, convert, CURRENCIES, currencyMeta, formatCurrency, noRates, type FxRates } from "@/lib/domain/money";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }));

const live: FxRates = { live: true, base: "USD", rates: { USD: 1, EUR: 0.9, INR: 95, JPY: 158 }, date: "2026-10-16", problem: null };

describe("converting a price", () => {
  it("multiplies by the rate and leaves the base currency alone", () => {
    expect(convert(49, "USD", live)).toBe(49);
    expect(convert(49, "EUR", live)).toBeCloseTo(44.1, 5);
  });

  it("returns null rather than a guess when we hold no rate", () => {
    expect(convert(49, "NZD", live)).toBeNull();
    expect(convert(49, "EUR", noRates())).toBeNull();
    // A nonsense rate is treated as no rate at all.
    expect(convert(49, "XXX", { ...live, rates: { ...live.rates, XXX: Number.NaN } })).toBeNull();
  });
});

describe("formatting money", () => {
  it("marks a conversion approximate and rounds to whole units", () => {
    // A daily reference rate does not justify showing cents.
    expect(formatCurrency(4651.23, "INR", { approximate: true })).toBe("≈ ₹4,651");
    expect(formatCurrency(44.1, "EUR", { approximate: true })).toBe("≈ €44");
  });

  it("shows exact prices in the billing currency without an approximation marker", () => {
    expect(formatCurrency(49, "USD")).toBe("$49");
    expect(formatCurrency(19.5, "USD")).toBe("$19.50");
  });

  it("never shows decimals for a zero-decimal currency", () => {
    expect(formatCurrency(7742.4, "JPY")).toBe("¥7,742");
  });
});

describe("the currency list", () => {
  it("includes the billing currency and no duplicates", () => {
    const codes = CURRENCIES.map((c) => c.code);
    expect(codes).toContain(BILLING_CURRENCY);
    expect(new Set(codes).size).toBe(codes.length);
    expect(currencyMeta("JPY")?.zeroDecimal).toBe(true);
    expect(currencyMeta("NOPE")).toBeUndefined();
  });
});

describe("fetching live rates", () => {
  it("reads the ECB reference rates and reports the publication date", async () => {
    fetchMock.mockReturnValueOnce(json({ amount: 1, base: "USD", date: "2026-10-16", rates: { EUR: 0.88865, GBP: 0.74989, INR: 94.96 } }));
    const { fetchExchangeRates } = await import("./fx");
    const fx = await fetchExchangeRates();

    expect(fx.live).toBe(true);
    expect(fx.date).toBe("2026-10-16");
    expect(fx.problem).toBeNull();
    // The base currency is always present at parity so the UI never special-cases it.
    expect(fx.rates[BILLING_CURRENCY]).toBe(1);
    expect(fx.rates.INR).toBe(94.96);
  });

  it("drops zero, negative and non-numeric rates instead of pricing against them", async () => {
    fetchMock.mockReturnValueOnce(json({ amount: 1, base: "USD", date: "2026-10-16", rates: { EUR: 0.9, GBP: 0, INR: -5, JPY: "158" } }));
    const { fetchExchangeRates } = await import("./fx");
    const fx = await fetchExchangeRates();

    expect(fx.rates.EUR).toBe(0.9);
    expect(fx.rates.GBP).toBeUndefined();
    expect(fx.rates.INR).toBeUndefined();
    expect(fx.rates.JPY).toBeUndefined();
  });

  it("falls back to the billing currency alone when the upstream fails", async () => {
    fetchMock.mockReturnValueOnce(json({ message: "nope" }, 503));
    const { fetchExchangeRates } = await import("./fx");
    const fx = await fetchExchangeRates();

    expect(fx.live).toBe(false);
    expect(fx.problem).toMatch(/couldn't be reached|unavailable/i);
    // Crucially: no invented rates, so the pricing page simply stays in USD.
    expect(Object.keys(fx.rates)).toEqual([BILLING_CURRENCY]);
  });

  it("treats an empty rate table as unavailable", async () => {
    fetchMock.mockReturnValueOnce(json({ amount: 1, base: "USD", date: "2026-10-16", rates: {} }));
    const { fetchExchangeRates } = await import("./fx");
    const fx = await fetchExchangeRates();
    expect(fx.live).toBe(false);
    expect(fx.problem).toMatch(/empty/i);
  });

  it("survives a network error without throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("socket hang up"));
    const { fetchExchangeRates } = await import("./fx");
    await expect(fetchExchangeRates()).resolves.toMatchObject({ live: false });
  });
});
