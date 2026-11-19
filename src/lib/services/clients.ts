import "server-only";
import { z } from "zod";
import { isStaff } from "@/lib/auth/dal";
import { systemRepo } from "@/lib/data";
import type { ClientPatch, ClientQuery } from "@/lib/data/repository";
import type { ClientInputSchema, ClientMessageSchema, ClientNoteSchema, ClientPatchSchema } from "@/lib/domain/schemas";
import type { Client, User } from "@/lib/domain/types";
import { AppError, notFound } from "@/lib/infra/errors";
import { audit } from "./audit";
import { summarizeClients, threadSummaries } from "./client-stats";

/*
 * The admin CRM: clients, what they paid, and the conversation with them. Staff only.
 * Payment statuses entered here are always recorded as "manual": nothing in this module
 * can claim a payment gateway confirmed money it never saw.
 */

const ADMIN_ONLY = new AppError("forbidden", "Only an administrator can delete clients.");

function assertStaff(user: User) {
  if (!isStaff(user)) throw new AppError("forbidden", "Only staff can manage clients.");
}

/** A date input's YYYY-MM-DD, stored at midday IST so it reads as the same day in India. */
const paidOnToIso = (paidOn: string) => (paidOn ? new Date(`${paidOn}T12:00:00+05:30`).toISOString() : null);

function paymentFields(input: Partial<z.infer<typeof ClientInputSchema>>, existing: Client | null): ClientPatch {
  const touchesPayment = input.paymentStatus !== undefined || input.amount !== undefined || input.paidOn !== undefined || input.paymentMethod !== undefined;
  if (!touchesPayment) return {};
  if (existing?.paymentSource === "gateway") {
    throw new AppError("conflict", "This payment was confirmed by the payment gateway, so it can't be changed by hand.");
  }
  const status = input.paymentStatus ?? existing?.paymentStatus ?? "unpaid";
  const paid = status === "paid" || status === "refunded";
  return {
    ...(input.amount !== undefined ? { amount: input.amount } : {}),
    paymentStatus: status,
    paymentSource: "manual",
    paymentReference: null,
    // A date or method only means something once money moved; clear them otherwise.
    paidAt: paid ? (input.paidOn !== undefined ? paidOnToIso(input.paidOn) : (existing?.paidAt ?? null)) : null,
    paymentMethod: paid ? (input.paymentMethod !== undefined ? input.paymentMethod || null : (existing?.paymentMethod ?? null)) : null,
  };
}

export async function crmOverview(staff: User) {
  assertStaff(staff);
  const repo = systemRepo();
  const [clients, messages] = await Promise.all([repo.listClients(), repo.listClientMessages()]);
  const now = new Date().toISOString();
  const threads = threadSummaries(clients, messages);
  return {
    now,
    clients,
    threads,
    summary: summarizeClients(clients, messages, now),
    latestInbound: messages
      .filter((m) => m.direction === "inbound")
      .slice(-6)
      .reverse()
      .map((m) => ({ ...m, clientName: clients.find((c) => c.id === m.clientId)?.name ?? m.authorName })),
  };
}

export async function listClients(staff: User, query: ClientQuery = {}) {
  assertStaff(staff);
  const repo = systemRepo();
  const [clients, messages] = await Promise.all([repo.listClients(query), repo.listClientMessages()]);
  return threadSummaries(clients, messages);
}

export async function clientDetail(staff: User, id: string) {
  assertStaff(staff);
  const repo = systemRepo();
  const client = await repo.getClient(id);
  if (!client) throw notFound("Client");
  const [messages, notes] = await Promise.all([repo.listClientMessages({ clientId: id }), repo.listClientNotes(id)]);
  return { client, messages, notes };
}

export async function inbox(staff: User) {
  assertStaff(staff);
  const repo = systemRepo();
  const [clients, messages] = await Promise.all([repo.listClients(), repo.listClientMessages()]);
  return { threads: threadSummaries(clients, messages), messages };
}

export async function createClient(staff: User, input: z.infer<typeof ClientInputSchema>) {
  assertStaff(staff);
  const client = await systemRepo().createClient({
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    city: input.city,
    status: input.status,
    currency: "INR",
    amount: null,
    paymentStatus: "unpaid",
    paymentSource: "manual",
    paidAt: null,
    paymentMethod: null,
    paymentReference: null,
    lastInteractionAt: null,
    ...paymentFields(input, null),
  });
  await audit(staff, "client.created", "client", client.id, { status: client.status, paymentStatus: client.paymentStatus });
  return client;
}

export async function updateClient(staff: User, id: string, input: z.infer<typeof ClientPatchSchema>) {
  assertStaff(staff);
  const repo = systemRepo();
  const existing = await repo.getClient(id);
  if (!existing) throw notFound("Client");
  const patch: ClientPatch = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.email !== undefined ? { email: input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.company !== undefined ? { company: input.company } : {}),
    ...(input.city !== undefined ? { city: input.city } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...paymentFields(input, existing),
  };
  const updated = await repo.updateClient(id, patch);
  const changed = Object.keys(patch).filter((k) => JSON.stringify(patch[k as keyof ClientPatch]) !== JSON.stringify(existing[k as keyof Client]));
  if (changed.length) await audit(staff, "client.updated", "client", id, { changed, status: updated.status, paymentStatus: updated.paymentStatus });
  return updated;
}

export async function deleteClient(staff: User, id: string) {
  if (staff.role !== "admin") throw ADMIN_ONLY;
  const repo = systemRepo();
  const existing = await repo.getClient(id);
  if (!existing) throw notFound("Client");
  await repo.deleteClient(id);
  await audit(staff, "client.deleted", "client", id, {});
}

export async function addMessage(staff: User, input: z.infer<typeof ClientMessageSchema>) {
  assertStaff(staff);
  const repo = systemRepo();
  const client = await repo.getClient(input.clientId);
  if (!client) throw notFound("Client");
  const inbound = input.direction === "inbound";
  const now = new Date().toISOString();
  const message = await repo.addClientMessage({
    clientId: client.id,
    direction: input.direction,
    authorName: inbound ? client.name : staff.fullName,
    authorId: inbound ? null : staff.id,
    body: input.body,
    sample: false,
    // Staff logging a client's words have, by definition, read them.
    readAt: inbound ? now : null,
    createdAt: now,
  });
  // Replying means the thread has been read.
  if (!inbound) await repo.markClientMessagesRead(client.id, now);
  return message;
}

export async function markRead(staff: User, clientId: string) {
  assertStaff(staff);
  return systemRepo().markClientMessagesRead(clientId, new Date().toISOString());
}

export async function addNote(staff: User, input: z.infer<typeof ClientNoteSchema>) {
  assertStaff(staff);
  const repo = systemRepo();
  if (!(await repo.getClient(input.clientId))) throw notFound("Client");
  const note = await repo.addClientNote({ clientId: input.clientId, authorId: staff.id, authorName: staff.fullName, body: input.body });
  await audit(staff, "client.note_added", "client", input.clientId, {});
  return note;
}
