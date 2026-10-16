import soSnapshot from "./data/stackoverflow-tags.json";
import { TAXONOMY, type TaxonomyEntry } from "./taxonomy";

export type SkillSource = "skylark" | "stackoverflow" | "esco" | "lightcast" | "github";

export interface SkillTerm {
  name: string;
  source: SkillSource;
  /** Identifier in the source vocabulary (tag name, ESCO URI, Lightcast id). */
  ref: string | null;
}

/** Folds case, accents and separators so "Node JS", "node.js" and "NodeJS" compare equal. */
export function skillKey(s: string) {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\.js\b/g, "js")
    .replace(/[\s_\-]+/g, "")
    .trim();
}

const byKey = new Map<string, TaxonomyEntry>();
for (const e of TAXONOMY) {
  for (const k of [e.name, ...e.aliases, ...(e.stackoverflow ? [e.stackoverflow] : [])]) {
    const key = skillKey(k);
    if (key && !byKey.has(key)) byKey.set(key, e);
  }
}

const soTags = new Set<string>(soSnapshot.tags);

const ACRONYMS = new Set(["api", "apis", "aws", "css", "csv", "dom", "gcp", "gpu", "html", "http", "https", "ide", "ios", "json", "jvm", "jwt", "ml", "mvc", "orm", "pdf", "php", "rest", "sdk", "sql", "ssh", "ssl", "svg", "tcp", "ui", "ux", "url", "vba", "wpf", "xml", "yaml"]);

/** Readable name for a Stack Overflow tag that isn't in the curated taxonomy ("apache-poi" → "Apache POI"). */
export function prettifyTag(tag: string) {
  return tag
    .split("-")
    .map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : /^[a-z]/.test(w) ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** Stack Overflow tags join words with hyphens: "Apache Spark" → "apache-spark". */
export const toTag = (s: string) => s.trim().toLowerCase().replace(/\s+/g, "-");

/** Resolves a skill from the curated taxonomy or the bundled Stack Overflow tag snapshot, offline. */
export function lookupLocal(input: string): SkillTerm | null {
  const entry = byKey.get(skillKey(input));
  if (entry) return { name: entry.name, source: "skylark", ref: entry.stackoverflow };
  const tag = toTag(input);
  if (soTags.has(tag)) return { name: byKey.get(skillKey(tag))?.name ?? prettifyTag(tag), source: "stackoverflow", ref: tag };
  return null;
}

/** Prefix matches first, then word-start matches, then substring matches. */
export function searchLocal(query: string, limit = 8): SkillTerm[] {
  const q = skillKey(query);
  if (!q) return [];
  const words = query.toLowerCase().trim();
  const ranked: { term: SkillTerm; rank: number }[] = [];
  for (const e of TAXONOMY) {
    const keys = [e.name, ...e.aliases].map(skillKey);
    let rank = -1;
    if (keys.some((k) => k === q)) rank = 0;
    else if (keys.some((k) => k.startsWith(q))) rank = 1;
    else if (e.name.toLowerCase().split(/[\s/.\-]+/).some((w) => w.startsWith(words))) rank = 2;
    else if (keys.some((k) => k.includes(q))) rank = 3;
    if (rank >= 0) ranked.push({ term: { name: e.name, source: "skylark", ref: e.stackoverflow }, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank || a.term.name.length - b.term.name.length);
  const out = ranked.map((r) => r.term);
  if (out.length < limit) {
    const tag = toTag(query);
    for (const t of soSnapshot.tags) {
      if (out.length >= limit) break;
      if (t.startsWith(tag) && !byKey.has(skillKey(t))) out.push({ name: prettifyTag(t), source: "stackoverflow", ref: t });
    }
  }
  return dedupe(out).slice(0, limit);
}

export function dedupe(terms: SkillTerm[]) {
  const seen = new Set<string>();
  return terms.filter((t) => {
    const k = skillKey(t.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** Canonical display name for a skill already known locally, otherwise the input tidied. */
export const canonicalSkillName = (input: string) => lookupLocal(input)?.name ?? input.trim();

/** Every curated technology name with its tag — used to recognise skills inside job descriptions. */
export const TECH_TERMS = TAXONOMY.filter((e) => e.stackoverflow).map((e) => ({ name: e.name, aliases: [e.name, ...e.aliases] }));

/* ---------- Spelling suggestions ---------- */

/** Optimal string alignment distance (Levenshtein plus adjacent transpositions), capped for speed. */
export function editDistance(a: string, b: string, max = 3): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array<number>(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j]!;
    prev = cur;
  }
  return prev[b.length]!;
}

const spellIndex: { key: string; term: SkillTerm }[] = [
  ...TAXONOMY.flatMap((e) => [e.name, ...e.aliases].map((k) => ({ key: skillKey(k), term: { name: e.name, source: "skylark" as const, ref: e.stackoverflow } }))),
  ...soSnapshot.tags.map((t) => ({ key: skillKey(t), term: { name: byKey.get(skillKey(t))?.name ?? prettifyTag(t), source: "stackoverflow" as const, ref: t } })),
];

/** "Did you mean" candidates for a misspelt skill ("Kubernets" → Kubernetes, "Pyhton" → Python). */
export function spellingSuggestions(input: string, limit = 3): SkillTerm[] {
  const q = skillKey(input);
  if (q.length < 3) return [];
  const max = q.length <= 5 ? 1 : q.length <= 9 ? 2 : 3;
  const hits: { term: SkillTerm; d: number }[] = [];
  for (const { key, term } of spellIndex) {
    if (key === q) return [term];
    const d = editDistance(q, key, max);
    if (d <= max) hits.push({ term, d });
  }
  hits.sort((a, b) => a.d - b.d || (a.term.source === "skylark" ? -1 : 1) - (b.term.source === "skylark" ? -1 : 1));
  return dedupe(hits.map((h) => h.term)).slice(0, limit);
}
