import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CandidateProfile, GithubEnrichment, User } from "@/lib/domain/types";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));
vi.mock("node:dns/promises", () => ({
  resolveMx: vi.fn(async (d: string) => {
    if (d === "gmail.com") return [{ exchange: "gmail-smtp-in.l.google.com", priority: 5 }];
    if (d === "nullmx.org") return [{ exchange: ".", priority: 0 }];
    throw Object.assign(new Error("not found"), { code: "ENOTFOUND" });
  }),
  resolve4: vi.fn(async (d: string) => (d === "a-record-only.org" ? ["192.0.2.1"] : Promise.reject(Object.assign(new Error("nx"), { code: "ENOTFOUND" })))),
  resolve6: vi.fn(async () => Promise.reject(Object.assign(new Error("nx"), { code: "ENOTFOUND" }))),
}));

const fetchMock = vi.fn();
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("email checks", () => {
  it("accepts deliverable domains and rejects the rest", async () => {
    const { emailProblem } = await import("@/lib/validation/email");
    expect(await emailProblem("someone@gmail.com")).toBeNull();
    expect(await emailProblem("someone@a-record-only.org")).toBeNull();
    expect(await emailProblem("someone@gmial-typo-domain.com")).toMatch(/can't receive email/);
    expect(await emailProblem("someone@nullmx.org")).toMatch(/can't receive email/);
    expect(await emailProblem("someone@mailinator.com")).toMatch(/Disposable/);
    expect(await emailProblem("someone@example.test")).toMatch(/receive mail/);
  });
});

describe("GitHub enrichment", () => {
  it("collects public evidence through the REST API", async () => {
    fetchMock.mockImplementation((url: string) =>
      url.endsWith("/users/octocat")
        ? json({ login: "octocat", name: "The Octocat", bio: null, html_url: "https://github.com/octocat", public_repos: 3, followers: 10, created_at: "2011-01-25T18:44:36Z", type: "User" })
        : json([
            { name: "api", description: "Service", html_url: "https://github.com/octocat/api", language: "TypeScript", stargazers_count: 4, topics: ["nextjs", "postgresql"], fork: false, archived: false, pushed_at: "2026-09-01T00:00:00Z" },
            { name: "ml", description: null, html_url: "https://github.com/octocat/ml", language: "Python", stargazers_count: 1, topics: [], fork: false, archived: false, pushed_at: "2026-08-01T00:00:00Z" },
            { name: "forked", description: null, html_url: "https://github.com/octocat/forked", language: "Rust", stargazers_count: 99, topics: [], fork: true, archived: false, pushed_at: "2026-08-01T00:00:00Z" },
          ]),
    );
    const { fetchGithubProfile } = await import("@/lib/integrations/github");
    const gh = await fetchGithubProfile("octocat");
    expect(gh.status).toBe("verified");
    expect(gh.verifiedSkills).toEqual(expect.arrayContaining(["TypeScript", "Next.js", "PostgreSQL", "Python"]));
    expect(gh.verifiedSkills).not.toContain("Rust");
    expect(gh.projects.map((p) => p.name)).toEqual(["api", "ml"]);
  });

  it("distinguishes a missing account from an outage", async () => {
    const { fetchGithubProfile } = await import("@/lib/integrations/github");
    fetchMock.mockImplementation(() => json({ message: "Not Found" }, 404));
    expect((await fetchGithubProfile("nobody-here-123")).status).toBe("not_found");
    fetchMock.mockImplementation(() => json({ message: "rate limited" }, 403));
    expect(await fetchGithubProfile("octocat")).toMatchObject({ status: "unavailable", error: expect.stringMatching(/rate limit/) });
  });
});

const user = (patch: Partial<User> = {}): User => ({ id: "u-test", email: "t@example.org", fullName: "Jane Doe", role: "candidate", avatarUrl: null, onboardedAt: null, createdAt: new Date().toISOString(), ...patch });

describe("automatic flags", () => {
  it("flags inconsistencies for reviewers", async () => {
    const { computeFlags } = await import("./verification");
    const { emptyProfile } = await import("@/lib/ai/heuristic");
    const profile: CandidateProfile = {
      ...emptyProfile("u-test", new Date().toISOString()),
      yearsExperience: 15,
      seniority: "executive",
      skills: [{ name: "Rust", level: 5, years: 20 }],
      experience: [{ id: "x", company: "Acme", title: "Engineer", startDate: "2023-01", endDate: null, description: "", highlights: [], skills: [] }],
      links: { linkedin: "https://www.linkedin.com/in/jane-doe" },
    };
    const gh: GithubEnrichment = { status: "verified", username: "someone", profileUrl: "https://github.com/someone", name: "Totally Different", bio: null, publicRepos: 2, followers: 0, accountCreatedAt: null, languages: [], verifiedSkills: [], projects: [], fetchedAt: new Date().toISOString() };
    const codes = computeFlags(profile, user(), gh, { hasResume: false, emailConfirmed: false }).map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(["github_name_mismatch", "linkedin_self_reported", "experience_years_mismatch", "skill_years_exceed_experience", "no_resume", "email_unconfirmed"]));
  });
});

describe("reference data checks", () => {
  const input = async () => {
    const { ProfileSchema } = await import("@/lib/domain/schemas");
    return ProfileSchema.parse({
      headline: "Engineer",
      summary: "",
      location: { city: "bengaluru", region: "Karnataka", country: "IN" },
      citizenship: [],
      workAuthorizations: [],
      requiresSponsorship: true,
      willingToRelocate: false,
      relocationCountries: [],
      remotePreference: "any",
      preferredRoles: [],
      preferredCountries: [],
      seniority: "mid",
      yearsExperience: 3,
      skills: [{ name: "reactjs", level: 3, years: 2 }, { name: "React", level: 5, years: 3 }, { name: "Postgres", level: 3, years: 2 }],
      experience: [],
      education: [],
      salaryExpectation: null,
      links: {},
    });
  };

  it("canonicalises cities and skills and merges duplicates", async () => {
    const { checkReferenceData } = await import("./verification");
    const data = await checkReferenceData(await input(), { requireLocation: true });
    expect(data.location.city).toBe("Bengaluru");
    expect(data.skills).toEqual([
      { name: "React", level: 5, years: 3 },
      { name: "PostgreSQL", level: 3, years: 2 },
    ]);
  });

  it("rejects places outside the dataset and unrecognised skills with field errors", async () => {
    fetchMock.mockImplementation((url: string) => (url.includes("stackexchange") ? json({ items: [] }) : json({ _embedded: { results: [] } })));
    const { checkReferenceData } = await import("./verification");
    const data = await input();
    data.location = { country: "IN", region: "Karnataka", city: "Atlantis" };
    data.skills = [{ name: "jhfavd", level: 3, years: 1 }, { name: "Banana juggling", level: 2, years: 1 }];
    const err = await checkReferenceData(data, { requireLocation: true }).catch((e) => e);
    const fields = err.details.fieldErrors as Record<string, string[]>;
    expect(Object.keys(fields)).toEqual(expect.arrayContaining(["location.city", "skills.0.name", "skills.1.name"]));
  });

  it("requires a region that belongs to the country", async () => {
    const { checkReferenceData } = await import("./verification");
    const data = await input();
    data.location = { country: "IN", region: "California", city: "" };
    const err = await checkReferenceData(data, { requireLocation: false }).catch((e) => e);
    expect(err.details.fieldErrors["location.region"]).toBeDefined();
  });
});

describe("verification workflow and permissions", () => {
  async function setup() {
    const { systemRepo } = await import("@/lib/data");
    const { emptyProfile } = await import("@/lib/ai/heuristic");
    const repo = systemRepo();
    const candidate = await repo.createUser({ email: `c${Math.random()}@example.org`, fullName: "Casey Candidate", role: "candidate", avatarUrl: null, onboardedAt: null });
    const reviewer = await repo.createUser({ email: `r${Math.random()}@example.org`, fullName: "Riley Reviewer", role: "reviewer", avatarUrl: null, onboardedAt: null });
    const profile = await repo.upsertProfile({ ...emptyProfile(candidate.id, new Date().toISOString()), headline: "Engineer" });
    const { recordSubmission } = await import("./verification");
    await recordSubmission(candidate, profile, undefined, { hasResume: false });
    return { repo, candidate, reviewer, profile };
  }

  it("queues new profiles as pending", async () => {
    const { repo, candidate } = await setup();
    expect((await repo.getVerification(candidate.id))?.status).toBe("pending");
  });

  it("enforces staff-only decisions on the server", async () => {
    const { candidate, reviewer } = await setup();
    const { decideVerification } = await import("./admin");
    await expect(decideVerification(candidate, candidate.id, { decision: "approved", note: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(decideVerification(reviewer, reviewer.id, { decision: "approved", note: "" })).rejects.toMatchObject({ code: "forbidden" });
    await expect(decideVerification(reviewer, candidate.id, { decision: "rejected", note: "" })).rejects.toThrow();
    const res = await decideVerification(reviewer, candidate.id, { decision: "changes_requested", note: "Please add your work history." });
    expect(res).toMatchObject({ status: "changes_requested", reviewedBy: reviewer.id });
  });

  it("returns a corrected profile to the queue and records the audit trail", async () => {
    const { repo, candidate, reviewer, profile } = await setup();
    const { decideVerification } = await import("./admin");
    const { recordSubmission } = await import("./verification");
    await decideVerification(reviewer, candidate.id, { decision: "changes_requested", note: "Please add your work history." });
    const resubmitted = await recordSubmission(candidate, profile, undefined, { hasResume: false });
    expect(resubmitted).toMatchObject({ status: "pending", reviewedAt: null, note: "Please add your work history." });
    const trail = await repo.listAudit({ entityType: "profile_verification", entityId: candidate.id });
    expect(trail.map((a) => a.action)).toContain("profile.verification.changes_requested");
    const notes = await repo.listNotifications(candidate.id);
    expect(notes[0]?.title).toMatch(/needs a few changes/);
  });

  it("keeps rejected profiles out of matching", async () => {
    const { candidate, reviewer } = await setup();
    const { decideVerification } = await import("./admin");
    await decideVerification(reviewer, candidate.id, { decision: "rejected", note: "Identity could not be confirmed." });
    const { matchCandidate } = await import("./matching/service");
    expect(await matchCandidate(candidate.id)).toEqual({ scored: 0, highFit: 0 });
  });
});
