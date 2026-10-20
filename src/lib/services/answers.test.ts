import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationAnswers } from "@/lib/domain/types";

vi.mock("@/lib/pipeline/queue", () => ({ enqueue: vi.fn(async () => ({ created: true })), enqueueAndKick: vi.fn(async () => ({ job: { id: "j" }, created: true })) }));

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as { __autoapplyStore?: unknown }).__autoapplyStore;
});

const load = async () => {
  const [{ completeness }, { emptyAnswers }] = await Promise.all([import("./answers"), import("@/lib/seed/dataset")]);
  return { completeness, emptyAnswers };
};

/** Answers a section's required questions, leaving follow-ups alone. */
function answerRequired(a: ApplicationAnswers): ApplicationAnswers {
  return {
    ...a,
    eligibility: {
      ...a.eligibility,
      isOver18: true,
      authorizedInTargetCountries: false,
      needsSponsorshipNow: true,
      needsFutureSponsorship: true,
      canPerformEssentialFunctions: true,
      canProvideRightToWorkDocuments: true,
      earliestStartDate: "2027-01-04",
    },
    screening: {
      ...a.screening,
      appliedOrWorkedHereBefore: false,
      relatedToCurrentEmployee: false,
      leftRoleForPolicyViolation: false,
      representedByAgency: false,
      onsiteDaysPerWeek: 3,
      boundByNonCompete: false,
    },
    background: {
      ...a.background,
      consentToBackgroundCheck: true,
      consentToDrugScreen: true,
      refusedOrFailedDrugTest: false,
      convictedOfFelony: false,
      pendingChargesOrInvestigation: false,
    },
  };
}

describe("answer completeness", () => {
  it("treats an empty vault as blocking, not as a page of implicit noes", async () => {
    const { completeness, emptyAnswers } = await load();
    const status = completeness(emptyAnswers("u1"));
    expect(status.readyToSubmit).toBe(false);
    expect(status.score).toBe(0);
    // Every required question is listed, so the candidate sees exactly what is outstanding.
    expect(status.blocking).toContain("Are you 18 or over?");
    expect(status.blocking.length).toBeGreaterThanOrEqual(18);
  });

  it("is ready once every required question is answered", async () => {
    const { completeness, emptyAnswers } = await load();
    const status = completeness(answerRequired(emptyAnswers("u1")));
    expect(status.readyToSubmit).toBe(true);
    expect(status.score).toBe(100);
    expect(status.blocking).toEqual([]);
  });

  it("a false answer counts as answered — only null is outstanding", async () => {
    const { completeness, emptyAnswers } = await load();
    const base = answerRequired(emptyAnswers("u1"));
    const withNull = { ...base, eligibility: { ...base.eligibility, isOver18: null } };
    expect(completeness(withNull).blocking).toEqual(["Are you 18 or over?"]);
  });

  it("asks for an explanation only once the trigger answer is yes", async () => {
    const { completeness, emptyAnswers } = await load();
    const base = answerRequired(emptyAnswers("u1"));
    expect(completeness(base).readyToSubmit).toBe(true);

    const felony = { ...base, background: { ...base.background, convictedOfFelony: true } };
    expect(completeness(felony).blocking).toEqual(["Felony details"]);

    const explained = { ...felony, background: { ...felony.background, felonyDetails: "Details provided in full." } };
    expect(completeness(explained).readyToSubmit).toBe(true);
  });

  it("never lets voluntary self-identification block a submission", async () => {
    const { completeness, emptyAnswers } = await load();
    const status = completeness(answerRequired(emptyAnswers("u1")));
    const selfId = status.sections.find((s) => s.section === "selfIdentification")!;
    expect(selfId.required).toBe(false);
    expect(selfId.answered).toBe(0);
    expect(selfId.missing).toEqual([]);
    // Entirely unanswered, yet the candidate is still ready to be applied for.
    expect(status.readyToSubmit).toBe(true);
  });

  it("counts partial progress per section", async () => {
    const { completeness, emptyAnswers } = await load();
    const a = emptyAnswers("u1");
    a.eligibility.isOver18 = true;
    a.eligibility.needsSponsorshipNow = false;
    const eligibility = completeness(a).sections.find((s) => s.section === "eligibility")!;
    expect(eligibility.answered).toBe(2);
    expect(eligibility.total).toBe(7);
  });
});

