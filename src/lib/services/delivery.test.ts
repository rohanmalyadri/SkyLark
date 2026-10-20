import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationAnswers, User } from "@/lib/domain/types";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
});

/** A candidate with a subscription and a complete answer vault — the state delivery needs. */
async function readyCandidate(planId: "entry" | "professional" | "executive" = "professional", over: Partial<ApplicationAnswers["delivery"]> = {}) {
  const { systemRepo } = await import("@/lib/data");
  const { emptyAnswers } = await import("@/lib/seed/dataset");
  const repo = systemRepo();
  const user = await repo.createUser({ email: `d${Math.random()}@example.org`, fullName: "Delivery Candidate", role: "candidate", avatarUrl: null, onboardedAt: new Date().toISOString() });
  await repo.upsertSubscription({ userId: user.id, planId, status: "active", interval: "month", currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000).toISOString(), cancelAtPeriodEnd: false });

  const answers = emptyAnswers(user.id);
  answers.delivery = { ...answers.delivery, ...over };
  answers.eligibility = {
    isOver18: true,
    authorizedInTargetCountries: true,
    needsSponsorshipNow: false,
    needsFutureSponsorship: false,
    canPerformEssentialFunctions: true,
    canProvideRightToWorkDocuments: true,
    earliestStartDate: "2027-02-01",
    noticePeriodDays: 30,
  };
  answers.screening = {
    appliedOrWorkedHereBefore: false,
    relatedToCurrentEmployee: false,
    relationshipDetails: "",
    leftRoleForPolicyViolation: false,
    policyViolationDetails: "",
    representedByAgency: false,
    onsiteDaysPerWeek: 3,
    boundByNonCompete: false,
    nonCompeteDetails: "",
  };
  answers.background = {
    consentToBackgroundCheck: true,
    consentToDrugScreen: true,
    refusedOrFailedDrugTest: false,
    convictedOfFelony: false,
    felonyDetails: "",
    pendingChargesOrInvestigation: false,
    pendingDetails: "",
  };
  await repo.upsertAnswers(answers);
  return user;
}

const operator = async (): Promise<User> => {
  const { systemRepo } = await import("@/lib/data");
  return systemRepo().createUser({ email: `op${Math.random()}@example.org`, fullName: "Nadia Operator", role: "operator", avatarUrl: null, onboardedAt: null });
};

describe("working days", () => {
  it("owes nothing at the weekend", async () => {
    const { isWorkingDay } = await import("./delivery");
    expect(isWorkingDay("2026-10-17")).toBe(false); // Saturday
    expect(isWorkingDay("2026-10-18")).toBe(false); // Sunday
    expect(isWorkingDay("2026-10-19")).toBe(true); // Monday
    expect(isWorkingDay("2026-10-23")).toBe(true); // Friday
  });
});

describe("daily target", () => {
  it("comes from the plan", async () => {
    const user = await readyCandidate("executive");
    const { dailyTarget } = await import("./delivery");
    const t = await dailyTarget(user.id);
    expect(t.cap).toBe(40);
  });

  it("lets a candidate ask for fewer, but never more than the plan allows", async () => {
    const fewer = await readyCandidate("professional", { dailyTarget: 5 });
    const greedy = await readyCandidate("entry", { dailyTarget: 99 });
    const { dailyTarget } = await import("./delivery");
    expect((await dailyTarget(fewer.id)).target).toBe(5);
    expect((await dailyTarget(greedy.id)).target).toBe(10);
  });

  it("owes nothing while paused", async () => {
    const user = await readyCandidate("professional", { paused: true, pauseReason: "On holiday" });
    const { dailyTarget } = await import("./delivery");
    const t = await dailyTarget(user.id);
    expect(t.target).toBe(0);
    expect(t.paused).toBe(true);
  });
});

