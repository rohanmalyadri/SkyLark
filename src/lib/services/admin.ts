import "server-only";
import { getAIProvider } from "@/lib/ai";
import { systemRepo } from "@/lib/data";
import { PlanUpdateSchema, VerificationDecisionSchema } from "@/lib/domain/schemas";
import { profileCompleteness } from "@/lib/domain/profile";
import type { GithubEnrichment, PlanId, User, VerificationStatus } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { AppError, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { enqueueAndKick } from "@/lib/pipeline/queue";
import { SOURCE_META, sourceName, type SourceId } from "@/lib/pipeline/source-meta";
import { enabledSources } from "@/lib/pipeline/sources";
import { runWorker } from "@/lib/pipeline/worker";
import { audit } from "./audit";
import { notify } from "./notifications";
import { computeFlags, resolveGithub } from "./verification";

export async function overview() {
  const repo = systemRepo();
  const now = new Date().toISOString();
  const [stats, reviews, runs, jobs, verifications] = await Promise.all([
    repo.adminStats(now),
    repo.listReviews({ status: ["queued", "in_review"], limit: 6 }),
    repo.listIngestionRuns(6),
    repo.listBackgroundJobs({ status: ["failed", "dead"], limit: 5 }),
    repo.listVerifications({ status: ["pending"] }),
  ]);
  return { stats, reviews, runs, failedJobs: jobs, pendingVerifications: verifications.length, now };
}

/* ---------- Candidates & verification ---------- */

export interface CandidateFilters {
  q: string;
  status: VerificationStatus | "all" | "flagged";
  sort: "queue" | "joined" | "name";
}

const STATUS_FILTERS = ["pending", "approved", "changes_requested", "rejected", "flagged"] as const;

export function parseCandidateFilters(sp: Record<string, string | string[] | undefined>): CandidateFilters {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) ?? "";
  const status = one("status");
  const sort = one("sort");
  return {
    q: one("q").trim().slice(0, 80),
    status: (STATUS_FILTERS as readonly string[]).includes(status) ? (status as CandidateFilters["status"]) : "all",
    sort: sort === "joined" || sort === "name" ? sort : "queue",
  };
}

