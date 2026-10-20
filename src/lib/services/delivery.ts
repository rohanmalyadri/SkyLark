import "server-only";
import { systemRepo, userRepo } from "@/lib/data";
import type { DeliveryRun, DeliverySummary, SubmissionProof, User } from "@/lib/domain/types";
import { isOperator } from "@/lib/auth/dal";
import { AppError, notFound } from "@/lib/infra/errors";
import { emptyAnswers } from "@/lib/seed/dataset";
import { assertReadyToSubmit, completeness } from "./answers";
import { audit } from "./audit";
import { currentPlan } from "./billing";
import { notify } from "./notifications";

/*
 * Managed delivery: the promise that a specialist submits a set number of applications for
 * the candidate every working day. A run is the unit we hold ourselves to — planned target,
 * what was actually submitted, and the reason when it falls short.
 */

export const today = (now = new Date()) => now.toISOString().slice(0, 10);

/** Saturdays and Sundays are not working days, so no target is owed. */
export const isWorkingDay = (day: string) => {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
};

/**
 * What a candidate is owed on a given day: their plan's quota, lowered if they asked for
 * fewer, and zero while they are paused.
 */
export async function dailyTarget(userId: string) {
  const [{ plan }, answers] = await Promise.all([currentPlan(userId), systemRepo().getAnswers(userId)]);
  const cap = plan.limits.applicationsPerDay;
  // No stated preference means the full plan allowance, not an arbitrary smaller number.
  const wanted = answers?.delivery.dailyTarget ?? cap;
  if (answers?.delivery.paused) return { target: 0, cap, paused: true };
  return { target: Math.max(0, Math.min(cap, wanted)), cap, paused: false };
}

/** Opens (or returns) the run for a candidate's day. Server-authored only. */
export async function openRun(userId: string, day = today()): Promise<DeliveryRun> {
  const repo = systemRepo();
  const existing = await repo.getDeliveryRun(userId, day);
  if (existing) return existing;
  const { target } = await dailyTarget(userId);
  return repo.createDeliveryRun({
    userId,
    day,
    target,
    submitted: 0,
    status: target === 0 || !isWorkingDay(day) ? "skipped" : "scheduled",
    operatorId: null,
    note: target === 0 ? "Paused by the candidate." : !isWorkingDay(day) ? "Not a working day." : "",
    startedAt: null,
    completedAt: null,
  });
}

/**
 * Schedules the day's work for every subscribed candidate. Called by the pipeline worker,
 * so a missed cron run self-heals the next time it fires.
 */
export async function scheduleDay(day = today(), limit = 200) {
  const repo = systemRepo();
  if (!isWorkingDay(day)) return { scheduled: 0, skipped: true };
  const due = await repo.candidatesNeedingDelivery(day, limit);
  let scheduled = 0;
  for (const c of due) {
    await openRun(c.userId, day);
    scheduled++;
  }
  return { scheduled, skipped: false };
}

/** An operator picks up a candidate's day. */
export async function claimRun(staff: User, runId: string) {
  if (!isOperator(staff)) throw new AppError("forbidden", "Only application specialists can claim a delivery run.");
  const repo = systemRepo();
  const run = await repo.getDeliveryRunById(runId);
  if (!run) throw notFound("Delivery run");
  if (run.operatorId && run.operatorId !== staff.id) throw new AppError("conflict", `${run.operatorName ?? "Another specialist"} already has this run.`);
  const updated = await repo.updateDeliveryRun(runId, { operatorId: staff.id, status: run.status === "scheduled" ? "in_progress" : run.status, startedAt: run.startedAt ?? new Date().toISOString() });
  await audit(staff, "delivery.claimed", "delivery_run", runId, { userId: run.userId, day: run.day });
  return updated;
}

/**
 * Records that a specialist submitted an application, with proof. This is the only path
 * that increments a run's counter, so the number a candidate sees is always backed by a
 * real application row.
 */
