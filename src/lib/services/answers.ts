import "server-only";
import { systemRepo, userRepo } from "@/lib/data";
import { ANSWER_SECTIONS } from "@/lib/domain/types";
import type { AnswerCompleteness, AnswerSection, ApplicationAnswers, SectionCompleteness, User } from "@/lib/domain/types";
import { AppError } from "@/lib/infra/errors";
import { emptyAnswers, emptySelfIdentification } from "@/lib/seed/dataset";
import { audit } from "./audit";

/*
 * The answer vault: the questions every employer portal asks, answered once and reused on
 * every application. Nothing here is guessed — an unanswered question stays `null` so we
 * never submit a "no" the candidate didn't give us.
 */

export const SECTION_LABEL: Record<AnswerSection, string> = {
  eligibility: "Work eligibility",
  screening: "Employer questions",
  background: "Background checks",
  selfIdentification: "Self-identification",
  delivery: "How we apply for you",
};

/**
 * The questions that must be answered before a specialist can complete a form on the
 * candidate's behalf. Self-identification is deliberately absent: it is voluntary
 * everywhere it is asked, so it never blocks anything.
 */
const REQUIRED: Record<Exclude<AnswerSection, "selfIdentification" | "delivery">, { key: string; label: string }[]> = {
  eligibility: [
    { key: "isOver18", label: "Are you 18 or over?" },
    { key: "authorizedInTargetCountries", label: "Are you authorised to work in your target countries?" },
    { key: "needsSponsorshipNow", label: "Do you need sponsorship now?" },
    { key: "needsFutureSponsorship", label: "Will you need sponsorship in future?" },
    { key: "canPerformEssentialFunctions", label: "Can you perform the essential functions of the role?" },
    { key: "canProvideRightToWorkDocuments", label: "Can you provide right-to-work documents?" },
    { key: "earliestStartDate", label: "Earliest start date" },
  ],
  screening: [
    { key: "appliedOrWorkedHereBefore", label: "Have you applied to or worked for the employer before?" },
    { key: "relatedToCurrentEmployee", label: "Are you related to a current employee?" },
    { key: "leftRoleForPolicyViolation", label: "Have you ever left a role for a policy violation?" },
    { key: "representedByAgency", label: "Are you represented by an agency?" },
    { key: "onsiteDaysPerWeek", label: "Days per week you can attend an office" },
    { key: "boundByNonCompete", label: "Are you bound by a non-compete?" },
  ],
  background: [
    { key: "consentToBackgroundCheck", label: "Do you consent to a background check?" },
    { key: "consentToDrugScreen", label: "Do you consent to a drug screen?" },
    { key: "refusedOrFailedDrugTest", label: "Have you ever refused or failed a drug test?" },
    { key: "convictedOfFelony", label: "Have you been convicted of a felony?" },
    { key: "pendingChargesOrInvestigation", label: "Are there pending charges or investigations?" },
  ],
};

/** Follow-up questions that only become required once the trigger answer is "yes". */
const FOLLOW_UPS: { section: AnswerSection; when: string; key: string; label: string }[] = [
  { section: "screening", when: "relatedToCurrentEmployee", key: "relationshipDetails", label: "Who you are related to" },
  { section: "screening", when: "leftRoleForPolicyViolation", key: "policyViolationDetails", label: "What happened" },
  { section: "screening", when: "boundByNonCompete", key: "nonCompeteDetails", label: "Non-compete terms" },
  { section: "background", when: "convictedOfFelony", key: "felonyDetails", label: "Felony details" },
  { section: "background", when: "pendingChargesOrInvestigation", key: "pendingDetails", label: "Pending matter details" },
];

const answered = (v: unknown) => v !== null && v !== undefined && v !== "";