/** Review queue and directory: every candidate with verification state, flags and activity. */
export async function candidates(filters: CandidateFilters = { q: "", status: "all", sort: "queue" }) {
  const repo = systemRepo();
  const [users, verifications, apps] = await Promise.all([repo.listUsers({ role: "candidate", limit: 1000 }), repo.listVerifications(), repo.listAllApplications({ limit: 5000 })]);
  const byUser = new Map(verifications.map((v) => [v.userId, v]));
  const all = await Promise.all(
    users.map(async (u) => {
      const [profile, resumes, sub] = await Promise.all([repo.getProfile(u.id), repo.listResumes(u.id), repo.getSubscription(u.id)]);
      const verification = byUser.get(u.id) ?? null;
      return {
        user: u,
        profile,
        verification,
        warnings: verification?.flags.filter((f) => f.severity === "warning").length ?? 0,
        plan: sub?.planId ?? "entry",
        completeness: profileCompleteness(profile ?? null, resumes.length > 0).score,
        applications: apps.filter((a) => a.userId === u.id).length,
        active: apps.filter((a) => a.userId === u.id && ["human_review", "applied", "screening", "interview", "offer"].includes(a.status)).length,
      };
    }),
  );
  const flagged = (r: (typeof all)[number]) => r.warnings > 0 && r.verification?.status !== "rejected";
  const counts = {
    all: all.length,
    pending: all.filter((r) => r.verification?.status === "pending").length,
    flagged: all.filter(flagged).length,
    changes_requested: all.filter((r) => r.verification?.status === "changes_requested").length,
    approved: all.filter((r) => r.verification?.status === "approved").length,
    rejected: all.filter((r) => r.verification?.status === "rejected").length,
  };
  const q = filters.q.toLowerCase();
  const rows = all
    .filter((r) => {
      if (filters.status === "flagged" && !flagged(r)) return false;
      if (filters.status !== "all" && filters.status !== "flagged" && r.verification?.status !== filters.status) return false;
      if (!q) return true;
      const hay = [r.user.fullName, r.user.email, r.profile?.headline, r.profile?.location.city, ...(r.profile?.skills.map((s) => s.name) ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => {
      if (filters.sort === "name") return a.user.fullName.localeCompare(b.user.fullName);
      if (filters.sort === "joined") return b.user.createdAt.localeCompare(a.user.createdAt);
      // Queue order: pending first (longest waiting at the top), then most recently updated.
      const pa = a.verification?.status === "pending" ? 0 : 1;
      const pb = b.verification?.status === "pending" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      if (pa === 0) return a.verification!.submittedAt.localeCompare(b.verification!.submittedAt);
      return (b.verification?.updatedAt ?? b.user.createdAt).localeCompare(a.verification?.updatedAt ?? a.user.createdAt);
    });
  return { rows, counts };
}

/** Everything a reviewer needs to decide on one candidate. */
export async function candidateDetail(userId: string) {
  const repo = systemRepo();
  const user = await repo.getUser(userId);
  if (!user || user.role !== "candidate") throw notFound("Candidate");
  const [profile, verification, resumes, applications, subscription, history, people] = await Promise.all([
    repo.getProfile(userId),
    repo.getVerification(userId),
    repo.listResumes(userId),
    repo.listApplications(userId),
    repo.getSubscription(userId),
    repo.listAudit({ entityType: "profile_verification", entityId: userId, limit: 50 }),
    repo.listUsers({ limit: 1000 }),
  ]);
  const names = new Map(people.map((u) => [u.id, u.fullName]));
  return {
    user,
    profile,
    verification,
    resumes,
    applications,
    subscription,
    reviewerName: verification?.reviewedBy ? (names.get(verification.reviewedBy) ?? "Staff member") : null,
    history: history.map((h) => ({ ...h, actorName: h.actorId ? (names.get(h.actorId) ?? "Unknown") : "System" })),
  };
}

const DECISION_COPY = {
  approved: { title: "Your profile is verified", body: "A specialist reviewed your profile. You can now send applications for human review." },
  changes_requested: { title: "Your profile needs a few changes", body: "A specialist reviewed your profile and asked for changes. Open your profile to see what to update." },
  rejected: { title: "We couldn't verify your profile", body: "A specialist reviewed your profile and couldn't verify it. Open your profile for details." },
} as const;

const assertStaff = (u: User) => {
  if (u.role !== "admin" && u.role !== "reviewer") throw new AppError("forbidden", "Only staff can review profiles.");
};

/** Approve, reject or request changes. Staff only, enforced here regardless of the caller. */
export async function decideVerification(staff: User, userId: string, input: unknown) {
  assertStaff(staff);
  if (staff.id === userId) throw new AppError("forbidden", "You can't review your own profile.");
  const { decision, note } = VerificationDecisionSchema.parse(input);
  const repo = systemRepo();
  const [user, profile, current] = await Promise.all([repo.getUser(userId), repo.getProfile(userId), repo.getVerification(userId)]);
  if (!user || user.role !== "candidate") throw notFound("Candidate");
  if (!profile) throw new AppError("validation", "This candidate hasn't completed a profile yet.");
  const now = new Date().toISOString();
  const updated = await repo.upsertVerification({
    userId,
    status: decision,
    note,
    flags: current?.flags ?? [],
    enrichment: current?.enrichment ?? {},
    submittedAt: current?.submittedAt ?? now,
    reviewedBy: staff.id,
    reviewedAt: now,
    approvedSnapshot: decision === "approved" ? { skills: profile.skills.map((s) => s.name), links: Object.values(profile.links).filter((l): l is string => !!l) } : null,
  });
  await audit(staff, `profile.verification.${decision}`, "profile_verification", userId, { previous: current?.status ?? null, ...(note ? { note } : {}) });
  const copy = DECISION_COPY[decision];
  await notify(userId, { type: "system", title: copy.title, body: note ? `${copy.body} Note from the reviewer: ${note.slice(0, 280)}` : copy.body, href: "/profile" });
  if (decision === "approved") await enqueueAndKick({ type: "match_candidate", payload: { userId }, idempotencyKey: `match_candidate:${userId}:verified:${now}` });
  return updated;
}

/** Re-runs the GitHub check for a candidate (e.g. after an API outage). */
export async function refreshCandidateEnrichment(staff: User, userId: string) {
  assertStaff(staff);
  const repo = systemRepo();
  const [user, profile, current] = await Promise.all([repo.getUser(userId), repo.getProfile(userId), repo.getVerification(userId)]);
  if (!user || !profile || !current) throw notFound("Candidate profile");
  if (!profile.links.github) throw new AppError("validation", "This candidate hasn't linked a GitHub account.");
  let github: GithubEnrichment | undefined;
  let missing = false;
  try {
    github = await resolveGithub(staff, profile.links.github, current.enrichment.github, { force: true });
  } catch (err) {
    if (!(err instanceof AppError && err.details?.fieldErrors)) throw err;
    // The account no longer exists: record it for the reviewer instead of failing.
    missing = true;
    github = current.enrichment.github ? { ...current.enrichment.github, status: "not_found", fetchedAt: new Date().toISOString(), error: "GitHub account not found" } : undefined;
  }
  const resumes = await repo.listResumes(userId);
  const flags = computeFlags(profile, user, github, { hasResume: resumes.length > 0, emailConfirmed: serverEnv().dataMode === "supabase" });
  if (missing) flags.unshift({ code: "github_missing", severity: "warning", field: "links.github", message: "The linked GitHub account doesn't exist." });
  const updated = await repo.upsertVerification({ ...current, flags, enrichment: { ...current.enrichment, github } });
  await audit(staff, "profile.verification.refreshed", "profile_verification", userId, { github: github?.status ?? "missing" });
  return updated;
}

/* ---------- Catalog & operations ---------- */

export async function jobsCatalog(search?: string) {
  return systemRepo().listJobs({ search, limit: 300 });
}

export async function allApplications() {
  return systemRepo().listAllApplications({ limit: 300 });
}

export async function pipelineState() {
  const repo = systemRepo();
  const [runs, jobs] = await Promise.all([repo.listIngestionRuns(25), repo.listBackgroundJobs({ limit: 60 })]);
  const enabled = new Set(enabledSources().map((s) => s.id));
  const sources = (Object.keys(SOURCE_META) as (SourceId | "sample")[])
    .filter((id): id is SourceId => id !== "sample")
    .map((id) => ({ id, name: sourceName(id), enabled: enabled.has(id), requires: SOURCE_META[id].requires }));
  return { runs, jobs, sources };
}

export async function auditTrail(entityType?: string) {
  const repo = systemRepo();
  const [logs, users] = await Promise.all([repo.listAudit({ limit: 200, entityType }), repo.listUsers({ limit: 500 })]);
  const names = new Map(users.map((u) => [u.id, u.fullName]));
  return logs.map((l) => ({ ...l, actorName: l.actorId ? (names.get(l.actorId) ?? "Unknown user") : "System" }));
}

export async function systemHealth() {
  const env = serverEnv();
  const repo = systemRepo();
  const started = Date.now();
  let dbOk = true;
  let dbError: string | null = null;
  try {
    await repo.listPlans();
  } catch (err) {
    dbOk = false;
    dbError = err instanceof Error ? err.message : String(err);
  }
  const dbLatency = Date.now() - started;
  const [queued, failed, runs] = await Promise.all([
    repo.listBackgroundJobs({ status: ["queued", "running"], limit: 500 }),
    repo.listBackgroundJobs({ status: ["failed", "dead"], limit: 500 }),
    repo.listIngestionRuns(1),
  ]);
  const ai = getAIProvider();
  const sources = enabledSources();
  return {
    checks: [
      { key: "database", label: env.dataMode === "supabase" ? "Postgres (Supabase)" : "Demo data store (in memory)", ok: dbOk, detail: dbOk ? `${dbLatency} ms round trip` : dbError },
      { key: "auth", label: "Authentication", ok: true, detail: env.dataMode === "supabase" ? "Supabase Auth" : "Signed demo sessions (data resets on restart)" },
      { key: "ai", label: "AI provider", ok: true, detail: ai.name === "anthropic" ? `Anthropic · ${ai.model}` : "Deterministic fallback (no API key set)" },
      { key: "queue", label: "Job queue", ok: failed.filter((j) => j.status === "dead").length < 5, detail: `${queued.length} pending · ${failed.length} failed` },
      { key: "ingest", label: "Job sources", ok: runs[0]?.status !== "failed", detail: `${sources.map((s) => s.name).join(", ")}${runs[0] ? ` · last run ${runs[0].status} (${sourceName(runs[0].source)})` : " · no runs yet"}` },
      { key: "skills", label: "Skill vocabularies", ok: true, detail: `Curated taxonomy · Stack Overflow tags${env.STACKEXCHANGE_KEY ? " (keyed)" : " (keyless, 300/day)"} · ESCO${env.LIGHTCAST_CLIENT_ID ? " · Lightcast" : ""}` },
      { key: "github", label: "GitHub verification", ok: true, detail: env.GITHUB_TOKEN ? "Token configured (5,000 requests/hour)" : "Keyless (60 requests/hour)" },
      { key: "cron", label: "Worker cron", ok: !!env.CRON_SECRET || env.dataMode === "demo", detail: env.CRON_SECRET ? "Secret configured" : env.dataMode === "demo" ? "In-process after() kicks" : "CRON_SECRET missing" },
    ],
    dataMode: env.dataMode,
  };
}

export async function triggerIngestion(staff: User, sourceId: string) {
  await rateLimit("pipeline", staff.id);
  if (!enabledSources().some((s) => s.id === sourceId)) throw new AppError("validation", "That source isn't enabled. Add its credentials first.");
  const bucket = Math.floor(Date.now() / 60_000);
  const { job, created } = await enqueueAndKick({ type: "ingest_source", payload: { source: sourceId }, idempotencyKey: `ingest:${sourceId}:${bucket}` });
  await audit(staff, "pipeline.ingest_triggered", "background_job", job.id, { source: sourceId, created });
  return { job, created };
}

export async function retryBackgroundJob(staff: User, jobId: string) {
  await systemRepo().retryJob(jobId);
  await audit(staff, "background_job.retried", "background_job", jobId);
  return runWorker({ limit: 5, budgetMs: 15_000 });
}

export async function updatePlan(staff: User, planId: PlanId, input: unknown) {
  if (staff.role !== "admin") throw new AppError("forbidden", "Only admins can change pricing.");
  const data = PlanUpdateSchema.parse(input);
  const plan = await systemRepo().updatePlan(planId, data);
  await audit(staff, "plan.updated", "plan", planId, data);
  return plan;
}