export async function recordSubmission(
  staff: User,
  input: { applicationId: string; confirmationRef: string; portal: string; screenshotPath?: string | null },
) {
  if (!isOperator(staff)) throw new AppError("forbidden", "Only application specialists can record a submission.");
  const repo = systemRepo();
  const app = await repo.getApplication(input.applicationId);
  if (!app) throw notFound("Application");
  if (app.proof) throw new AppError("conflict", "This application is already marked as submitted.");
  // Half-answered vaults are how wrong information reaches an employer form.
  await assertReadyToSubmit(app.userId);

  const now = new Date().toISOString();
  const run = await openRun(app.userId, today(new Date(now)));
  const proof: SubmissionProof = {
    submittedBy: "specialist",
    operatorId: staff.id,
    confirmationRef: input.confirmationRef.trim(),
    portal: input.portal.trim(),
    screenshotPath: input.screenshotPath ?? null,
    submittedAt: now,
  };

  await repo.updateApplication(app.id, { status: "applied", stage: "applied", appliedAt: now, proof, deliveryRunId: run.id });
  await repo.addEvent({
    applicationId: app.id,
    type: "status_change",
    actor: "operator",
    message: `Submitted to ${app.job.company.name} by ${staff.fullName}${proof.confirmationRef ? ` — ref ${proof.confirmationRef}` : ""}`,
    meta: { to: "applied", portal: proof.portal, confirmationRef: proof.confirmationRef },
  });

  const submitted = run.submitted + 1;
  await repo.updateDeliveryRun(run.id, {
    submitted,
    operatorId: run.operatorId ?? staff.id,
    status: submitted >= run.target ? "delivered" : "in_progress",
    startedAt: run.startedAt ?? now,
    completedAt: submitted >= run.target ? now : null,
  });
  await audit(staff, "delivery.submitted", "application", app.id, { userId: app.userId, runId: run.id, portal: proof.portal });
  return { proof, run: { ...run, submitted } };
}

/** Closes out a day, explaining any shortfall. */
export async function closeRun(staff: User, runId: string, note: string) {
  if (!isOperator(staff)) throw new AppError("forbidden", "Only application specialists can close a delivery run.");
  const repo = systemRepo();
  const run = await repo.getDeliveryRunById(runId);
  if (!run) throw notFound("Delivery run");
  const short = run.submitted < run.target;
  if (short && note.trim().length < 10) throw new AppError("validation", "Explain the shortfall before closing the day.");

  const updated = await repo.updateDeliveryRun(runId, { status: short ? "short" : "delivered", note: note.trim(), completedAt: new Date().toISOString() });
  await notify(run.userId, {
    type: "application",
    title: short ? `${run.submitted} of ${run.target} applications sent today` : `${run.submitted} applications sent today`,
    body: short ? note.trim() : "Every application is in your tracker with its confirmation reference.",
    href: "/applications",
  });
  await audit(staff, short ? "delivery.closed_short" : "delivery.closed", "delivery_run", runId, { userId: run.userId, submitted: run.submitted, target: run.target });
  return updated;
}

/** The candidate-facing view: is the service actually working for me? */
export async function mySummary(user: User): Promise<DeliverySummary> {
  const repo = await userRepo();
  const since = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const [runs, answers, { target, paused }] = await Promise.all([
    repo.listDeliveryRuns({ userId: user.id, since, limit: 14 }),
    repo.getAnswers(user.id),
    dailyTarget(user.id),
  ]);

  const day = today();
  const todayRun = runs.find((r) => r.day === day);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000).toISOString().slice(0, 10);
    const run = runs.find((r) => r.day === d);
    return { day: d, submitted: run?.submitted ?? 0, target: run?.target ?? (isWorkingDay(d) ? target : 0) };
  });

  // A streak is consecutive working days, most recent first, that met their target.
  let streakDays = 0;
  for (const r of [...runs].sort((a, b) => b.day.localeCompare(a.day))) {
    if (r.day === day) continue;
    if (!isWorkingDay(r.day)) continue;
    if (r.status === "delivered") streakDays++;
    else break;
  }

  const all = await repo.listDeliveryRuns({ userId: user.id, limit: 400 });
  return {
    target,
    today: { submitted: todayRun?.submitted ?? 0, status: todayRun?.status ?? (isWorkingDay(day) ? "scheduled" : "skipped") },
    last7Days,
    submittedTotal: all.reduce((n, r) => n + r.submitted, 0),
    streakDays,
    paused,
    blocking: completeness(answers ?? emptyAnswers(user.id)).blocking,
  };
}

/** Pauses or resumes the service without touching the subscription. */
export async function setPaused(user: User, paused: boolean, reason = "") {
  const repo = await userRepo();
  const answers = (await repo.getAnswers(user.id)) ?? emptyAnswers(user.id);
  const saved = await repo.patchAnswerSection(user.id, "delivery", { ...answers.delivery, paused, pauseReason: paused ? reason.trim() : "" });
  await audit(user, paused ? "delivery.paused" : "delivery.resumed", "application_answers", user.id, paused ? { reason: reason.trim() } : {});
  return saved.delivery;
}

/** The operator console: every run for a day, with the candidates who still need work. */
export async function board(staff: User, day = today()) {
  if (!isOperator(staff)) throw new AppError("forbidden", "Only application specialists can see the delivery board.");
  const repo = systemRepo();
  const runs = await repo.listDeliveryRuns({ day, limit: 500 });
  const totals = runs.reduce(
    (acc, r) => ({ target: acc.target + r.target, submitted: acc.submitted + r.submitted, short: acc.short + (r.status === "short" ? 1 : 0) }),
    { target: 0, submitted: 0, short: 0 },
  );
  return { day, runs, totals, mine: runs.filter((r) => r.operatorId === staff.id) };
}
