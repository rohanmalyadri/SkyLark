import { createHash } from "node:crypto";
import type { NewRow } from "@/lib/data/repository";
import type { Job, Place, Salary, Seniority, SponsorshipPolicy, WorkMode } from "@/lib/domain/types";
import { resolveCity, resolveCountry } from "@/lib/geo";
import { TECH_TERMS } from "@/lib/skills/catalog";
import { DEGREE_RE } from "./normalize-degree";
import { z } from "zod";

/**
 * Shape every source adapter emits. Loose on purpose: real boards are inconsistent. Nothing in
 * a normalized job is invented: fields the listing doesn't provide stay empty.
 */
export const RawPostingSchema = z.object({
  source: z.string().min(1),
  externalId: z.string().min(1).max(200),
  // Rendered as a link: only web URLs, never javascript: or data: schemes.
  url: z.url({ protocol: /^https?$/ }),
  company: z.object({ name: z.string().trim().min(2).max(120), domain: z.string().max(120).optional() }),
  title: z.string().trim().min(2).max(200),
  location: z.string().max(400),
  /** Plain text or HTML. */
  description: z.string().min(20).max(100_000),
  salaryText: z.string().max(120).optional(),
  salary: z.object({ min: z.number(), max: z.number(), currency: z.string().length(3) }).nullable().optional(),
  department: z.string().max(80).optional(),
  employmentType: z.enum(["full_time", "contract", "part_time"]).optional(),
  remote: z.boolean().optional(),
  postedAt: z.string(),
  tags: z.array(z.string()).optional(),
  /** Countries to prefer when a bare city name exists in several countries (the board's home markets). */
  countryHints: z.array(z.string().length(2)).optional(),
});
export type RawPosting = z.infer<typeof RawPostingSchema>;

/* ---------- Text ---------- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", bull: "•", euro: "€", pound: "£" };

export function decodeEntities(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1]?.toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : "";
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML (possibly entity-escaped, as some boards send it) → plain text that keeps paragraphs and bullets. */
export function htmlToText(input: string) {
  let html = input;
  // Boards like Arbeitnow escape their HTML (sometimes mixed with real tags); unescape markup before stripping it.
  for (let i = 0; i < 2 && /&(amp;)?lt;\/?[a-z]/i.test(html); i++) html = decodeEntities(html);
  if (!/<[a-z][\s\S]*?>/i.test(html)) return decodeEntities(html).replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/(p|div|h[1-6]|ul|ol|li|tr|section|article)>/gi, "\n")
      .replace(/<(br|hr)\s*\/?>/gi, "\n")
      .replace(/<(h[1-6])[^>]*>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeTitle(title: string) {
  return title
    .replace(/\((?:m|f|w|d|x|mwd|fmd|mfd|all genders?|alle|gn|mensch)[^)]*\)/gi, "")
    .replace(/\s*[([].*?[)\]]\s*/g, " ")
    .replace(/\s+[-–|]\s+(remote|hybrid|onsite|on-site).*$/i, "")
    .replace(/\bsr\b\.?/gi, "Senior")
    .replace(/\bjr\b\.?/gi, "Junior")
    .replace(/\beng\b/gi, "Engineer")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s,–-]+$/, "")
    .trim();
}

export function inferSeniority(title: string): Seniority {
  const t = title.toLowerCase();
  if (/\b(vp|vice president|director|head of|chief|cto|cfo|ceo|coo|cmo)\b/.test(t)) return "executive";
  if (/\b(staff|principal|lead|manager)\b/.test(t)) return "lead";
  if (/\b(senior|sr)\b/.test(t)) return "senior";
  if (/\b(junior|graduate|intern|internship|entry|trainee|werkstudent|working student|apprentice)\b/.test(t)) return "entry";
  return "mid";
}

/* ---------- Location ---------- */

