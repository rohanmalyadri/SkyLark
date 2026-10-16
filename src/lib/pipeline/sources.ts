import "server-only";
import { serverEnv } from "@/lib/env";
import { getJson } from "@/lib/infra/http";
import type { RawPosting } from "./normalize";
import { SOURCE_META, type SourceId } from "./source-meta";

/**
 * A job source adapter. Each one talks to a documented public API and returns raw postings;
 * the pipeline normalizes, de-duplicates and expires them. `complete` says whether the fetch
 * covered the source's full current listing set, which is what allows stale listings to be closed.
 */
export interface JobSource {
  id: SourceId;
  name: string;
  fetchPostings(): Promise<{ postings: RawPosting[]; complete: boolean }>;
}

const EUROPE = ["DE", "GB", "NL", "FR", "CH", "AT", "IE", "ES", "IT", "BE", "PL", "SE", "DK", "PT", "CZ", "FI", "NO"];

/* ---------- Arbeitnow (keyless; https://www.arbeitnow.com/blog/job-board-api) ---------- */

interface ArbeitnowPage {
  data: { slug: string; company_name: string; title: string; description: string; remote: boolean; url: string; tags: string[]; job_types: string[]; location: string; created_at: number }[];
  links: { next: string | null };
}

class ArbeitnowSource implements JobSource {
  id = "arbeitnow" as const;
  name = SOURCE_META.arbeitnow.name;
  constructor(private maxPages = 3) {}

  async fetchPostings() {
    const postings: RawPosting[] = [];
    let complete = false;
    for (let page = 1; page <= this.maxPages; page++) {
      const res = await getJson<ArbeitnowPage>("arbeitnow", `https://www.arbeitnow.com/api/job-board-api?page=${page}`, { timeoutMs: 15_000 });
      for (const j of res.data) {
        postings.push({
          source: this.id,
          externalId: j.slug,
          url: j.url,
          company: { name: j.company_name },
          title: j.title,
          location: j.location || (j.remote ? "Remote" : ""),
          remote: j.remote,
          description: j.description,
          employmentType: j.job_types.some((t) => /part/i.test(t)) ? "part_time" : j.job_types.some((t) => /contract|freelance/i.test(t)) ? "contract" : undefined,
          postedAt: new Date(j.created_at * 1000).toISOString(),
          tags: j.tags,
          countryHints: EUROPE,
        });
      }
      if (!res.links.next || res.data.length === 0) {
        complete = true;
        break;
      }
    }
    // Arbeitnow orders by recency; past the page cap the remainder is older and expires by age instead.
    return { postings, complete };
  }
}

/* ---------- Adzuna (ADZUNA_APP_ID + ADZUNA_APP_KEY; https://developer.adzuna.com) ---------- */

interface AdzunaPage {
  results: { id: string; title: string; description: string; redirect_url: string; created: string; company?: { display_name?: string }; location?: { display_name?: string; area?: string[] }; salary_min?: number; salary_max?: number; salary_is_predicted?: string | number; contract_time?: string; category?: { label?: string } }[];
}
const ADZUNA_CURRENCY: Record<string, string> = { gb: "GBP", us: "USD", de: "EUR", fr: "EUR", nl: "EUR", at: "EUR", it: "EUR", es: "EUR", be: "EUR", ca: "CAD", au: "AUD", in: "INR", sg: "SGD", ch: "CHF", pl: "PLN", nz: "NZD", za: "ZAR", br: "BRL", mx: "MXN" };

class AdzunaSource implements JobSource {
  id = "adzuna" as const;
  name = SOURCE_META.adzuna.name;
  async fetchPostings() {
    const env = serverEnv();
    const countries = env.ADZUNA_COUNTRIES.length ? env.ADZUNA_COUNTRIES.map((c) => c.toLowerCase()) : ["gb", "us", "de", "in"];
    const postings: RawPosting[] = [];
    for (const cc of countries) {
      const q = new URLSearchParams({ app_id: env.ADZUNA_APP_ID!, app_key: env.ADZUNA_APP_KEY!, results_per_page: "50", max_days_old: String(env.JOB_MAX_AGE_DAYS), sort_by: "date", "content-type": "application/json" });
      const res = await getJson<AdzunaPage>("adzuna", `https://api.adzuna.com/v1/api/jobs/${cc}/search/1?${q}`, { timeoutMs: 15_000 });
      for (const j of res.results) {
        const area = j.location?.area ?? [];
        const predicted = String(j.salary_is_predicted ?? "0") === "1";
        postings.push({
          source: this.id,
          externalId: `${cc}-${j.id}`,
          url: j.redirect_url,
          company: { name: j.company?.display_name?.trim() || "" },
          title: j.title,
          location: [area[area.length - 1], area[0]].filter(Boolean).join(", ") || j.location?.display_name || "",
          description: j.description,
          // Adzuna estimates some salaries; only employer-stated figures are shown as salary.
          salary: !predicted && j.salary_min && j.salary_max ? { min: Math.round(j.salary_min), max: Math.round(j.salary_max), currency: ADZUNA_CURRENCY[cc] ?? "USD" } : null,
          department: j.category?.label,
          employmentType: j.contract_time === "part_time" ? "part_time" : j.contract_time === "contract" ? "contract" : undefined,
          postedAt: j.created,
          countryHints: [cc.toUpperCase()],
        });
      }
    }
    // Searches return the newest slice only, so stale listings expire by age, not by absence.
    return { postings, complete: false };
  }
}

