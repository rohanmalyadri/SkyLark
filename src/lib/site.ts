/** The public address of Skylark. Every absolute link the app builds points here in production. */
export const SITE_URL = "https://www.skylarkgo.in";
export const SITE_HOST = "www.skylarkgo.in";

/** Old production hostnames that now redirect to SITE_URL (preview deployments are left alone). */
export const LEGACY_HOSTS = new Set(["skylark-ten-mu.vercel.app", "skylarkgo.in"]);

/**
 * Base URL for absolute links (auth redirects, share links, metadata). In production the
 * configured NEXT_PUBLIC_APP_URL is used unless it still points at a legacy host.
 */
export function siteUrl(configured: string | undefined, production: boolean): string {
  const fallback = production ? SITE_URL : "http://localhost:3000";
  if (!configured) return fallback;
  try {
    const url = new URL(configured);
    if (LEGACY_HOSTS.has(url.hostname)) return SITE_URL;
    return url.origin;
  } catch {
    return fallback;
  }
}