const EXONYMS: Record<string, string> = { cologne: "Köln", nuremberg: "Nürnberg", hanover: "Hannover", frankfurt: "Frankfurt am Main", munchen: "Munich", "the hague": "The Hague", "den haag": "The Hague", lisboa: "Lisbon", warszawa: "Warsaw", praha: "Prague", wien: "Vienna", "new york city": "New York", nyc: "New York", sf: "San Francisco" };
const GLOBAL = /\b(anywhere|worldwide|global(ly)?|world ?wide)\b/i;

export function parseLocation(text: string, opts: { remote?: boolean; countryHints?: string[] } = {}): { places: Place[]; workMode: WorkMode; remoteCountries: string[]; global: boolean } {
  const lower = text.toLowerCase();
  const workMode: WorkMode = opts.remote || /remote|home ?office/.test(lower) ? "remote" : /hybrid/.test(lower) ? "hybrid" : "onsite";
  const places: Place[] = [];
  for (const segment of text.split(/[;|/]|\s+or\s+/)) {
    const cleaned = segment.replace(/\b(remote|hybrid|on-?site|home ?office|full[- ]?time)\b/gi, "").replace(/[()]/g, "").replace(/\s+-\s*$/, "");
    const parts = cleaned.split(/,|\s-\s/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    const countryFromLast = parts.length > 1 || !resolveCity(parts[0]!, opts.countryHints?.[0]) ? resolveCountry(parts[parts.length - 1]!) : null;
    if (parts.length === 1 && countryFromLast) {
      places.push({ city: "", country: countryFromLast });
      continue;
    }
    const cityRaw = parts[0]!;
    const cityName = EXONYMS[cityRaw.toLowerCase()] ?? cityRaw;
    let country = countryFromLast;
    if (!country) {
      for (const hint of [...(opts.countryHints ?? []), undefined]) {
        const hit = resolveCity(cityName, hint);
        if (hit && (!hint || hit.country === hint)) {
          country = hit.country;
          break;
        }
      }
    }
    if (country && !places.some((p) => p.city === cityRaw && p.country === country)) places.push({ city: cityRaw, country });
  }
  const global = workMode === "remote" && GLOBAL.test(text);
  const remoteCountries = workMode === "remote" && !global ? [...new Set(places.map((p) => p.country))] : [];
  return { places, workMode, remoteCountries, global };
}

/* ---------- Pay, sponsorship, skills ---------- */

export function parseSalary(text?: string): Salary | null {
  if (!text) return null;
  const currency = /€|eur/i.test(text) ? "EUR" : /£|gbp/i.test(text) ? "GBP" : /cad/i.test(text) ? "CAD" : /aud/i.test(text) ? "AUD" : /sgd/i.test(text) ? "SGD" : /chf/i.test(text) ? "CHF" : /inr|₹/i.test(text) ? "INR" : "USD";
  const nums = [...text.matchAll(/(\d{2,3}(?:[,.]\d{3})*|\d+)\s*(k)?/gi)]
    .map((m) => Number(m[1]!.replace(/[,.]/g, "")) * (m[2] ? 1000 : 1))
    .filter((n) => n >= 10_000);
  if (nums.length === 0) return null;
  return { min: Math.min(...nums), max: Math.max(...nums), currency };
}

export function detectSponsorship(description: string): SponsorshipPolicy {
  const d = description.toLowerCase();
  if (/(unable to|cannot|can't|can not|do not|does not|don't|won't|will not|no) (provide |offer )?(visa |work permit )?sponsor/.test(d) || /must (already )?(have|hold) (the |a valid )?(right|authori[sz]ation|permit) to work/.test(d) || /no visa sponsorship/.test(d)) return "no";
  if (/(visa sponsorship (is )?(available|provided|offered|possible)|we (can |will |do )?sponsor|relocation and visa support|visa support|sponsorship available)/.test(d)) return "yes";
  return "unknown";
}

// Ambiguous as plain English: only matched with their exact capitalisation.
const CASE_SENSITIVE = new Set(["Go", "Rust", "Swift", "Dart", "Julia", "Spring", "Express", "Flask", "Sketch", "Framer", "Chef", "Puppet", "Unity", "Bun", "Helm", "Jest", "Vite", "Electron", "Phoenix", "Looker", "Excel", "Deno", "Prisma", "Snowflake", "Kanban", "Scrum"]);
// Too short or too common to find reliably in prose.
const SKIP = new Set(["C", "R", "Go", "CSS", "CD", "CI", "CV", "ML", "FP", "TF", "QA", "UI", "UX", "IAM", "SEO", "SRE", "ETL", "ELT", "Testing", "Networking", "Research", "Cloud architecture", "Embedded systems"]);

// Aliases that are ordinary words in job prose ("next steps", "security clearance", "performance reviews").
const GENERIC_ALIASES = new Set(["next", "performance", "web performance", "documentation", "embedded", "security", "information security", "cloud", "cloud computing", "testing", "software testing", "analytics", "data analytics", "monitoring", "lambda", "elastic", "spark", "compose", "node", "rails", "oracle", "mongo", "torch", "shell", "rest", "rest api", "transformers", "unity3d", "lean", "growth", "strategy", "operations", "audit", "tax", "taxation", "research", "networking", "statistics", "concurrency", "a11y", "i18n", "fp", "oop", "ddd", "k8s"]);

const TERM_PATTERNS = TECH_TERMS.map((t) => {
  const forms = t.aliases.filter((a) => !SKIP.has(a) && !GENERIC_ALIASES.has(a.toLowerCase()) && (a.length >= 3 || CASE_SENSITIVE.has(a)));
  if (forms.length === 0) return null;
  const alt = forms.map((a) => a.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&")).join("|");
  const flags = forms.every((f) => CASE_SENSITIVE.has(f)) ? "" : "i";
  return { name: t.name, re: new RegExp(`(?:^|[^A-Za-z0-9#+.])(?:${alt})(?![A-Za-z0-9#+]|\\.[A-Za-z])`, flags) };
}).filter((x): x is { name: string; re: RegExp } => !!x);

/** Canonical technology skills mentioned in a text. */
export function extractSkills(text: string) {
  const found: string[] = [];
  for (const t of TERM_PATTERNS) if (t.re.test(text) && !found.includes(t.name)) found.push(t.name);
  if (/\bgolang\b|\bGo\b(?= (?:developer|engineer|programming|services|microservices|backend))|\bin Go\b/.test(text) && !found.includes("Go")) found.push("Go");
  return found;
}

export function extractMinYears(text: string) {
  const m = text.match(/(\d{1,2})\s*\+?\s*(?:years|yrs|jahre)/i);
  return m ? Math.min(Number(m[1]), 15) : 0;
}

/* ---------- Sections ---------- */

const SECTION_PATTERNS: [RegExp, "requirements" | "responsibilities" | "nice" | "benefits" | "about"][] = [
  [/(nice to have|bonus|would be a plus|preferred qualifications|wünschenswert|von vorteil|good to have)/i, "nice"],
  [/(requirement|qualification|what you bring|what we('re| are) looking for|your profile|about you|who you are|you have|must[- ]have|skills|experience|ihr profil|dein profil|anforderungen|was du mitbringst|was sie mitbringen|we expect)/i, "requirements"],
  [/(responsibilit|what you('ll| will) do|your role|the role|your tasks|in this role|your mission|key tasks|aufgaben|deine aufgaben|ihre aufgaben|day[- ]to[- ]day|you will)/i, "responsibilities"],
  [/(benefit|what we offer|we offer|perks|wir bieten|why join|compensation)/i, "benefits"],
];

/** Splits a description into intro text and bullet lists under recognised headings. */
export function splitSections(text: string) {
  const out = { intro: [] as string[], requirements: [] as string[], responsibilities: [] as string[], nice: [] as string[] };
  let current: keyof typeof out | "benefits" | "other" = "intro";
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = /^[•\-*·▪●◦]\s*/.test(line);
    const content = line.replace(/^[•\-*·▪●◦]\s*/, "").trim();
    const isHeading = !bullet && content.length <= 70 && !/[.!?]$/.test(content.replace(/:$/, "")) ;
    if (isHeading) {
      const kind = SECTION_PATTERNS.find(([re]) => re.test(content))?.[1];
      if (kind) {
        current = kind === "about" ? "intro" : kind;
        continue;
      }
      if (/:$/.test(content)) {
        current = "other";
        continue;
      }
    }
    if (content.length < 3) continue;
    if (current === "intro" && !bullet) out.intro.push(content);
    else if (current === "requirements" || current === "responsibilities" || current === "nice") out[current].push(content);
  }
  return out;
}


/** Stable identity for the same role posted on several boards. */
export function jobFingerprint(companyKey: string, title: string, country: string) {
  const key = [companyKey.toLowerCase(), normalizeTitle(title).toLowerCase().replace(/[^a-z0-9]/g, ""), country.toUpperCase()].join("|");
  return createHash("sha256").update(key).digest("hex").slice(0, 32);
}

/** Company identity: its web domain when the source gives one, otherwise a slug of its name. */
export function companyKey(company: { name: string; domain?: string }) {
  if (company.domain && /\./.test(company.domain)) return company.domain.toLowerCase().replace(/^www\./, "");
  return company.name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);

export function normalizePosting(raw: RawPosting, companyId: string, now: string): NewRow<Job> | null {
  const parsed = RawPostingSchema.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  const title = normalizeTitle(r.title);
  if (title.length < 2) return null;
  const postedAt = new Date(r.postedAt);
  if (Number.isNaN(postedAt.getTime())) return null;

  const { places, workMode, remoteCountries, global } = parseLocation(r.location, { remote: r.remote, countryHints: r.countryHints });
  // A listing we can't place in any country can't be checked for eligibility; skip it rather than guess.
  if (places.length === 0 && !global) return null;

  const text = htmlToText(r.description);
  if (text.length < 20) return null;
  const sections = splitSections(text);
  const reqText = sections.requirements.join("\n");
  const titleSkills = extractSkills(r.title);
  const reqSkills = extractSkills(reqText);
  const niceSkills = extractSkills(sections.nice.join("\n"));
  const allSkills = extractSkills(`${text}\n${(r.tags ?? []).join(", ")}`);
  const required = [...new Set([...titleSkills, ...reqSkills, ...(reqSkills.length ? [] : allSkills.filter((s) => !niceSkills.includes(s)))])].slice(0, 10);
  const nice = niceSkills.filter((s) => !required.includes(s)).slice(0, 6);

  const intro = sections.intro.join("\n\n") || text.split("\n\n")[0] || text;
  const requirements = sections.requirements.map((l) => clip(l, 300)).slice(0, 12);
  if (DEGREE_RE.test(text) && !requirements.some((l) => DEGREE_RE.test(l))) {
    const degreeLine = text.split("\n").find((l) => DEGREE_RE.test(l) && l.length < 300);
    if (degreeLine) requirements.push(degreeLine.replace(/^[•\-*·]\s*/, ""));
  }
  const firstCountry = places[0]?.country ?? "";

  return {
    companyId,
    title,
    department: r.department?.trim() || "",
    seniority: inferSeniority(r.title),
    employmentType: r.employmentType ?? (/\b(part[- ]time|teilzeit|werkstudent|working student)\b/i.test(r.title) ? "part_time" : /\b(contract|freelance|freelancer)\b/i.test(r.title) ? "contract" : "full_time"),
    locations: places,
    workMode,
    remoteCountries,
    salary: r.salary ?? parseSalary(r.salaryText),
    description: clip(intro, 1200),
    responsibilities: sections.responsibilities.map((l) => clip(l, 300)).slice(0, 10),
    requirements,
    requiredSkills: required,
    niceToHaveSkills: nice,
    minYears: extractMinYears(reqText || text),
    visaSponsorship: detectSponsorship(text),
    source: r.source,
    sourceUrl: r.url,
    externalId: r.externalId,
    fingerprint: jobFingerprint(companyKey(r.company), title, firstCountry || "XX"),
    status: "active",
    postedAt: postedAt.toISOString(),
    lastSeenAt: now,
    createdAt: now,
  };
}
