import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ delete: vi.fn(), get: () => undefined, set: vi.fn() }), headers: async () => new Headers() }));

const fetchMock = vi.fn();
const json = (body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
  fetchMock.mockReset();
  // No vocabulary knows these test skills.
  fetchMock.mockImplementation((url: string) => (url.includes("stackexchange") ? json({ items: [] }) : json({ _embedded: { results: [] } })));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

async function people() {
  const { systemRepo } = await import("@/lib/data");
  const repo = systemRepo();
  const candidate = await repo.createUser({ email: `c${Math.random()}@example.org`, fullName: "Casey Candidate", role: "candidate", avatarUrl: null, onboardedAt: null });
  const other = await repo.createUser({ email: `o${Math.random()}@example.org`, fullName: "Other Person", role: "candidate", avatarUrl: null, onboardedAt: null });
  const reviewer = await repo.createUser({ email: `r${Math.random()}@example.org`, fullName: "Riley Reviewer", role: "reviewer", avatarUrl: null, onboardedAt: null });
  return { repo, candidate, other, reviewer };
}

describe("spelling suggestions", () => {
  it("suggests the closest recognised skill", async () => {
    const { spellingSuggestions } = await import("@/lib/skills/catalog");
    expect(spellingSuggestions("Kubernets")[0]?.name).toBe("Kubernetes");
    expect(spellingSuggestions("Pyhton")[0]?.name).toBe("Python");
    expect(spellingSuggestions("Stakeholder managment")[0]?.name).toBe("Stakeholder management");
    expect(spellingSuggestions("jhfavd")).toEqual([]);
  });

  it("includes a did-you-mean hint when verification fails", async () => {
    const { verifySkill } = await import("@/lib/skills/verify");
    expect(await verifySkill("Kubernets")).toMatchObject({ ok: false, message: expect.stringMatching(/did you mean Kubernetes/) });
  });
});

describe("skill review requests", () => {
  it("queues unknown skills, refuses gibberish and known skills", async () => {
    const { candidate } = await people();
    const { requestSkill } = await import("./skills");
    const req = await requestSkill(candidate, { name: "Hyperbaric welding", context: "Offshore certification" });
    expect(req).toMatchObject({ status: "pending", name: "Hyperbaric welding" });
    expect((await requestSkill(candidate, { name: "hyperbaric welding" })).id).toBe(req.id);
    await expect(requestSkill(candidate, { name: "jhfavd" })).rejects.toMatchObject({ code: "validation" });
    await expect(requestSkill(candidate, { name: "TypeScript" })).rejects.toMatchObject({ code: "conflict" });
  });

  it("lets only staff decide, and approval extends the vocabulary for everyone", async () => {
    const { candidate, other, reviewer } = await people();
    const { requestSkill, decideSkillRequest } = await import("./skills");
    const req = await requestSkill(candidate, { name: "Hyperbaric welding" });
    await expect(decideSkillRequest(candidate, req.id, { decision: "approved", note: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(decideSkillRequest(reviewer, req.id, { decision: "rejected", note: "" })).rejects.toThrow();
    await decideSkillRequest(reviewer, req.id, { decision: "approved", note: "" });
    await expect(decideSkillRequest(reviewer, req.id, { decision: "rejected", note: "Changed my mind" })).rejects.toMatchObject({ code: "conflict" });

    const { verifySkill } = await import("@/lib/skills/verify");
    expect(await verifySkill("hyperbaric welding")).toMatchObject({ ok: true, term: { name: "Hyperbaric welding" } });
    void other;
    const { systemRepo } = await import("@/lib/data");
    const trail = await systemRepo().listAudit({ entityType: "skill_request", entityId: req.id });
    expect(trail.map((a) => a.action)).toEqual(expect.arrayContaining(["skill_request.created", "skill_request.approved"]));
  });
});

describe("privacy controls", () => {
  it("exports only the requester's own data", async () => {
    const { repo, candidate, other } = await people();
    const { emptyProfile } = await import("@/lib/ai/heuristic");
    await repo.upsertProfile({ ...emptyProfile(candidate.id, new Date().toISOString()), headline: "Mine" });
    await repo.upsertProfile({ ...emptyProfile(other.id, new Date().toISOString()), headline: "Not mine" });
    const { exportMyData } = await import("./privacy");
    const data = await exportMyData(candidate);
    expect(data.account.email).toBe(candidate.email);
    expect(data.profile?.headline).toBe("Mine");
    expect(JSON.stringify(data)).not.toContain(other.email);
    expect(JSON.stringify(data)).not.toContain("Not mine");
  });

  it("erases an account after explicit confirmation, keeping an anonymous audit record", async () => {
    const { repo, candidate, reviewer } = await people();
    const { emptyProfile } = await import("@/lib/ai/heuristic");
    await repo.upsertProfile({ ...emptyProfile(candidate.id, new Date().toISOString()), headline: "Mine" });
    const { deleteMyAccount } = await import("./privacy");
    await expect(deleteMyAccount(candidate, "delete")).rejects.toMatchObject({ code: "validation" });
    await expect(deleteMyAccount(reviewer, "DELETE")).rejects.toMatchObject({ code: "forbidden" });
    await deleteMyAccount(candidate, "DELETE");
    expect(await repo.getUser(candidate.id)).toBeNull();
    expect(await repo.getProfile(candidate.id)).toBeNull();
    expect(await repo.getUserByEmail(candidate.email)).toBeNull();
    const trail = await repo.listAudit({ entityType: "user", entityId: candidate.id });
    expect(trail.find((a) => a.action === "privacy.account_deleted")).toMatchObject({ actorId: null, meta: { resumes: 0 } });
    expect(trail.every((a) => a.actorId === null && a.ip === null)).toBe(true);
  });
});