/* ---------- The Muse (MUSE_API_KEY; https://www.themuse.com/developers/api/v2) ---------- */

interface MusePage {
  results: { id: number; name: string; contents: string; publication_date: string; refs: { landing_page: string }; company: { name: string }; locations: { name: string }[]; levels: { short_name: string }[]; categories: { name: string }[] }[];
  page_count: number;
}

class MuseSource implements JobSource {
  id = "themuse" as const;
  name = SOURCE_META.themuse.name;
  async fetchPostings() {
    const postings: RawPosting[] = [];
    for (let page = 0; page < 3; page++) {
      const q = new URLSearchParams({ page: String(page), api_key: serverEnv().MUSE_API_KEY! });
      const res = await getJson<MusePage>("themuse", `https://www.themuse.com/api/public/jobs?${q}`, { timeoutMs: 15_000 });
      for (const j of res.results) {
        postings.push({
          source: this.id,
          externalId: String(j.id),
          url: j.refs.landing_page,
          company: { name: j.company.name },
          title: j.name,
          location: j.locations.map((l) => l.name).join("; ") || "",
          remote: j.locations.some((l) => /remote/i.test(l.name)),
          description: j.contents,
          department: j.categories[0]?.name,
          postedAt: j.publication_date,
          countryHints: ["US", "GB", "CA"],
        });
      }
      if (page + 1 >= res.page_count) break;
    }
    return { postings, complete: false };
  }
}

/* ---------- Greenhouse job boards (GREENHOUSE_BOARDS; https://developers.greenhouse.io/job-board.html) ---------- */

interface GreenhouseBoard {
  jobs: { id: number; title: string; absolute_url: string; updated_at: string; first_published?: string; location: { name: string }; content: string; departments?: { name: string }[] }[];
}

class GreenhouseSource implements JobSource {
  id = "greenhouse" as const;
  name = SOURCE_META.greenhouse.name;
  async fetchPostings() {
    const postings: RawPosting[] = [];
    let complete = true;
    for (const token of serverEnv().GREENHOUSE_BOARDS) {
      try {
        const [board, meta] = await Promise.all([
          getJson<GreenhouseBoard>("greenhouse", `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`, { timeoutMs: 15_000 }),
          getJson<{ name: string }>("greenhouse", `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}`, { timeoutMs: 8_000 }),
        ]);
        for (const j of board.jobs) {
          postings.push({
            source: this.id,
            externalId: `${token}-${j.id}`,
            url: j.absolute_url,
            company: { name: meta.name },
            title: j.title,
            location: j.location?.name ?? "",
            description: j.content,
            department: j.departments?.[0]?.name,
            postedAt: j.first_published ?? j.updated_at,
          });
        }
      } catch {
        complete = false;
      }
    }
    return { postings, complete };
  }
}

/* ---------- Lever postings (LEVER_COMPANIES; https://github.com/lever/postings-api) ---------- */

interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt: number;
  descriptionPlain?: string;
  description?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  categories: { location?: string; allLocations?: string[]; team?: string; commitment?: string };
  workplaceType?: string;
}

class LeverSource implements JobSource {
  id = "lever" as const;
  name = SOURCE_META.lever.name;
  async fetchPostings() {
    const postings: RawPosting[] = [];
    let complete = true;
    for (const company of serverEnv().LEVER_COMPANIES) {
      try {
        const list = await getJson<LeverPosting[]>("lever", `https://api.lever.co/v0/postings/${encodeURIComponent(company)}?mode=json`, { timeoutMs: 15_000 });
        for (const j of list) {
          const lists = (j.lists ?? []).map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`).join("");
          postings.push({
            source: this.id,
            externalId: `${company}-${j.id}`,
            url: j.hostedUrl,
            company: { name: company.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) },
            title: j.text,
            location: (j.categories.allLocations?.length ? j.categories.allLocations : [j.categories.location ?? ""]).join("; "),
            remote: j.workplaceType === "remote",
            description: `${j.description ?? j.descriptionPlain ?? ""}${lists}`,
            department: j.categories.team,
            employmentType: /part/i.test(j.categories.commitment ?? "") ? "part_time" : /contract|intern/i.test(j.categories.commitment ?? "") ? "contract" : undefined,
            postedAt: new Date(j.createdAt).toISOString(),
          });
        }
      } catch {
        complete = false;
      }
    }
    return { postings, complete };
  }
}

/** Sources with the credentials or configuration they need. Arbeitnow needs none and is on by default. */
export function enabledSources(): JobSource[] {
  const env = serverEnv();
  const wanted = new Set(env.JOB_SOURCES.length ? env.JOB_SOURCES : ["arbeitnow", "adzuna", "themuse", "greenhouse", "lever"]);
  const all: [boolean, () => JobSource][] = [
    [true, () => new ArbeitnowSource()],
    [!!env.ADZUNA_APP_ID && !!env.ADZUNA_APP_KEY, () => new AdzunaSource()],
    [!!env.MUSE_API_KEY, () => new MuseSource()],
    [env.GREENHOUSE_BOARDS.length > 0, () => new GreenhouseSource()],
    [env.LEVER_COMPANIES.length > 0, () => new LeverSource()],
  ];
  const ids: SourceId[] = ["arbeitnow", "adzuna", "themuse", "greenhouse", "lever"];
  return all.filter(([ok], i) => ok && wanted.has(ids[i]!)).map(([, make]) => make());
}

export const getSource = (id: string) => enabledSources().find((s) => s.id === id);
