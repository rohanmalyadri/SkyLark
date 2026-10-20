import "server-only";
import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/demo-session";
import { systemRepo, userRepo } from "@/lib/data";
import type { User } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";
import { rateLimit } from "@/lib/infra/rate-limit";
import { removeAvatar, removeDocument } from "@/lib/storage";
import { createSessionClient } from "@/lib/supabase/server";
import { audit } from "./audit";

/**
 * Everything Skylark holds about the signed-in person, as JSON (data portability). Reads run as the
 * user, so in Supabase mode Row Level Security guarantees nothing belonging to anyone else is included.
 */
export async function exportMyData(user: User) {
  await rateLimit("upload", user.id);
  const repo = await userRepo();
  const [profile, resumes, matches, applications, notifications, settings, subscription, payments, verification] = await Promise.all([
    repo.getProfile(user.id),
    repo.listResumes(user.id),
    repo.listMatches(user.id, { limit: 5000 }),
    repo.listApplications(user.id),
    repo.listNotifications(user.id, 500),
    repo.getSettings(user.id),
    repo.getSubscription(user.id),
    repo.listPayments(user.id),
    repo.getVerification(user.id),
  ]);
  const skillRequests = await systemRepo().listSkillRequests({ userId: user.id });
  const events = (await Promise.all(applications.map((a) => repo.listEvents(a.id)))).flat();
  await audit(user, "privacy.data_exported", "user", user.id);
  return {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, createdAt: user.createdAt, onboardedAt: user.onboardedAt, hasProfilePhoto: !!user.avatarUrl },
    profile,
    verification: verification && { status: verification.status, note: verification.note, flags: verification.flags, publicDataFetched: verification.enrichment, submittedAt: verification.submittedAt, reviewedAt: verification.reviewedAt },
    skillRequests: skillRequests.map(({ id, name, context, status, note, createdAt, reviewedAt }) => ({ id, name, context, status, note, createdAt, reviewedAt })),
    resumes: resumes.map(({ id, name, fileName, mimeType, sizeBytes, isPrimary, parsedText, createdAt }) => ({ id, name, fileName, mimeType, sizeBytes, isPrimary, extractedText: parsedText, createdAt })),
    matches: matches.map((m) => ({ jobId: m.jobId, jobTitle: m.job.title, company: m.job.company.name, score: m.score, status: m.status, explanation: m.breakdown, createdAt: m.createdAt })),
    applications: applications.map((a) => ({ id: a.id, jobTitle: a.job.title, company: a.job.company.name, status: a.status, notes: a.notes, appliedAt: a.appliedAt, createdAt: a.createdAt })),
    applicationEvents: events,
    notifications,
    settings,
    subscription,
    payments,
  };
}

/**
 * Permanently erases the account: files in storage first, then every row the person owns.
 * Staff accounts are excluded so an operator can't lock the team out by accident.
 */
export async function deleteMyAccount(user: User, confirmation: string) {
  if (confirmation.trim() !== "DELETE") throw new AppError("validation", "Type DELETE to confirm.");
  if (user.role !== "candidate") throw new AppError("forbidden", "Staff accounts are removed by an administrator.");
  await rateLimit("auth", user.id);
  const repo = systemRepo();
  const resumes = await repo.listResumes(user.id);
  await Promise.all(resumes.map((r) => removeDocument(r.storagePath).catch((err) => logger.warn("privacy.delete.file_failed", { error: err }))));
  await removeAvatar(user.id).catch(() => undefined);
  // Record the erasure without personal details before the account disappears.
  await audit(null, "privacy.account_deleted", "user", user.id, { resumes: resumes.length });
  await repo.deleteUserData(user.id);

  if (serverEnv().dataMode === "demo") (await cookies()).delete(DEMO_SESSION_COOKIE);
  else await (await createSessionClient()).auth.signOut().catch(() => undefined);
}
