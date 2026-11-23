/**
 * Turns a user-supplied "come back to" path into one that is guaranteed to stay on this site.
 *
 * A prefix check alone is not enough: browsers strip tabs and newlines from URLs and treat a
 * backslash like a slash, so "/\t/evil.com" or "/\\evil.com" pass a `startsWith("/")` test and
 * still land on another site. Resolving against a throwaway origin and comparing the result
 * catches every such variant, and the returned value is the normalized path, not the raw input.
 */
const PROBE_ORIGIN = "https://skylark.invalid";

export function safeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return fallback;
  // Only same-site paths are ever valid; anything with control characters is rejected outright.
  if (!value.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let url: URL;
  try {
    url = new URL(value, PROBE_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PROBE_ORIGIN) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
