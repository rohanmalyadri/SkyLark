/** Display metadata for job sources (client-safe). Attribution links back to each provider, as their terms ask. */
export const SOURCE_META = {
  arbeitnow: { name: "Arbeitnow", site: "https://www.arbeitnow.com", requires: null },
  adzuna: { name: "Adzuna", site: "https://www.adzuna.com", requires: "ADZUNA_APP_ID, ADZUNA_APP_KEY" },
  themuse: { name: "The Muse", site: "https://www.themuse.com", requires: "MUSE_API_KEY" },
  greenhouse: { name: "Greenhouse job boards", site: "https://www.greenhouse.com", requires: "GREENHOUSE_BOARDS" },
  lever: { name: "Lever job postings", site: "https://www.lever.co", requires: "LEVER_COMPANIES" },
  sample: { name: "Sample data", site: null, requires: null },
} as const;

export type SourceId = Exclude<keyof typeof SOURCE_META, "sample">;

export const sourceName = (id: string) => (SOURCE_META as Record<string, { name: string }>)[id]?.name ?? id;

/** Fictional listings bundled for local demos. Never stored when a real database is configured. */
export const SAMPLE_SOURCE = "sample";
export const isSampleJob = (job: { source: string }) => job.source === SAMPLE_SOURCE;
