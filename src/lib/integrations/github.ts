import "server-only";
import type { GithubEnrichment, GithubProject } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { getJson, UpstreamError } from "@/lib/infra/http";
import { lookupLocal } from "@/lib/skills/catalog";

/*
 * Public profile data from the official GitHub REST API (https://docs.github.com/rest).
 * Only public endpoints are used; GITHUB_TOKEN (a token with no scopes) raises the rate limit
 * from 60 to 5,000 requests an hour. Nothing is scraped.
 */

interface GhUser {
  login: string;
  name: string | null;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  created_at: string;
  type: string;
}

interface GhRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

function headers() {
  const token = serverEnv().GITHUB_TOKEN;
  return { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", ...(token ? { authorization: `Bearer ${token}` } : {}) };
}

/** Languages and topics that map onto canonical skills ("typescript" → TypeScript, "nextjs" → Next.js). */
export function skillsFromRepos(repos: Pick<GhRepo, "language" | "topics" | "fork">[]) {
  const counts = new Map<string, number>();
  for (const r of repos) {
    if (r.fork) continue;
    const terms = new Set<string>();
    if (r.language) terms.add(r.language);
    for (const t of r.topics ?? []) terms.add(t);
    for (const t of terms) {
      const skill = lookupLocal(t);
      if (skill) counts.set(skill.name, (counts.get(skill.name) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export async function fetchGithubProfile(username: string): Promise<GithubEnrichment> {
  const now = new Date().toISOString();
  const base: GithubEnrichment = { status: "unavailable", username, profileUrl: `https://github.com/${username}`, name: null, bio: null, publicRepos: 0, followers: 0, accountCreatedAt: null, languages: [], verifiedSkills: [], projects: [], fetchedAt: now };

  let user: GhUser;
  try {
    user = await getJson<GhUser>("github", `https://api.github.com/users/${encodeURIComponent(username)}`, { headers: headers(), timeoutMs: 6_000 });
  } catch (err) {
    if (err instanceof UpstreamError && err.status === 404) return { ...base, status: "not_found", error: "No GitHub account with this username" };
    const limited = err instanceof UpstreamError && (err.status === 403 || err.status === 429);
    return { ...base, error: limited ? "GitHub rate limit reached — will retry later" : "GitHub couldn't be reached" };
  }

  let repos: GhRepo[] = [];
  try {
    repos = await getJson<GhRepo[]>("github", `https://api.github.com/users/${encodeURIComponent(user.login)}/repos?type=owner&sort=pushed&per_page=100`, { headers: headers(), timeoutMs: 8_000 });
  } catch {
    // The account is confirmed; repository detail is a bonus.
  }

  const own = repos.filter((r) => !r.fork);
  const languageCounts = new Map<string, number>();
  for (const r of own) if (r.language) languageCounts.set(r.language, (languageCounts.get(r.language) ?? 0) + 1);
  const projects: GithubProject[] = own
    .filter((r) => !r.archived)
    .sort((a, b) => b.stargazers_count - a.stargazers_count || b.pushed_at.localeCompare(a.pushed_at))
    .slice(0, 6)
    .map((r) => ({ name: r.name, description: (r.description ?? "").slice(0, 200), url: r.html_url, language: r.language, stars: r.stargazers_count, topics: (r.topics ?? []).slice(0, 6), pushedAt: r.pushed_at }));

  return {
    status: "verified",
    username: user.login,
    profileUrl: user.html_url,
    name: user.name,
    bio: user.bio?.slice(0, 300) ?? null,
    publicRepos: user.public_repos,
    followers: user.followers,
    accountCreatedAt: user.created_at,
    languages: [...languageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, n]) => ({ name, repos: n })),
    verifiedSkills: skillsFromRepos(own).map(([name]) => name).slice(0, 20),
    projects,
    fetchedAt: now,
  };
}
