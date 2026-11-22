/**
 * Countries with a stippled map tile in public/art/countries/<iso>.jpg. The home page's
 * country ring only shows these, so a market without art never renders a broken image.
 * Keep in sync with the folder (a unit test checks).
 */
export const COUNTRY_ART = new Set([
  "AE", "AR", "AT", "AU", "BD", "BE", "BG", "BR", "CA", "CH", "CL", "CN", "CO", "CR", "CY", "CZ",
  "DE", "DK", "EE", "EG", "ES", "FI", "FR", "GB", "GR", "HK", "HR", "HU", "ID", "IE", "IL", "IN",
  "IS", "IT", "JP", "KE", "KR", "LT", "LU", "LV", "MA", "MT", "MX", "MY", "NG", "NL", "NO", "NZ",
  "PE", "PH", "PK", "PL", "PT", "QA", "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "TH", "TR",
  "TW", "UA", "US", "UY", "VN", "ZA",
]);

export const hasCountryArt = (code: string) => COUNTRY_ART.has(code.toUpperCase());
