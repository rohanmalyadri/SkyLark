import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
});

describe("matchCandidate", () => {
  it("scores every active job, not just the first page of the catalog", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { memoryStore } = await import("@/lib/data/memory");
    const { DEMO_CANDIDATE_KEY, userIdByKey } = await import("@/lib/seed/people");
    const { matchCandidate } = await import("./service");
    const userId = userIdByKey(DEMO_CANDIDATE_KEY);

    // Find a job this candidate matches, then bury 5,200 copies of it behind newer listings,
    // more than the old 5,000-job cap.
    await matchCandidate(userId);
    const [best] = await systemRepo().listMatches(userId, { limit: 1 });
    expect(best).toBeDefined();
    const store = memoryStore();
    const template = store.jobs.find((j) => j.id === best!.jobId)!;
    const old = new Date("2020-01-01T00:00:00Z").toISOString();
    for (let i = 0; i < 5200; i++) {
      store.jobs.push({ ...structuredClone(template), id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, fingerprint: `copy-${i}`, externalId: `copy-${i}`, postedAt: old });
    }

    const result = await matchCandidate(userId);
    const matches = await systemRepo().listMatches(userId, { limit: 10_000 });
    const copies = matches.filter((m) => m.jobId.startsWith("00000000-0000-4000-8000-"));
    expect(copies).toHaveLength(5200);
    expect(result.scored).toBeGreaterThanOrEqual(5200);
  });
});
