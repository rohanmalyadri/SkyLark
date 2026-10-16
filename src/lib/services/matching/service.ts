import "server-only";
import { systemRepo } from "@/lib/data";
import type { CandidateProfile, JobWithCompany, ProfileVerification } from "@/lib/domain/types";
import { logger } from "@/lib/infra/logger";
import { notify } from "@/lib/services/notifications";
import { scoreMatch, type MatchContext } from "./engine";

/** Matches below this are not stored: they would only add noise to the feed. */
export const STORE_THRESHOLD = 40;
const HIGH_FIT = 85;

const contextFor = (v: ProfileVerification | null | undefined): MatchContext => ({
  verifiedSkills: v?.enrichment.github?.status === "verified" ? v.enrichment.github.verifiedSkills : [],
});

/** Rejected profiles are not matched; every other state is (pending reviews shouldn't stall a job search). */
const matchable = (v: ProfileVerification | null | undefined) => v?.status !== "rejected";

function scoreAll(profile: CandidateProfile, jobs: JobWithCompany[], ctx: MatchContext) {
  return jobs
    .map((job) => ({ job, ...scoreMatch(profile, job, job.company, ctx) }))
    .filter((m) => m.score >= STORE_THRESHOLD);
}

/** Re-score one candidate against every active job (after onboarding or a profile edit). */
export async function matchCandidate(userId: string) {
  const repo = systemRepo();
  const [profile, verification] = await Promise.all([repo.getProfile(userId), repo.getVerification(userId)]);
  if (!profile || !matchable(verification)) return { scored: 0, highFit: 0 };

  const [jobs, existing] = await Promise.all([repo.listJobs({ status: "active", limit: 5000 }), repo.listMatches(userId)]);
  const known = new Set(existing.map((m) => m.jobId));
  const results = scoreAll(profile, jobs, contextFor(verification));
  await repo.upsertMatches(results.map((r) => ({ userId, jobId: r.job.id, score: r.score, breakdown: r.breakdown, status: "new" })));

  const fresh = results.filter((r) => !known.has(r.job.id) && r.score >= HIGH_FIT);
  if (fresh.length) {
    await notify(userId, {
      type: "match",
      title: `${fresh.length} new high-fit ${fresh.length === 1 ? "match" : "matches"}`,
      body: fresh.slice(0, 2).map((r) => r.job.company.name).join(", ") + (fresh.length > 2 ? ` and ${fresh.length - 2} more` : "") + ` scored ${HIGH_FIT}%+.`,
      href: "/jobs",
    });
  }
  logger.info("matching.candidate.done", { userId, scored: results.length, highFit: fresh.length });
  return { scored: results.length, highFit: fresh.length };
}

/** Score newly ingested jobs against every candidate profile. */
export async function matchJobs(jobIds: string[]) {
  const repo = systemRepo();
  const jobs = (await Promise.all(jobIds.map((id) => repo.getJob(id)))).filter((j): j is JobWithCompany => !!j && j.status === "active");
  if (jobs.length === 0) return { scored: 0 };
  const [profiles, verifications] = await Promise.all([repo.listProfiles(), repo.listVerifications()]);
  const byUser = new Map(verifications.map((v) => [v.userId, v]));
  let scored = 0;
  for (const p of profiles) {
    const v = byUser.get(p.userId);
    if (!matchable(v)) continue;
    const rows = scoreAll(p, jobs, contextFor(v)).map((r) => ({ userId: p.userId, jobId: r.job.id, score: r.score, breakdown: r.breakdown, status: "new" as const }));
    if (rows.length) scored += await repo.upsertMatches(rows);
  }
  return { scored };
}
