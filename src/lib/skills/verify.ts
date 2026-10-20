import "server-only";
import { serverEnv } from "@/lib/env";
import { getJson, TtlCache, UpstreamError } from "@/lib/infra/http";
import { logger } from "@/lib/infra/logger";
import { looksLikeGibberish } from "@/lib/validation/text";
import { dedupe, lookupLocal, prettifyTag, searchLocal, skillKey, spellingSuggestions, toTag, type SkillTerm } from "./catalog";

/*
 * Live skill vocabularies, used when a skill isn't in the curated taxonomy:
 *   - Stack Overflow tags (Stack Exchange API, keyless 300 req/day/IP; STACKEXCHANGE_KEY raises it to 10k)
 *   - ESCO, the European Commission's skills classification (keyless)
 *   - Lightcast Open Skills (optional; LIGHTCAST_CLIENT_ID / LIGHTCAST_CLIENT_SECRET)
 * Results are cached for a day. Nothing is accepted unless one of these recognises it.
 */

const searchCache = new TtlCache<SkillTerm[]>(24 * 3600_000);
const verifyCache = new TtlCache<SkillTerm | null>(24 * 3600_000);

/** A Stack Overflow tag must be in real use before we treat it as a skill. */
const MIN_TAG_QUESTIONS = 200;

interface SeTags {
  items: { name: string; count: number }[];
  quota_remaining?: number;
}

function seUrl(path: string, params: Record<string, string>) {
  const key = serverEnv().STACKEXCHANGE_KEY;
  const q = new URLSearchParams({ site: "stackoverflow", ...params, ...(key ? { key } : {}) });
  return `https://api.stackexchange.com/2.3${path}?${q}`;
}

async function searchStackOverflow(query: string): Promise<SkillTerm[]> {
  const data = await getJson<SeTags>("stackexchange", seUrl("/tags", { inname: toTag(query), sort: "popular", order: "desc", pagesize: "8" }), { timeoutMs: 4_000 });
  return data.items.filter((t) => t.count >= MIN_TAG_QUESTIONS).map((t) => ({ name: lookupLocal(t.name)?.name ?? prettifyTag(t.name), source: "stackoverflow" as const, ref: t.name }));
}

