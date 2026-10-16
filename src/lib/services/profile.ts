import "server-only";
import { randomUUID } from "node:crypto";
import { withFallback } from "@/lib/ai";
import { emptyProfile } from "@/lib/ai/heuristic";
import { systemRepo, userRepo } from "@/lib/data";
import { ProfileSchema } from "@/lib/domain/schemas";
import type { CandidateProfile, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { enqueueAndKick } from "@/lib/pipeline/queue";
import { ALLOWED_DOCUMENT_TYPES, MAX_AVATAR_BYTES, MAX_DOCUMENT_BYTES, extractText, putAvatar, putDocument, removeAvatar, removeDocument, sniffDocumentType, sniffImageType } from "@/lib/storage";
import { audit } from "./audit";
import { matchCandidate } from "./matching/service";
import { checkReferenceData, recordSubmission, resolveGithub } from "./verification";

export async function getProfileBundle(user: User) {
  const repo = await userRepo();
  const [profile, resumes, verification] = await Promise.all([repo.getProfile(user.id), repo.listResumes(user.id), repo.getVerification(user.id)]);
  return { profile: profile ?? emptyProfile(user.id, new Date().toISOString()), resumes, hasProfile: !!profile, verification };
}

/** Shared save path: schema → reference data → GitHub → persist → verification record. */
async function saveValidated(user: User, input: unknown, opts: { onboarding: boolean }) {
  const parsed = ProfileSchema.parse(input);
  const data = await checkReferenceData(parsed, { requireLocation: opts.onboarding });
  const repo = await userRepo();
  const [current, verification, resumes] = await Promise.all([repo.getProfile(user.id), systemRepo().getVerification(user.id), repo.listResumes(user.id)]);
  const github = await resolveGithub(user, data.links.github, verification?.enrichment.github);
  const base = current ?? emptyProfile(user.id, new Date().toISOString());
  const next: CandidateProfile = { ...base, ...data, links: data.links, userId: user.id, updatedAt: new Date().toISOString() };
  const saved = await repo.upsertProfile(next);
  const record = await recordSubmission(user, saved, github, { hasResume: resumes.length > 0 });
  return { saved, verification: record };
}

export async function updateProfile(user: User, input: unknown) {
  const { saved, verification } = await saveValidated(user, input, { onboarding: false });
  await audit(user, "profile.updated", "candidate_profile", user.id, { verification: verification.status, flags: verification.flags.map((f) => f.code) });
  // Re-rank in the background; the debounce window collapses rapid successive edits into one job.
  const bucket = Math.floor(Date.now() / 60_000);
  await enqueueAndKick({ type: "match_candidate", payload: { userId: user.id }, idempotencyKey: `match_candidate:${user.id}:${bucket}` });
  return saved;
}

export async function completeOnboarding(user: User, input: unknown) {
  const { verification } = await saveValidated(user, input, { onboarding: true });
  await (await userRepo()).updateUser(user.id, { onboardedAt: new Date().toISOString() });
  // First ranking runs inline so the dashboard is populated the moment onboarding finishes.
  const result = await matchCandidate(user.id);
  await audit(user, "onboarding.completed", "user", user.id, { matches: result.scored, verification: verification.status });
  return result;
}

export async function uploadResume(user: User, file: File, opts: { name?: string; makePrimary?: boolean } = {}) {
  await rateLimit("upload", user.id);
  if (!file || file.size === 0) throw new AppError("validation", "Choose a file to upload.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new AppError("validation", "Files must be 5 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffDocumentType(bytes, file.type);
  if (!mime || !ALLOWED_DOCUMENT_TYPES[mime]) throw new AppError("validation", "Upload a PDF, DOCX or plain-text resume.");

  const id = randomUUID();
  // Server-generated object key: never trust the client file name for paths.
  const path = `${user.id}/${id}.${ALLOWED_DOCUMENT_TYPES[mime]}`;
  await putDocument(path, bytes, mime);
  const parsedText = await extractText(bytes, mime);

  const repo = await userRepo();
  const existing = await repo.listResumes(user.id);
  const safeName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || "resume";
  const resume = await repo.createResume({
    id,
    userId: user.id,
    name: (opts.name?.trim() || safeName.replace(/\.[a-z]+$/i, "")).slice(0, 120),
    fileName: safeName,
    storagePath: path,
    mimeType: mime,
    sizeBytes: file.size,
    isPrimary: opts.makePrimary ?? existing.length === 0,
    parsedText,
  });
  await audit(user, "resume.uploaded", "resume", resume.id, { sizeBytes: file.size, mime });

  let extracted = null;
  if (parsedText) {
    extracted = (await withFallback("extract_resume", (p) => p.extractResume(parsedText))).result;
  }
  return { resume, extracted };
}

export async function deleteResume(user: User, resumeId: string) {
  const repo = await userRepo();
  const resume = await repo.getResume(user.id, resumeId);
  if (!resume) throw notFound("Resume");
  await repo.deleteResume(user.id, resumeId);
  await removeDocument(resume.storagePath).catch(() => undefined);
  if (resume.isPrimary) {
    const next = (await repo.listResumes(user.id))[0];
    if (next) await repo.setPrimaryResume(user.id, next.id);
  }
  await audit(user, "resume.deleted", "resume", resumeId);
}

export async function setPrimaryResume(user: User, resumeId: string) {
  const repo = await userRepo();
  if (!(await repo.getResume(user.id, resumeId))) throw notFound("Resume");
  await repo.setPrimaryResume(user.id, resumeId);
}

export async function rematchNow(user: User) {
  await rateLimit("mutation", user.id);
  return matchCandidate(user.id);
}

export async function uploadAvatar(user: User, file: File) {
  await rateLimit("upload", user.id);
  if (!file || file.size === 0) throw new AppError("validation", "Choose an image to upload.");
  if (file.size > MAX_AVATAR_BYTES) throw new AppError("validation", "Images must be 1 MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImageType(bytes);
  if (!mime) throw new AppError("validation", "Upload a PNG, JPEG or WebP image.");
  const url = await putAvatar(user.id, bytes, mime);
  await (await userRepo()).updateUser(user.id, { avatarUrl: url });
  await audit(user, "avatar.updated", "user", user.id, { sizeBytes: file.size, mime });
  return url;
}

export async function deleteAvatar(user: User) {
  await removeAvatar(user.id);
  await (await userRepo()).updateUser(user.id, { avatarUrl: null });
  await audit(user, "avatar.removed", "user", user.id);
}
