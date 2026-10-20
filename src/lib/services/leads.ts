import "server-only";
import { systemRepo } from "@/lib/data";
import type { Lead, LeadStatus, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { rateLimit } from "@/lib/infra/rate-limit";
import { logger } from "@/lib/infra/logger";
import { audit } from "./audit";
import { isStaff } from "@/lib/auth/dal";

/*
 * "Ask us to get in touch" from the marketing site. This is the one write path open to
 * people who aren't signed in, so it is rate limited by IP and never reflects anything
 * back to the browser beyond a thank-you.
 */

export async function captureLead(input: Omit<Lead, "id" | "status" | "ownerId" | "note" | "createdAt" | "updatedAt">, ip: string | null) {
  // Keyed by IP because there is no account yet; a shared office IP gets a generous ceiling.
  await rateLimit("lead", ip ?? "anonymous");
  const repo = systemRepo();
  const lead = await repo.createLead({
    ...input,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    city: input.city.trim(),
    message: input.message.trim(),
    promoCode: input.promoCode.trim().toUpperCase(),
    status: "new",
    ownerId: null,
    note: "",
  });
  logger.info("lead.captured", { source: lead.source, hasPromo: Boolean(lead.promoCode) });
  return { id: lead.id };
}

export async function listLeads(staff: User, opts: { status?: LeadStatus[]; search?: string } = {}) {
  if (!isStaff(staff)) throw new AppError("forbidden", "Only staff can see leads.");
  return systemRepo().listLeads({ ...opts, limit: 200 });
}

export async function updateLead(staff: User, id: string, patch: { status?: LeadStatus; note?: string; claim?: boolean }) {
  if (!isStaff(staff)) throw new AppError("forbidden", "Only staff can update leads.");
  const repo = systemRepo();
  const existing = (await repo.listLeads({ limit: 1000 })).find((l) => l.id === id);
  if (!existing) throw notFound("Lead");
  const updated = await repo.updateLead(id, {
    ...(patch.status ? { status: patch.status } : {}),
    ...(patch.note !== undefined ? { note: patch.note.trim() } : {}),
    ...(patch.claim ? { ownerId: staff.id } : {}),
  });
  await audit(staff, "lead.updated", "lead", id, { status: updated.status });
  return updated;
}
