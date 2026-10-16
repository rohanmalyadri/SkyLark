import "server-only";
import { City, Country, State } from "country-state-city";

/*
 * Location reference data from the `country-state-city` dataset (ISO 3166 countries and
 * subdivisions, cities from GeoNames). Everything a candidate picks is validated against it.
 */

export interface GeoOption {
  code: string;
  name: string;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });
const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

// Built once per server instance; the dataset is static.
const countries: GeoOption[] = Country.getAllCountries()
  .map((c) => ({ code: c.isoCode, name: c.name }))
  .sort((a, b) => collator.compare(a.name, b.name));
const countryCodes = new Set(countries.map((c) => c.code));

export const listCountries = () => countries;
export const isValidCountry = (code: string) => countryCodes.has(code.toUpperCase());

const regionCache = new Map<string, GeoOption[]>();

/** States, provinces or regions for an ISO 3166-1 alpha-2 country; null for an unknown country. */
export function listRegions(country: string): GeoOption[] | null {
  const cc = country.toUpperCase();
  if (!countryCodes.has(cc)) return null;
  let regions = regionCache.get(cc);
  if (!regions) {
    regions = State.getStatesOfCountry(cc)
      .map((s) => ({ code: s.isoCode, name: s.name }))
      .sort((a, b) => collator.compare(a.name, b.name));
    regionCache.set(cc, regions);
  }
  return regions;
}

export function findRegion(country: string, region: string) {
  const r = fold(region);
  return listRegions(country)?.find((x) => fold(x.name) === r || x.code.toLowerCase() === r) ?? null;
}

export const isValidRegion = (country: string, region: string) => !!findRegion(country, region);

/**
 * Cities for a country, narrowed to a region when one is given. Names are de-duplicated:
 * GeoNames lists some places once per administrative level.
 */
export function listCities(country: string, region?: string): string[] | null {
  const cc = country.toUpperCase();
  if (!countryCodes.has(cc)) return null;
  const regionCode = region ? findRegion(cc, region)?.code : undefined;
  if (region && !regionCode) return null;
  const rows = regionCode ? City.getCitiesOfState(cc, regionCode) : (City.getCitiesOfCountry(cc) ?? []);
  return [...new Set(rows.map((c) => c.name))].sort(collator.compare);
}

/** Case- and accent-insensitive match; returns the dataset's spelling. */
export function findCity(country: string, region: string, city: string) {
  const c = fold(city);
  return listCities(country, region || undefined)?.find((x) => fold(x) === c) ?? null;
}

/* ---------- Free-text location resolution (job listings) ---------- */

let cityIndex: Map<string, { city: string; country: string }[]> | null = null;

function index() {
  if (cityIndex) return cityIndex;
  cityIndex = new Map();
  for (const c of City.getAllCities()) {
    const k = fold(c.name);
    const list = cityIndex.get(k) ?? [];
    if (!list.some((x) => x.country === c.countryCode)) list.push({ city: c.name, country: c.countryCode });
    cityIndex.set(k, list);
  }
  return cityIndex;
}

const countryByName = new Map(countries.map((c) => [fold(c.name), c.code]));
const COUNTRY_ALIASES: Record<string, string> = {
  usa: "US", "u.s.": "US", "u.s.a.": "US", us: "US", "united states of america": "US", america: "US",
  uk: "GB", "u.k.": "GB", england: "GB", scotland: "GB", wales: "GB", "great britain": "GB", britain: "GB",
  deutschland: "DE", "the netherlands": "NL", holland: "NL", "nederland": "NL", schweiz: "CH", suisse: "CH",
  osterreich: "AT", "österreich": "AT", espana: "ES", "españa": "ES", italia: "IT", polska: "PL",
  uae: "AE", "czech republic": "CZ", czechia: "CZ", "south korea": "KR", korea: "KR", russia: "RU", vietnam: "VN",
};

/** Country code for a free-text country name ("Germany", "Deutschland", "UK", "DE"). */
export function resolveCountry(text: string): string | null {
  const t = fold(text).replace(/[()]/g, "").trim();
  if (!t) return null;
  if (/^[a-z]{2}$/.test(t) && countryCodes.has(t.toUpperCase())) return t.toUpperCase();
  return COUNTRY_ALIASES[t] ?? countryByName.get(t) ?? null;
}

/**
 * Resolves a city name to a country. When several countries have a city of that name, the
 * caller's hint (e.g. the job board's home market) wins; otherwise ambiguous names resolve to null.
 */
export function resolveCity(name: string, hintCountry?: string): { city: string; country: string } | null {
  const hits = index().get(fold(name));
  if (!hits?.length) return null;
  if (hintCountry) {
    const hinted = hits.find((h) => h.country === hintCountry);
    if (hinted) return hinted;
  }
  return hits.length === 1 ? hits[0]! : null;
}