describe("submission gate", () => {
  it("refuses to submit for a candidate with an unfinished vault", async () => {
    const { assertReadyToSubmit } = await import("./answers");
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const repo = systemRepo();
    const user = await repo.createUser({ email: `gate${Math.random()}@example.org`, fullName: "Gate Tester", role: "candidate", avatarUrl: null, onboardedAt: null });
    await repo.upsertAnswers(emptyAnswers(user.id));

    await expect(assertReadyToSubmit(user.id)).rejects.toThrow(/Finish your application answers/);
  });

  it("lets a complete vault through", async () => {
    const { assertReadyToSubmit } = await import("./answers");
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const repo = systemRepo();
    const user = await repo.createUser({ email: `gate${Math.random()}@example.org`, fullName: "Gate Tester", role: "candidate", avatarUrl: null, onboardedAt: null });
    await repo.upsertAnswers(answerRequired(emptyAnswers(user.id)));

    await expect(assertReadyToSubmit(user.id)).resolves.toBeTruthy();
  });
});

describe("self-identification access", () => {
  it("withholds it from staff by default and demands a reason to unlock", async () => {
    const { answersForStaff } = await import("./answers");
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const repo = systemRepo();
    const candidate = await repo.createUser({ email: `c${Math.random()}@example.org`, fullName: "Candidate", role: "candidate", avatarUrl: null, onboardedAt: null });
    const staff = await repo.createUser({ email: `o${Math.random()}@example.org`, fullName: "Operator", role: "operator", avatarUrl: null, onboardedAt: null });

    const answers = emptyAnswers(candidate.id);
    answers.selfIdentification = { gender: "woman", genderSelfDescribed: "", hispanicOrLatino: "no", raceEthnicity: ["asian"], veteranStatus: "not_a_veteran", disabilityStatus: "no" };
    await repo.upsertAnswers(answers);

    const withheld = await answersForStaff(staff, candidate.id);
    expect(withheld.selfIdentificationWithheld).toBe(true);
    expect(withheld.answers.selfIdentification.gender).toBeNull();
    expect(withheld.answers.selfIdentification.raceEthnicity).toEqual([]);

    await expect(answersForStaff(staff, candidate.id, { includeSelfIdentification: true, reason: "need it" })).rejects.toThrow(/which form/);

    const unlocked = await answersForStaff(staff, candidate.id, { includeSelfIdentification: true, reason: "Workday EEO step for Northwind req 4821" });
    expect(unlocked.selfIdentificationWithheld).toBe(false);
    expect(unlocked.answers.selfIdentification.gender).toBe("woman");

    // The unlock is on the record.
    const log = await repo.listAudit({ entityType: "application_answers", limit: 20 });
    expect(log.some((e) => e.action === "answers.self_identification_unlocked")).toBe(true);
  });
});

describe("a candidate reading their own answers", () => {
  it("sees their own self-identification even though no browser session can select it", async () => {
    const { myAnswers, saveSection } = await import("./answers");
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const repo = systemRepo();
    const user = await repo.createUser({ email: `own${Math.random()}@example.org`, fullName: "Owner", role: "candidate", avatarUrl: null, onboardedAt: null });
    await repo.upsertAnswers(emptyAnswers(user.id));

    await saveSection(user, "selfIdentification", {
      gender: "non_binary",
      genderSelfDescribed: "",
      hispanicOrLatino: "decline",
      raceEthnicity: ["two_or_more"],
      veteranStatus: "decline",
      disabilityStatus: "decline",
    });

    // The repository read is redacted…
    const redacted = await repo.getAnswers(user.id);
    expect(redacted!.selfIdentification.gender).toBeNull();

    // …but the owner's own view fills it back in, so they can check what we hold.
    const mine = await myAnswers(user);
    expect(mine.selfIdentification.gender).toBe("non_binary");
    expect(mine.selfIdentification.raceEthnicity).toEqual(["two_or_more"]);
  });

  it("keeps other sections intact when one section is saved", async () => {
    const { myAnswers, saveSection } = await import("./answers");
    const { systemRepo } = await import("@/lib/data");
    const { emptyAnswers } = await import("@/lib/seed/dataset");
    const repo = systemRepo();
    const user = await repo.createUser({ email: `own${Math.random()}@example.org`, fullName: "Owner", role: "candidate", avatarUrl: null, onboardedAt: null });
    await repo.upsertAnswers(emptyAnswers(user.id));

    await saveSection(user, "selfIdentification", { gender: "woman", genderSelfDescribed: "", hispanicOrLatino: "no", raceEthnicity: [], veteranStatus: null, disabilityStatus: null });
    await saveSection(user, "eligibility", { ...emptyAnswers(user.id).eligibility, isOver18: true });

    const mine = await myAnswers(user);
    expect(mine.eligibility.isOver18).toBe(true);
    // Saving an unrelated section must not wipe the EEO answers.
    expect(mine.selfIdentification.gender).toBe("woman");
  });
});
