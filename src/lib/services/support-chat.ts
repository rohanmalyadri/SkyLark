import "server-only";
import { systemRepo } from "@/lib/data";
import { isStaff } from "@/lib/auth/dal";
import type { Client, ClientMessage, User } from "@/lib/domain/types";
import { AppError } from "@/lib/infra/errors";
import { logger } from "@/lib/infra/logger";
import { audit } from "./audit";

/*
 * The user's side of the CRM: one conversation with the team, from the Messages page.
 * Every call is keyed on the signed-in account, never on an id from the browser, so a user
 * can only ever reach their own client record.
 *
 * Accounts are never linked to an existing client by matching email: sign-up doesn't prove
 * someone owns an address, and a match would hand them that client's history. Staff link an
 * account to an existing client deliberately (linkAccount below); otherwise a user's first
 * message opens a fresh client record.
 */

/** Demo illustrations are for the staff view only; the user sees real messages. */
const visible = (messages: ClientMessage[]) => messages.filter((m) => !m.sample);

function assertUser(user: User) {
  if (isStaff(user)) throw new AppError("forbidden", "Staff accounts use the client inbox instead.");
}

export async function myConversation(user: User) {
  assertUser(user);
  const repo = systemRepo();
  const client = await repo.getClientByUserId(user.id);
  if (!client) return { client: null, messages: [] as ClientMessage[] };
  return { client, messages: visible(await repo.listClientMessages({ clientId: client.id })) };
}

export async function myUnreadCount(user: User) {
  if (isStaff(user)) return 0;
  const repo = systemRepo();
  const client = await repo.getClientByUserId(user.id);
  if (!client) return 0;
  return visible(await repo.listClientMessages({ clientId: client.id })).filter((m) => m.direction === "outbound" && !m.readAt).length;
}

async function clientFor(user: User): Promise<Client> {
  const repo = systemRepo();
  const existing = await repo.getClientByUserId(user.id);
  if (existing) return existing;
  const client = await repo.createClient({
    name: user.fullName,
    email: user.email,
    phone: "",
    company: "",
    city: "",
    status: "lead",
    currency: "INR",
    amount: null,
    paymentStatus: "unpaid",
    paymentSource: "manual",
    paidAt: null,
    paymentMethod: null,
    paymentReference: null,
    userId: user.id,
    lastInteractionAt: null,
  });
  await audit(user, "client.self_created", "client", client.id, {});
  logger.info("client.self_created", { clientId: client.id });
  return client;
}

export async function sendMyMessage(user: User, body: string) {
  assertUser(user);
  const client = await clientFor(user);
  return systemRepo().addClientMessage({
    clientId: client.id,
    direction: "inbound",
    authorName: user.fullName,
    authorId: user.id,
    body,
    sample: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  });
}

export async function markMyMessagesRead(user: User) {
  assertUser(user);
  const repo = systemRepo();
  const client = await repo.getClientByUserId(user.id);
  return client ? repo.markClientMessagesRead(client.id, new Date().toISOString(), "outbound") : 0;
}

/** Staff: connect a client record to the account it belongs to, or disconnect it (email ""). */
export async function linkAccount(staff: User, clientId: string, email: string) {
  if (!isStaff(staff)) throw new AppError("forbidden", "Only staff can link accounts.");
  const repo = systemRepo();
  const client = await repo.getClient(clientId);
  if (!client) throw new AppError("not_found", "Client not found");

  if (!email) {
    if (client.userId) {
      await repo.updateClient(clientId, { userId: null });
      await audit(staff, "client.account_unlinked", "client", clientId, {});
    }
    return null;
  }
  const account = await repo.getUserByEmail(email);
  if (!account) throw new AppError("validation", "No Skylark account uses that email. Ask the client to sign up first.", { fieldErrors: { email: ["No account with this email"] } });
  if (isStaff(account)) throw new AppError("validation", "That's a staff account. Link the client's own account.", { fieldErrors: { email: ["That's a staff account"] } });
  const taken = await repo.getClientByUserId(account.id);
  if (taken && taken.id !== clientId) {
    throw new AppError("conflict", `That account already has its own client record (${taken.name}). Delete or unlink that record first.`);
  }
  await repo.updateClient(clientId, { userId: account.id });
  await audit(staff, "client.account_linked", "client", clientId, { userId: account.id });
  return { name: account.fullName, email: account.email };
}
