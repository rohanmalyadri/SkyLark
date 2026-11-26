import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/lib/domain/types";

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
  delete (globalThis as { __skylarkCrm?: unknown }).__skylarkCrm;
  delete (globalThis as { __skylarkCrmWritable?: unknown }).__skylarkCrmWritable;
  process.env.CRM_DEMO_FILE = join(mkdtempSync(join(tmpdir(), "crm-")), "crm.json");
});

async function setup() {
  const { systemRepo } = await import("@/lib/data");
  const repo = systemRepo();
  const mk = (role: User["role"], email: string, fullName: string) => repo.createUser({ email, fullName, role, avatarUrl: null, onboardedAt: new Date().toISOString() });
  const user = await mk("candidate", `u${Math.random()}@example.org`, "Meera Iyer");
  const other = await mk("candidate", `o${Math.random()}@example.org`, "Arjun Rao");
  const staff = await mk("admin", `s${Math.random()}@example.org`, "Ops Person");
  return { repo, user, other, staff, chat: await import("./support-chat"), clients: await import("./clients") };
}

const newClient = (name: string) => ({
  name,
  email: "",
  phone: "",
  company: "",
  city: "",
  status: "active" as const,
  currency: "INR" as const,
  amount: null,
  paymentStatus: "unpaid" as const,
  paymentSource: "manual" as const,
  paidAt: null,
  paymentMethod: null,
  paymentReference: null,
  userId: null,
  lastInteractionAt: null,
});

describe("user ↔ team chat", () => {
  it("opens one client record per account on the first message and reuses it", async () => {
    const { repo, user, chat } = await setup();
    expect((await chat.myConversation(user)).client).toBeNull();

    await chat.sendMyMessage(user, "Hi, which plan suits a fresher?");
    await chat.sendMyMessage(user, "Also, how long does onboarding take?");

    const { client, messages } = await chat.myConversation(user);
    expect(client).toMatchObject({ name: "Meera Iyer", userId: user.id, status: "lead", paymentStatus: "unpaid", paymentSource: "manual" });
    expect(messages.map((m) => m.direction)).toEqual(["inbound", "inbound"]);
    expect((await repo.listClients()).filter((c) => c.userId === user.id)).toHaveLength(1);
  });

  it("delivers staff replies to the user with a notification and an unread count", async () => {
    const { repo, user, staff, chat, clients } = await setup();
    await chat.sendMyMessage(user, "Hello");
    const { client } = await chat.myConversation(user);

    await clients.addMessage(staff, { clientId: client!.id, body: "Hi Meera, happy to help.", direction: "outbound" });
    expect(await chat.myUnreadCount(user)).toBe(1);
    const notes = await repo.listNotifications(user.id);
    expect(notes[0]).toMatchObject({ href: "/messages", title: "New message from Ops Person" });

    await chat.markMyMessagesRead(user);
    expect(await chat.myUnreadCount(user)).toBe(0);
    // Replying marked the user's message read for staff too.
    expect((await repo.listClientMessages({ clientId: client!.id })).find((m) => m.direction === "inbound")!.readAt).not.toBeNull();
  });

  it("keeps each user to their own conversation", async () => {
    const { user, other, chat } = await setup();
    await chat.sendMyMessage(user, "Private question");
    expect((await chat.myConversation(other)).messages).toHaveLength(0);
  });

  it("never links by matching email, and hides sample messages from the user", async () => {
    const { repo, user, staff, chat } = await setup();
    const seeded = await repo.createClient(newClient("Existing Client"));
    await repo.addClientMessage({ clientId: seeded.id, direction: "outbound", authorName: "Team", authorId: null, body: "Illustration", sample: true, readAt: null });
    await repo.updateClient(seeded.id, { email: user.email });
    expect((await chat.myConversation(user)).client).toBeNull();

    await chat.linkAccount(staff, seeded.id, user.email);
    const { client, messages } = await chat.myConversation(user);
    expect(client!.id).toBe(seeded.id);
    expect(messages).toHaveLength(0);
  });

  it("refuses staff accounts and accounts that already have a client", async () => {
    const { repo, user, staff, chat } = await setup();
    const a = await repo.createClient(newClient("Client A"));
    const b = await repo.createClient(newClient("Client B"));
    await expect(chat.linkAccount(staff, a!.id, staff.email)).rejects.toThrow(/staff account/);
    await chat.linkAccount(staff, a!.id, user.email);
    await expect(chat.linkAccount(staff, b!.id, user.email)).rejects.toThrow(/already has its own client record/);
    await expect(chat.sendMyMessage(staff, "hi")).rejects.toThrow(/Staff accounts/);
  });
});
