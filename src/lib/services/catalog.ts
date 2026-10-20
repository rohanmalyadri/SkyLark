import "server-only";
import { systemRepo } from "@/lib/data";
import type { IngestionRun } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";
import { enqueueAndKick } from "@/lib/pipeline/queue";
import { isSampleJob, SOURCE_META, type SourceId } from "@/lib/pipeline/source-meta";
import { enabledSources } from "@/lib/pipeline/sources";

/** Live listings older than this are refreshed in the background when someone browses jobs. */
const REFRESH_AFTER_MS = 3 * 3600_000;
/** Without a successful fetch in this window, the catalog is reported as not live. */
const STALE_AFTER_MS = 24 * 3600_000;

export interface CatalogStatus {
  /** At least one source refreshed successfully within the last day. */
  live: boolean;
  lastSuccessAt: string | null;
  activeLiveJobs: number;
  activeSampleJobs: number;
  sources: { id: SourceId; name: string; site: string | null; lastRun: IngestionRun | null }[];
  /** Plain-language explanation shown when live data is missing or stale. */
  problem: string | null;
}

export async function catalogStatus(): Promise<CatalogStatus> {
  const repo = systemRepo();
  const [runs, jobs] = await Promise.all([repo.listIngestionRuns(100), repo.listJobs({ status: "active", limit: 5000 })]);
  const sources = enabledSources().map((s) => ({ id: s.id, name: s.name, site: SOURCE_META[s.id].site, lastRun: runs.find((r) => r.source === s.id && r.status !== "running") ?? null }));
  const lastSuccessAt = runs.filter((r) => r.status === "succeeded" && sources.some((s) => s.id === r.source)).map((r) => r.finishedAt ?? r.startedAt).sort().at(-1) ?? null;
  const activeSampleJobs = jobs.filter(isSampleJob).length;
  const activeLiveJobs = jobs.length - activeSampleJobs;
  const live = !!lastSuccessAt && Date.now() - new Date(lastSuccessAt).getTime() < STALE_AFTER_MS && activeLiveJobs > 0;

  let problem: string | null = null;
  if (!live) {
    const failures = sources.filter((s) => s.lastRun?.status === "failed");
    if (!lastSuccessAt && failures.length) problem = `Live job sources couldn't be reached (${failures.map((f) => f.name).join(", ")}). Listings will appear once a refresh succeeds.`;
    else if (!lastSuccessAt) problem = "Live listings haven't been fetched yet. A refresh has been started.";
    else if (activeLiveJobs === 0) problem = "No live listings are open right now.";
    else problem = `Live listings were last refreshed ${new Date(lastSuccessAt).toUTCString()}; the latest refresh didn't succeed.`;
  }
  return { live, lastSuccessAt, activeLiveJobs, activeSampleJobs, sources, problem };
}

/**
 * Starts a background refresh for any source that hasn't been fetched recently. Idempotent per
 * source and time bucket, so concurrent page views queue at most one fetch.
 */
export async function ensureFreshCatalog() {
  try {
    const repo = systemRepo();
    const runs = await repo.listIngestionRuns(100);
    const bucket = Math.floor(Date.now() / REFRESH_AFTER_MS);
    for (const s of enabledSources()) {
      const last = runs.find((r) => r.source === s.id && r.status === "succeeded");
      if (last && Date.now() - new Date(last.finishedAt ?? last.startedAt).getTime() < REFRESH_AFTER_MS) continue;
      await enqueueAndKick({ type: "ingest_source", payload: { source: s.id }, idempotencyKey: `ingest:${s.id}:auto:${bucket}` });
    }
  } catch (err) {
    logger.warn("catalog.refresh_failed", { error: err });
  }
}