describe("scheduling", () => {
  it("opens one run per candidate per day and is safe to run repeatedly", async () => {
    const user = await readyCandidate("professional");
    const { openRun, today } = await import("./delivery");
    const { systemRepo } = await import("@/lib/data");

    const first = await openRun(user.id, "2026-10-19");
    const second = await openRun(user.id, "2026-10-19");
    expect(second.id).toBe(first.id);
    expect(first.target).toBe(25);
    expect(await systemRepo().listDeliveryRuns({ userId: user.id, day: "2026-10-19" })).toHaveLength(1);
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("marks a weekend run skipped rather than owing a target", async () => {
    const user = await readyCandidate("professional");
    const { openRun } = await import("./delivery");
    const run = await openRun(user.id, "2026-10-17");
    expect(run.status).toBe("skipped");
  });

  it("skips paused candidates when scheduling the day", async () => {
    const active = await readyCandidate("professional");
    const paused = await readyCandidate("professional", { paused: true, pauseReason: "Away" });
    const { scheduleDay } = await import("./delivery");
    const { systemRepo } = await import("@/lib/data");

    await scheduleDay("2026-10-19");
    const runs = await systemRepo().listDeliveryRuns({ day: "2026-10-19", limit: 100 });
    const ids = runs.map((r) => r.userId);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(paused.id);
  });

  it("does not schedule a weekend at all", async () => {
    await readyCandidate("professional");
    const { scheduleDay } = await import("./delivery");
    expect(await scheduleDay("2026-10-18")).toEqual({ scheduled: 0, skipped: true });
  });
});

describe("claiming a run", () => {
  it("is for operators only, and only one of them", async () => {
    const candidate = await readyCandidate("professional");
    const { openRun, claimRun } = await import("./delivery");
    const { systemRepo } = await import("@/lib/data");
    const run = await openRun(candidate.id, "2026-10-19");

    const reviewer = await systemRepo().createUser({ email: `r${Math.random()}@example.org`, fullName: "Reviewer", role: "reviewer", avatarUrl: null, onboardedAt: null });
    await expect(claimRun(reviewer, run.id)).rejects.toThrow(/Only application specialists/);

    const first = await operator();
    const claimed = await claimRun(first, run.id);
    expect(claimed.operatorId).toBe(first.id);
    expect(claimed.status).toBe("in_progress");

    const second = await operator();
    await expect(claimRun(second, run.id)).rejects.toThrow(/already has this run/);
  });
});

describe("recording a submission", () => {
  /** Gives the candidate a real application to submit, mirroring what the tracker holds. */
  async function applicationFor(userId: string) {
    const { systemRepo } = await import("@/lib/data");
    const repo = systemRepo();
    const job = (await repo.listJobs({ status: "active", limit: 1 }))[0]!;
    return repo.createApplication({ userId, jobId: job.id, matchId: null, status: "preparing", stage: "tailored", tailoredDocumentId: null, notes: "", nextStep: null, appliedAt: null });
  }

  it("writes proof, moves the application and advances the run counter", async () => {
    const candidate = await readyCandidate("professional", { dailyTarget: 2 });
    const op = await operator();
    const app = await applicationFor(candidate.id);
    const { recordSubmission, today } = await import("./delivery");
    const { systemRepo } = await import("@/lib/data");

    const res = await recordSubmission(op, { applicationId: app.id, confirmationRef: "WD-99812", portal: "Workday" });
    expect(res.proof.submittedBy).toBe("specialist");
    expect(res.proof.confirmationRef).toBe("WD-99812");

    const saved = await systemRepo().getApplication(app.id);
    expect(saved?.status).toBe("applied");
    expect(saved?.proof?.portal).toBe("Workday");
    expect(saved?.appliedAt).toBeTruthy();

    const run = await systemRepo().getDeliveryRun(candidate.id, today());
    expect(run?.submitted).toBe(1);

    // The candidate can see who did it and when.
    const events = await systemRepo().listEvents(app.id);
    expect(events.some((e) => e.actor === "operator" && e.message.includes("WD-99812"))).toBe(true);
  });

  it("refuses to submit for a candidate whose answers are unfinished", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const repo = systemRepo();
    const candidate = await readyCandidate("professional");
    // Wipe the vault back to unanswered.
    await repo.upsertAnswers(emptyAnswers(candidate.id));
    const op = await operator();
    const app = await applicationFor(candidate.id);
    const { recordSubmission } = await import("./delivery");

    await expect(recordSubmission(op, { applicationId: app.id, confirmationRef: "", portal: "Greenhouse" })).rejects.toThrow(/Finish your application answers/);
  });

  it("will not double-count the same application", async () => {
    const candidate = await readyCandidate("professional");
    const op = await operator();
    const app = await applicationFor(candidate.id);
    const { recordSubmission } = await import("./delivery");
    await recordSubmission(op, { applicationId: app.id, confirmationRef: "A1", portal: "Workday" });
    await expect(recordSubmission(op, { applicationId: app.id, confirmationRef: "A1", portal: "Workday" })).rejects.toThrow(/already marked as submitted/);
  });

  it("marks the run delivered once the target is met", async () => {
    const candidate = await readyCandidate("professional", { dailyTarget: 1 });
    const op = await operator();
    const app = await applicationFor(candidate.id);
    const { recordSubmission, today } = await import("./delivery");
    const { systemRepo } = await import("@/lib/data");
    await recordSubmission(op, { applicationId: app.id, confirmationRef: "B2", portal: "Lever" });
    expect((await systemRepo().getDeliveryRun(candidate.id, today()))?.status).toBe("delivered");
  });
});

describe("closing out a day", () => {
  it("demands an explanation for a shortfall and notifies the candidate", async () => {
    const candidate = await readyCandidate("professional", { dailyTarget: 10 });
    const op = await operator();
    const { openRun, closeRun, today } = await import("./delivery");
    const { systemRepo } = await import("@/lib/data");
    const run = await openRun(candidate.id, today());

    await expect(closeRun(op, run.id, "short")).rejects.toThrow(/Explain the shortfall/);

    const closed = await closeRun(op, run.id, "Only three new postings cleared their score floor today.");
    expect(closed.status).toBe("short");

    const notes = await systemRepo().listNotifications(candidate.id, 10);
    expect(notes.some((n) => n.title.includes("of 10 applications"))).toBe(true);
  });
});

describe("the candidate's view", () => {
  it("summarises today, the week and what is blocking us", async () => {
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const candidate = await readyCandidate("professional", { dailyTarget: 4 });
    const op = await operator();
    const { openRun, closeRun, mySummary, today } = await import("./delivery");

    const run = await openRun(candidate.id, today());
    await closeRun(op, run.id, "Quiet day across the board for this discipline.");

    const summary = await mySummary(candidate);
    expect(summary.target).toBe(4);
    expect(summary.last7Days).toHaveLength(7);
    expect(summary.paused).toBe(false);
    expect(summary.blocking).toEqual([]);

    // Once the vault is emptied, the summary says so rather than silently stalling.
    await systemRepo().upsertAnswers(emptyAnswers(candidate.id));
    const blocked = await mySummary(candidate);
    expect(blocked.blocking.length).toBeGreaterThan(0);
  });

  it("reports a pause set from the dashboard", async () => {
    const candidate = await readyCandidate("professional");
    const { setPaused, mySummary } = await import("./delivery");
    await setPaused(candidate, true, "Final rounds at two companies");
    const summary = await mySummary(candidate);
    expect(summary.paused).toBe(true);
    expect(summary.target).toBe(0);

    await setPaused(candidate, false);
    expect((await mySummary(candidate)).paused).toBe(false);
  });
});
