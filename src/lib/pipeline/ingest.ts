import "server-only";
import { systemRepo } from "@/lib/data";
import type { NewRow } from "@/lib/data/repository";
import type { Company, Job } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/infra/logger";
import { withRetry } from "@/lib/infra/retry";
import { UpstreamError } from "@/lib/infra/http";
import { companyKey, normalizePosting } from "./normalize";
import { enqueue } from "./queue";
import { getSource } from "./sources";

/**
 * fetch → normalize → dedupe → persist → expire → fan out matching.
 * One malformed posting never fails a run; an unreachable source fails the run (and is retried)
 * without touching the listings already stored.
 */
export async function runIngestion(sourceId: string) {
  const source = getSource(sourceId);
  if (!source) throw new Error(`Source not enabled: ${sourceId}`);
  const repo = systemRepo();
  const startedAt = new Date().toISOString();
  const run = await repo.createIngestionRun({ source: sourceId, status: "running", fetched: 0, normalized: 0, duplicates: 0, inserted: 0, error: null, startedAt, finishedAt: null });
  const log = logger.child({ runId: run.id, source: sourceId });

  try {
    const { postings, complete } = await withRetry(() => source.fetchPostings(), { attempts: 3, baseMs: 800, retryIf: (e) => !(e instanceof UpstreamError) || e.transient });

    const companies = new Map((await repo.listCompanies()).map((c) => [c.domain, c]));
    const normalized: NewRow<Job>[] = [];
    for (const raw of postings) {
      if (!raw.company?.name || raw.company.name.trim().length < 2) continue;
      const key = companyKey(raw.company);
      if (!key) continue;
      let company: Company | undefined = companies.get(key);
      if (!company) {
        const hasDomain = key.includes(".");
        company = await repo.upsertCompany({
          name: raw.company.name.trim(),
          domain: key,
          industry: "",
          size: "",
          headquarters: { city: "", country: "" },
          description: "",
          sponsorshipHistory: "unknown",
          website: hasDomain ? `https://${key}` : "",
          brandColor: "#9BA1AB",
        });
        companies.set(key, company);
      }
      const job = normalizePosting(raw, company.id, startedAt);
      if (job) normalized.push(job);
    }

    // Dedupe within the batch (cross-posted roles share a fingerprint), then against what's stored.
    const maxAge = new Date(Date.now() - serverEnv().JOB_MAX_AGE_DAYS * 86_400_000).toISOString();
    const current = normalized.filter((j) => j.postedAt >= maxAge);
    // Listings are unique both by fingerprint and by the source's own id, so dedupe on both: a board
    // that renames a role keeps its id but changes the fingerprint, and inserting it again would
    // violate (source, external_id) and fail the whole run.
    const byFingerprint = [...new Map(current.map((j) => [j.fingerprint, j])).values()];
    const unique = [...new Map(byFingerprint.map((j) => [j.externalId, j])).values()];
    const existing = new Set(await repo.findJobsByFingerprint(unique.map((j) => j.fingerprint)));
    const storedById = new Map((await repo.findJobsByExternalId(sourceId, unique.map((j) => j.externalId))).map((r) => [r.externalId, r.fingerprint]));
    const fresh = unique.filter((j) => !existing.has(j.fingerprint) && !storedById.has(j.externalId));
    const inserted = await repo.insertJobs(fresh);
    await repo.touchJobs([...new Set([...existing, ...storedById.values()])], startedAt);

    // Expiry: listings the source stopped showing (only knowable from a complete fetch) and anything past the maximum age.
    const closed = await repo.closeStaleJobs({ source: sourceId, seenBefore: complete ? startedAt : undefined, postedBefore: maxAge });

    // Score new listings against every candidate in batches rather than one queue entry per job.
    for (let i = 0; i < inserted.length; i += 100) {
      const ids = inserted.slice(i, i + 100).map((j) => j.id);
      await enqueue({ type: "match_job", payload: { jobIds: ids }, idempotencyKey: `match_jobs:${run.id}:${i}` });
    }

    const stats = {
      fetched: postings.length,
      normalized: normalized.length,
      duplicates: current.length - inserted.length,
      inserted: inserted.length,
    };
    await repo.updateIngestionRun(run.id, { status: "succeeded", ...stats, finishedAt: new Date().toISOString() });
    log.info("ingest.succeeded", { ...stats, closed, complete });
    return { runId: run.id, ...stats, closed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await repo.updateIngestionRun(run.id, { status: "failed", error: message, finishedAt: new Date().toISOString() });
    log.error("ingest.failed", { error: message });
    throw err;
  }
}
