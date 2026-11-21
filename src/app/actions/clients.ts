"use server";

import { z } from "zod";
import { STAFF_ROLES } from "@/lib/auth/dal";
import { ClientAccountLinkSchema, ClientInputSchema, ClientMessageSchema, ClientNoteSchema, ClientPatchSchema, MyMessageSchema } from "@/lib/domain/schemas";
import type { User } from "@/lib/domain/types";
import * as clients from "@/lib/services/clients";
import * as supportChat from "@/lib/services/support-chat";
import { run } from "./_wrap";

const STAFF = [...STAFF_ROLES] as User["role"][];
const id = z.string().min(1).max(64);

export async function createClientAction(input: unknown) {
  return run("client.create", async (u) => ({ id: (await clients.createClient(u, ClientInputSchema.parse(input))).id }), { roles: STAFF, message: "Client added" });
}

export async function updateClientAction(clientId: string, input: unknown) {
  return run("client.update", async (u) => void (await clients.updateClient(u, id.parse(clientId), ClientPatchSchema.parse(input))), { roles: STAFF, message: "Client updated" });
}

export async function deleteClientAction(clientId: string) {
  return run("client.delete", (u) => clients.deleteClient(u, id.parse(clientId)), { roles: ["admin"], message: "Client deleted" });
}

export async function sendClientMessageAction(input: unknown) {
  return run("client.message", async (u) => {
    const m = await clients.addMessage(u, ClientMessageSchema.parse(input));
    return { id: m.id, createdAt: m.createdAt };
  }, { roles: STAFF });
}

export async function markClientReadAction(clientId: string) {
  return run("client.read", (u) => clients.markRead(u, id.parse(clientId)), { roles: STAFF });
}

export async function addClientNoteAction(input: unknown) {
  return run("client.note", async (u) => void (await clients.addNote(u, ClientNoteSchema.parse(input))), { roles: STAFF, message: "Note saved" });
}

export async function linkClientAccountAction(input: unknown) {
  return run("client.link", async (u) => {
    const data = ClientAccountLinkSchema.parse(input);
    return supportChat.linkAccount(u, data.clientId, data.email);
  }, { roles: STAFF, message: "Account link updated" });
}

/* ---------- the user's side: their own conversation with the team ---------- */

export async function sendMyMessageAction(input: unknown) {
  return run("support.message", async (u) => {
    const m = await supportChat.sendMyMessage(u, MyMessageSchema.parse(input).body);
    return { id: m.id, createdAt: m.createdAt };
  });
}

export async function markMyMessagesReadAction() {
  return run("support.read", (u) => supportChat.markMyMessagesRead(u));
}
