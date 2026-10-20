import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { systemRepo } from "@/lib/data";

export const PLANS_TAG = "plans";

/** Pricing is data. Cached into the static shell and invalidated when an admin edits a plan. */
export async function publicPlans() {
  "use cache";
  cacheTag(PLANS_TAG);
  cacheLife("hours");
  return systemRepo().listPlans();
}

export interface PublicDomain {
  name: string;
  openRoles: number;
  skills: string[];
}

/** Disciplines in the live job catalog, with the skills employers ask for most. */
export async function publicDomains(): Promise<PublicDomain[]> {
  "use cache";
  cacheTag("jobs");
  cacheLife("hours");
  const jobs = await systemRepo().listJobs({ status: "active", limit: 2000 });
  const byDept = new Map<string, { count: number; skills: Map<string, number> }>();
  for (const job of jobs) {
    const d = byDept.get(job.department) ?? { count: 0, skills: new Map() };
    d.count++;
    for (const s of job.requiredSkills) d.skills.set(s, (d.skills.get(s) ?? 0) + 1);
    byDept.set(job.department, d);
  }
  return [...byDept.entries()]
    .map(([name, d]) => ({ name, openRoles: d.count, skills: [...d.skills.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s]) => s) }))
    .sort((a, b) => b.openRoles - a.openRoles);
}

export interface CatalogStats {
  openRoles: number;
  companies: number;
  /** ISO codes of the countries roles are located in, most roles first. */
  countries: string[];
  /** Cities with open roles, most roles first. */
  cities: { city: string; country: string; roles: number }[];
}

/** Headline figures for the home page, read from the live job catalog. */
export async function publicCatalogStats(): Promise<CatalogStats> {
  "use cache";
  cacheTag("jobs");
  cacheLife("hours");
  const jobs = await systemRepo().listJobs({ status: "active", limit: 2000 });
  const byCountry = new Map<string, number>();
  const byCity = new Map<string, { city: string; country: string; roles: number }>();
  for (const job of jobs)
    for (const l of job.locations) {
      byCountry.set(l.country, (byCountry.get(l.country) ?? 0) + 1);
      const key = `${l.city}|${l.country}`;
      const entry = byCity.get(key) ?? { city: l.city, country: l.country, roles: 0 };
      entry.roles++;
      byCity.set(key, entry);
    }
  return {
    openRoles: jobs.length,
    companies: new Set(jobs.map((j) => j.companyId)).size,
    countries: [...byCountry.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c),
    cities: [...byCity.values()].sort((a, b) => b.roles - a.roles),
  };
}
