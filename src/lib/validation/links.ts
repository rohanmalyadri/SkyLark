/**
 * Profile link validation, shared by the browser (inline errors) and the server (authoritative).
 * Only the URL shape is checked here; GitHub accounts are additionally confirmed through the
 * GitHub REST API when the profile is saved.
 */

// GitHub: 1–39 alphanumerics or single hyphens, not starting or ending with a hyphen.
const GITHUB_USER = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
// LinkedIn public profile slugs: 3–100 letters, digits, hyphens (and percent-encoded characters).
const LINKEDIN_SLUG = /^[A-Za-z0-9\-_%]{3,100}$/;
const RESERVED_GITHUB = new Set(["about", "orgs", "settings", "login", "join", "explore", "marketplace", "topics", "features", "pricing", "enterprise", "sponsors", "apps", "search", "notifications", "pulls", "issues", "new"]);

function parseUrl(raw: string): URL | null {
  const v = raw.trim();
  if (!v) return null;
  try {
    return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
  } catch {
    return null;
  }
}

export type LinkCheck = { ok: true; value: string; handle?: string } | { ok: false; error: string };

/** Accepts "octocat", "github.com/octocat" or "https://github.com/octocat/" → https://github.com/octocat. */
export function checkGithub(raw: string): LinkCheck {
  const v = raw.trim();
  if (!v) return { ok: true, value: "" };
  let user = v.replace(/^@/, "");
  if (/[/.]/.test(v)) {
    const url = parseUrl(v);
    if (!url || !/^(www\.)?github\.com$/i.test(url.hostname)) return { ok: false, error: "Use your GitHub profile URL, like https://github.com/username" };
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length !== 1) return { ok: false, error: "Link to your GitHub profile, not a repository or page" };
    user = parts[0]!;
  }
  if (!GITHUB_USER.test(user) || RESERVED_GITHUB.has(user.toLowerCase())) return { ok: false, error: "That isn't a valid GitHub username" };
  return { ok: true, value: `https://github.com/${user}`, handle: user };
}

/** Accepts linkedin.com/in/<slug> profile URLs (any country subdomain) → https://www.linkedin.com/in/<slug>. */
export function checkLinkedin(raw: string): LinkCheck {
  const v = raw.trim();
  if (!v) return { ok: true, value: "" };
  const url = parseUrl(v);
  if (!url || !/^([a-z]{2,3}\.|www\.)?linkedin\.com$/i.test(url.hostname)) return { ok: false, error: "Use your LinkedIn profile URL, like https://www.linkedin.com/in/your-name" };
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "in" || parts.length !== 2) return { ok: false, error: "Link to your personal profile (linkedin.com/in/…), not a company or post" };
  if (!LINKEDIN_SLUG.test(parts[1]!)) return { ok: false, error: "That LinkedIn profile address isn't valid" };
  return { ok: true, value: `https://www.linkedin.com/in/${parts[1]}`, handle: parts[1] };
}

/** Portfolio: any public https site. Rejects localhost, IP addresses and non-web schemes. */
export function checkPortfolio(raw: string): LinkCheck {
  const v = raw.trim();
  if (!v) return { ok: true, value: "" };
  const url = parseUrl(v);
  if (!url || !/^https?:$/.test(url.protocol)) return { ok: false, error: "Enter a website address, like https://yourname.com" };
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":") || !/\.[a-z]{2,}$/.test(host)) {
    return { ok: false, error: "Use a public website address" };
  }
  url.protocol = "https:";
  url.hash = "";
  return { ok: true, value: url.toString().replace(/\/$/, "") };
}
