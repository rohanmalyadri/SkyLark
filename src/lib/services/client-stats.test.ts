import { describe, expect, it } from "vitest";
import { buildClientSeed } from "@/lib/seed/clients";
import { summarizeClients, threadSummaries } from "./client-stats";

const NOW = Date.parse("2026-11-19T12:00:00Z");

describe("client dashboard totals", () => {
  const seed = buildClientSeed(NOW);
  const summary = summarizeClients(seed.clients, seed.messages, new Date(NOW).toISOString());

  it("adds up paid revenue from the records", () => {
    expect(summary.revenue).toBe(4572 + 13902);
    expect(summary.revenue).toBe(18474);
  });

  it("counts clients by status and payment", () => {
    expect(summary.totalClients).toBe(3);
    expect(summary.paidClients).toBe(2);
    expect(summary.pendingDiscussions).toBe(1);
    expect(summary.byPayment.unpaid.count).toBe(1);
    expect(summary.averageDeal).toBe(9237);
  });

  it("never counts staff-entered payments as gateway verified", () => {
    expect(summary.verifiedRevenue).toBe(0);
    expect(seed.clients.every((c) => c.paymentSource === "manual" && c.paymentReference === null && c.paidAt === null)).toBe(true);
  });

  it("leaves Shashank unpaid with no agreed amount", () => {
    const shashank = seed.clients.find((c) => c.name === "Shashank Gorra")!;
    expect(shashank.paymentStatus).toBe("unpaid");
    expect(shashank.status).toBe("in_discussion");
    expect(shashank.amount).toBeNull();
    expect(summary.outstanding).toBe(0);
  });

  it("marks every seeded message as a sample and tracks unread per thread", () => {
    expect(seed.messages.every((m) => m.sample)).toBe(true);
    const threads = threadSummaries(seed.clients, seed.messages);
    expect(threads.map((t) => t.unread).reduce((a, b) => a + b, 0)).toBe(summary.unread);
    expect(threads.find((t) => t.client.name === "Shashank Gorra")!.unread).toBe(2);
  });

  it("recomputes when a record changes", () => {
    const clients = seed.clients.map((c) => (c.name === "Shashank Gorra" ? { ...c, amount: 9000, paymentStatus: "paid" as const } : c));
    expect(summarizeClients(clients, [], new Date(NOW).toISOString()).revenue).toBe(27474);
  });
});