export function completeness(answers: ApplicationAnswers): AnswerCompleteness {
  const sections: SectionCompleteness[] = ANSWER_SECTIONS.map((section) => {
    if (section === "selfIdentification") {
      const s = answers.selfIdentification;
      const fields = [s.gender, s.hispanicOrLatino, s.raceEthnicity.length ? "set" : null, s.veteranStatus, s.disabilityStatus];
      return { section, label: SECTION_LABEL[section], answered: fields.filter(answered).length, total: fields.length, required: false, missing: [] };
    }
    if (section === "delivery") {
      // Delivery preferences always have a usable default, so this section is never incomplete.
      return { section, label: SECTION_LABEL[section], answered: 1, total: 1, required: false, missing: [] };
    }

    const values: Record<string, unknown> = { ...answers[section] };
    const questions = [...REQUIRED[section], ...FOLLOW_UPS.filter((f) => f.section === section && values[f.when] === true).map((f) => ({ key: f.key, label: f.label }))];
    const missing = questions.filter((q) => !answered(values[q.key])).map((q) => q.label);
    return { section, label: SECTION_LABEL[section], answered: questions.length - missing.length, total: questions.length, required: true, missing };
  });

  const required = sections.filter((s) => s.required);
  const total = required.reduce((n, s) => n + s.total, 0);
  const done = required.reduce((n, s) => n + s.answered, 0);
  const blocking = required.flatMap((s) => s.missing);
  return { sections, score: total === 0 ? 100 : Math.round((done / total) * 100), readyToSubmit: blocking.length === 0, blocking };
}

/**
 * The candidate's own vault, created empty on first read so the UI always has a shape.
 *
 * The EEO column is unreadable by any browser session, which includes the owner's own —
 * column grants are role-wide and can't be made row-aware. So their own answers come back
 * through the privileged repository, after the session has already established who they are.
 * The candidate sees what we hold about them; nobody reaching Postgres directly does.
 */
export async function myAnswers(user: User): Promise<ApplicationAnswers> {
  const repo = await userRepo();
  const answers = await repo.getAnswers(user.id);
  if (!answers) return emptyAnswers(user.id);
  const selfIdentification = (await systemRepo().getSelfIdentification(user.id)) ?? emptySelfIdentification();
  return { ...answers, selfIdentification };
}

export async function myAnswerStatus(user: User) {
  const answers = await myAnswers(user);
  return { answers, completeness: completeness(answers) };
}

/** Saves one section. Validation happens in the caller via the section schemas. */
export async function saveSection<K extends AnswerSection>(user: User, section: K, value: ApplicationAnswers[K]) {
  // Writing EEO answers is a read-back problem, not a write one: the session may update the
  // column but cannot select it, so the privileged repository returns the saved row.
  const repo = section === "selfIdentification" ? systemRepo() : await userRepo();
  const saved = await repo.patchAnswerSection(user.id, section, value);
  // Deliberately not logging the values: the audit trail records that answers changed, not what they are.
  await audit(user, "answers.updated", "application_answers", user.id, { section });
  return { answers: saved, completeness: completeness(saved) };
}

/**
 * Staff view of a candidate's vault. Self-identification is blanked unless a specialist
 * explicitly unlocks it to complete a form that asks for it, and unlocking is audited.
 */
export async function answersForStaff(staff: User, userId: string, opts: { includeSelfIdentification?: boolean; reason?: string } = {}) {
  const repo = systemRepo();
  // getAnswers never carries the EEO column, so the withheld case needs no scrubbing.
  const answers = await repo.getAnswers(userId);
  if (!answers) throw new AppError("not_found", "This candidate hasn't started their answers yet.");

  if (!opts.includeSelfIdentification) {
    return { answers, selfIdentificationWithheld: true, completeness: completeness(answers) };
  }
  if (!opts.reason || opts.reason.trim().length < 10) {
    throw new AppError("validation", "Say which form needs this information before unlocking it.");
  }
  await audit(staff, "answers.self_identification_unlocked", "application_answers", userId, { reason: opts.reason.trim() });
  const selfIdentification = (await repo.getSelfIdentification(userId)) ?? emptySelfIdentification();
  return { answers: { ...answers, selfIdentification }, selfIdentificationWithheld: false, completeness: completeness(answers) };
}

/** Throws unless the vault is complete enough to submit an application. */
export async function assertReadyToSubmit(userId: string) {
  const answers = (await systemRepo().getAnswers(userId)) ?? emptyAnswers(userId);
  const status = completeness(answers);
  if (!status.readyToSubmit) {
    throw new AppError("validation", `Finish your application answers first — ${status.blocking.length} question${status.blocking.length === 1 ? "" : "s"} still need an answer.`);
  }
  return answers;
}
