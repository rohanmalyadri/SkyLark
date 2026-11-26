import { describe, expect, it } from "vitest";
import type { Client, ClientMessage } from "@/lib/domain/types";
import { summarizeClients, threadSummaries } from "./client-stats";

const NOW = "2026-11-19T12:00:00.000Z";
const hoursAgo = (h: number) => new Date(Date.parse(NOW) - h * 3_600_000).toISOString();

const client = (id: string, over: Partial<Client>): Client => ({
  id,
  name: `Client ${id}`,
  email: "",
  phone: "",
  company: "",
  city: "",
  status: "active",
  amount: null,
  currency: "INR",
  paymentStatus: "unpaid",
  paymentSource: "manual",
  paidAt: null,
  paymentMethod: null,
  paymentReference: null,
  userId: null,
  lastInteractionAt: null,
  createdAt: hoursAgo(100),
  updatedAt: hoursAgo(100),
  ...over,
});

const message = (id: string, clientId: string, direction: ClientMessage["direction"], ago: number, read: boolean): ClientMessage => ({
  id,
  clientId,
  direction,
  authorName: "x",
  authorId: null,
  body: "x",
  sample: false,
  readAt: read ? hoursAgo(ago) : null,
  createdAt: hoursAgo(ago),
});

const clients = [
  client("a", { amount: 4000, paymentStatus: "paid" }),
  client("b", { amount: 6000, paymentStatus: "paid", paymentSource: "gateway" }),
  client("c", { status: "in_discussion" }),
  client("d", { status: "lead", amount: 2500, paymentStatus: "pending" }),
];
const messages = [message("1", "c", "inbound", 5, false), message("2", "c", "inbound", 4, false), message("3", "a", "outbound", 3, false), message("4", "a", "inbound", 30, true)];

describe("client dashboard totals", () => {
  const summary = summarizeClients(clients, messages, NOW);

  it("adds up paid revenue from the records", () => {
    expect(summary.revenue).toBe(10000);
    expect(summary.averageDeal).toBe(5000);
  });

  it("counts clients by status and payment", () => {
    expect(summary.totalClients).toBe(4);
    expect(summary.paidClients).toBe(2);
    expect(summary.pendingDiscussions).toBe(2);
    expect(summary.byPayment.pending.count).toBe(1);
    expect(summary.outstanding).toBe(2500);
  });

  it("only counts gateway-confirmed money as verified", () => {
    expect(summary.verifiedRevenue).toBe(6000);
  });

  it("counts unread client messages, not the team's own", () => {
    expect(summary.unread).toBe(2);
    expect(threadSummaries(clients, messages).find((t) => t.client.id === "c")!.unread).toBe(2);
  });

  it("is empty and zero with no clients", () => {
    const empty = summarizeClients([], [], NOW);
    expect([empty.totalClients, empty.revenue, empty.averageDeal, empty.unread]).toEqual([0, 0, 0, 0]);
  });

  it("recomputes when a record changes", () => {
    const changed = clients.map((c) => (c.id === "c" ? { ...c, amount: 9000, paymentStatus: "paid" as const } : c));
    expect(summarizeClients(changed, [], NOW).revenue).toBe(19000);
  });
});
