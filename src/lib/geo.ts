import "server-only";
import { allCountries } from "country-region-data";

export interface GeoOption {
  code: string;
  name: string;
}

const collator = new Intl.Collator("en", { sensitivity: "base" });

// Built once per server instance; the dataset is static.
const countries: GeoOption[] = allCountries.map(([name, code]) => ({ code, name })).sort((a, b) => collator.compare(a.name, b.name));
const regionsByCountry = new Map<string, GeoOption[]>(
  allCountries.map(([, code, regions]) => [code, regions.map(([name, regionCode]) => ({ code: regionCode ?? name, name })).sort((a, b) => collator.compare(a.name, b.name))]),
);

export const listCountries = () => countries;

/** States, provinces or regions for an ISO 3166-1 alpha-2 country; null for an unknown country. */
export function listRegions(country: string): GeoOption[] | null {
  return regionsByCountry.get(country.toUpperCase()) ?? null;
}

export function isValidRegion(country: string, region: string) {
  return listRegions(country)?.some((r) => r.name === region) ?? false;
}
