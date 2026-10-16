import "server-only";
import { z } from "zod";
import { systemRepo } from "@/lib/data";
import type { SkillRequest, User } from "@/lib/domain/types";
import { AppError, fieldErrors, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { looksLikeGibberish } from "@/lib/validation/text";
import { skillKey } from "@/lib/skills/catalog";
import { verifySkill } from "@/lib/skills/verify";
import { audit } from "./audit";
import { notify } from "./notifications";

const MAX_PENDING = 10;

const RequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the skill name")
    .max(60, "Use 60 characters or fewer")
    .regex(/\p{L}/u, "Enter the skill name")
    .refine((v) => !/[<>{}\\]/.test(v), "Remove special characters"),
  context: z.string().trim().max(300, "Keep the context under 300 characters").default(""),
});

/**
 * A candidate asks staff to recognise a skill that no vocabulary lists. Obvious mashing is refused,
 * and skills that already resolve are pointed at their canonical name instead of being queued.
 */
export async function requestSkill(user: User, input: unknown): Promise<SkillRequest> {
  await rateLimit("mutation", user.id);
  const { name, context } = RequestSchema.parse(input);
  if (looksLikeGibberish(name)) throw fieldErrors({ name: `“${name}” doesn't look like a real skill` });
  const known = await verifySkill(name);
  if (known.ok) throw new AppError("conflict", `${known.term.name} is already recognised — add it from the suggestions.`);

  const repo = systemRepo();
  const mine = await repo.listSkillRequests({ userId: user.id });
  const existing = mine.find((r) => skillKey(r.name) === skillKey(name) && r.status !== "rejected");
  if (existing) return existing;
  if (mine.filter((r) => r.status === "pending").length >= MAX_PENDING) throw new AppError("rate_limited", `You can have up to ${MAX_PENDING} skills awaiting review at once.`);

  const created = await repo.createSkillRequest({ userId: user.id, name, context, status: "pending", note: "", reviewedBy: null, reviewedAt: null });
  await audit(user, "skill_request.created", "skill_request", created.id, { name });
  return created;
}

export async function mySkillRequests(user: User) {
  return systemRepo().listSkillRequests({ userId: user.id, limit: 50 });
}

/** Approved request names, cached briefly: they extend the vocabulary for every candidate. */
let approvedCache: { names: Map<string, string>; at: number } | null = null;
export async function approvedSkillNames() {
  if (approvedCache && Date.now() - approvedCache.at < 60_000) return approvedCache.names;
  const rows = await systemRepo().listSkillRequests({ status: ["approved"], limit: 5000 });
  approvedCache = { names: new Map(rows.map((r) => [skillKey(r.name), r.name])), at: Date.now() };
  return approvedCache.names;
}

export async function skillRequestQueue() {
  const repo = systemRepo();
  const [requests, users] = await Promise.all([repo.listSkillRequests({ limit: 500 }), repo.listUsers({ limit: 2000 })]);
  const names = new Map(users.map((u) => [u.id, u.fullName]));
  return requests
    .map((r) => ({ ...r, requesterName: names.get(r.userId) ?? "Deleted user", reviewerName: r.reviewedBy ? (names.get(r.reviewedBy) ?? "Staff member") : null }))
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || (a.status === "pending" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));
}

const DecisionSchema = z
  .object({ decision: z.enum(["approved", "rejected"]), note: z.string().trim().max(500) })
  .refine((d) => d.decision === "approved" || d.note.length >= 5, { path: ["note"], message: "Tell the candidate why (at least 5 characters)" });

/** Staff decision on a skill request. Approval adds the skill to the shared vocabulary. */
export async function decideSkillRequest(staff: User, id: string, input: unknown) {
  if (staff.role !== "admin" && staff.role !== "reviewer") throw new AppError("forbidden", "Only staff can review skill requests.");
  const { decision, note } = DecisionSchema.parse(input);
  const repo = systemRepo();
  const req = await repo.getSkillRequest(id);
  if (!req) throw notFound("Skill request");
  if (req.status !== "pending") throw new AppError("conflict", "This request has already been decided.");
  const updated = await repo.updateSkillRequest(id, { status: decision, note, reviewedBy: staff.id, reviewedAt: new Date().toISOString() });
  approvedCache = null;
  await audit(staff, `skill_request.${decision}`, "skill_request", id, { name: req.name, requester: req.userId, ...(note ? { note } : {}) });
  await notify(req.userId, {
    type: "system",
    title: decision === "approved" ? `“${req.name}” is now a recognised skill` : `“${req.name}” wasn't added`,
    body: decision === "approved" ? "You can add it to your profile from the skill search." : `A reviewer couldn't add it to the skill list.${note ? ` ${note}` : ""}`,
    href: "/profile#skills",
  });
  return updated;
}