async function exactStackOverflow(input: string): Promise<SkillTerm | null> {
  const tag = toTag(input);
  if (!/^[a-z0-9#+.\-]{1,35}$/.test(tag)) return null;
  const data = await getJson<SeTags>("stackexchange", seUrl(`/tags/${encodeURIComponent(tag)}/info`, {}), { timeoutMs: 4_000 });
  const hit = data.items.find((t) => t.name === tag && t.count >= MIN_TAG_QUESTIONS);
  return hit ? { name: prettifyTag(hit.name), source: "stackoverflow", ref: hit.name } : null;
}

interface EscoSuggest {
  _embedded?: { results?: { title: string; uri: string }[] };
}

async function searchEsco(query: string, type: "skill" | "occupation" = "skill"): Promise<SkillTerm[]> {
  const q = new URLSearchParams({ text: query, type, language: "en", limit: "8", full: "false" });
  const data = await getJson<EscoSuggest>("esco", `https://ec.europa.eu/esco/api/suggest2?${q}`, { timeoutMs: 5_000 });
  return (data._embedded?.results ?? [])
    .filter((r) => r.title.length <= 60)
    .map((r) => ({ name: r.title.charAt(0).toUpperCase() + r.title.slice(1), source: "esco" as const, ref: r.uri }));
}

/* ---------- Lightcast Open Skills (optional) ---------- */

let lightcastToken: { value: string; exp: number } | null = null;

async function lightcastAuth() {
  const env = serverEnv();
  if (!env.LIGHTCAST_CLIENT_ID || !env.LIGHTCAST_CLIENT_SECRET) return null;
  if (lightcastToken && lightcastToken.exp > Date.now() + 60_000) return lightcastToken.value;
  const res = await fetch("https://auth.emsicloud.com/connect/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.LIGHTCAST_CLIENT_ID, client_secret: env.LIGHTCAST_CLIENT_SECRET, grant_type: "client_credentials", scope: "emsi_open" }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => null);
  if (!res?.ok) throw new UpstreamError("lightcast", `auth failed${res ? ` (HTTP ${res.status})` : ""}`, res?.status ?? null);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  lightcastToken = { value: body.access_token, exp: Date.now() + body.expires_in * 1000 };
  return lightcastToken.value;
}

async function searchLightcast(query: string): Promise<SkillTerm[]> {
  const token = await lightcastAuth();
  if (!token) return [];
  const q = new URLSearchParams({ q: query, limit: "8", fields: "id,name" });
  const data = await getJson<{ data: { id: string; name: string }[] }>("lightcast", `https://emsiservices.com/skills/versions/latest/skills?${q}`, { headers: { authorization: `Bearer ${token}` }, timeoutMs: 5_000 });
  return data.data.map((s) => ({ name: s.name, source: "lightcast" as const, ref: s.id }));
}

export const lightcastEnabled = () => !!serverEnv().LIGHTCAST_CLIENT_ID && !!serverEnv().LIGHTCAST_CLIENT_SECRET;

/* ---------- Public API ---------- */

export interface SuggestResult {
  terms: SkillTerm[];
  /** Close spellings when nothing matches what was typed. */
  didYouMean?: SkillTerm[];
  /** Live providers that failed for this query; the UI says suggestions may be incomplete. */
  degraded: string[];
}

/** Autocomplete: curated taxonomy first, then live vocabularies for anything it doesn't cover. */
export async function suggestSkills(query: string, limit = 10): Promise<SuggestResult> {
  const q = query.trim().slice(0, 60);
  if (q.length < 1) return { terms: [], degraded: [] };
  const approved = await import("@/lib/services/skills").then((m) => m.approvedSkillNames()).catch(() => new Map<string, string>());
  const qk = skillKey(q);
  const local = dedupe([...searchLocal(q, limit), ...[...approved].filter(([k]) => k.startsWith(qk)).map(([, name]) => ({ name, source: "skylark" as const, ref: null }))]).slice(0, limit);
  const spelling = () => (local.length === 0 ? spellingSuggestions(q) : []);
  if (local.length >= limit || q.length < 2 || looksLikeGibberish(q)) return { terms: local, didYouMean: spelling(), degraded: [] };

  const cacheKey = skillKey(q);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    const terms = dedupe([...local, ...cached]).slice(0, limit);
    return { terms, didYouMean: terms.length ? [] : spelling(), degraded: [] };
  }

  const providers: [string, Promise<SkillTerm[]>][] = [
    ["stackexchange", searchStackOverflow(q)],
    ["esco", searchEsco(q)],
    ...(lightcastEnabled() ? ([["lightcast", searchLightcast(q)]] as [string, Promise<SkillTerm[]>][]) : []),
  ];
  const settled = await Promise.allSettled(providers.map(([, p]) => p));
  const degraded: string[] = [];
  const live: SkillTerm[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") live.push(...r.value);
    else {
      degraded.push(providers[i]![0]);
      logger.warn("skills.suggest.provider_failed", { provider: providers[i]![0], error: r.reason });
    }
  });
  if (degraded.length === 0) searchCache.set(cacheKey, live);
  const terms = dedupe([...local, ...live]).slice(0, limit);
  return { terms, didYouMean: terms.length ? [] : spelling(), degraded };
}

function unrecognised(name: string) {
  const close = spellingSuggestions(name, 1)[0];
  return close ? `“${name}” isn't a recognised skill — did you mean ${close.name}?` : `“${name}” isn't a recognised skill — pick a suggestion or request a review`;
}

export type SkillVerdict =
  | { ok: true; term: SkillTerm }
  | { ok: false; reason: "unrecognised" | "implausible" | "unavailable"; message: string };

/**
 * Confirms a skill exists in a recognised vocabulary and returns its canonical name.
 * Fails closed: if every live vocabulary is unreachable, the skill is reported as unverifiable
 * rather than silently accepted.
 */
export async function verifySkill(input: string): Promise<SkillVerdict> {
  const name = input.trim();
  if (!name) return { ok: false, reason: "unrecognised", message: "Enter a skill" };
  const local = lookupLocal(name);
  if (local) return { ok: true, term: local };
  // Skills staff approved from candidate requests extend the vocabulary.
  const approved = (await import("@/lib/services/skills").then((m) => m.approvedSkillNames()).catch(() => new Map<string, string>())).get(skillKey(name));
  if (approved) return { ok: true, term: { name: approved, source: "skylark", ref: null } };
  if (looksLikeGibberish(name) || !/\p{L}/u.test(name)) return { ok: false, reason: "implausible", message: `“${name}” isn't a recognised skill` };

  const key = skillKey(name);
  const cached = verifyCache.get(key);
  if (cached !== undefined) return cached ? { ok: true, term: cached } : { ok: false, reason: "unrecognised", message: unrecognised(name) };

  const checks: [string, () => Promise<SkillTerm | null>][] = [
    ["stackexchange", () => exactStackOverflow(name)],
    ["esco", async () => (await searchEsco(name)).find((t) => skillKey(t.name) === key) ?? null],
    ...(lightcastEnabled() ? ([["lightcast", async () => (await searchLightcast(name)).find((t) => skillKey(t.name) === key) ?? null]] as [string, () => Promise<SkillTerm | null>][]) : []),
  ];
  let failures = 0;
  for (const [provider, check] of checks) {
    try {
      const hit = await check();
      if (hit) {
        verifyCache.set(key, hit);
        return { ok: true, term: hit };
      }
    } catch (err) {
      failures++;
      logger.warn("skills.verify.provider_failed", { provider, error: err });
    }
  }
  if (failures === checks.length) {
    return { ok: false, reason: "unavailable", message: `We couldn't verify “${name}” right now — pick a suggestion from the list or try again shortly` };
  }
  verifyCache.set(key, null);
  return { ok: false, reason: "unrecognised", message: unrecognised(name) };
}

/** Verifies many skills with bounded parallelism. */
export async function verifySkills(names: string[]) {
  const out: SkillVerdict[] = new Array(names.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, names.length) }, async () => {
      while (next < names.length) {
        const i = next++;
        out[i] = await verifySkill(names[i]!);
      }
    }),
  );
  return out;
}

/** Occupation titles from ESCO, used to suggest preferred roles. */
export async function suggestOccupations(query: string): Promise<SuggestResult> {
  const q = query.trim().slice(0, 60);
  if (q.length < 2 || looksLikeGibberish(q)) return { terms: [], degraded: [] };
  try {
    return { terms: await searchEsco(q, "occupation"), degraded: [] };
  } catch (err) {
    logger.warn("roles.suggest.failed", { error: err });
    return { terms: [], degraded: ["esco"] };
  }
}
