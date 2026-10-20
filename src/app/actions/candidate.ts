"use server";

import { z } from "zod";
import { userRepo } from "@/lib/data";
import { AccountNameSchema, ApplicationStatusSchema, SettingsSchema } from "@/lib/domain/schemas";
import * as apps from "@/lib/services/applications";
import { cancelSubscription, changePlan } from "@/lib/services/billing";
import { setMatchVisibility } from "@/lib/services/jobs";
import * as profile from "@/lib/services/profile";
import * as skillsService from "@/lib/services/skills";
import { deleteMyAccount } from "@/lib/services/privacy";
import { redirect } from "next/navigation";
import * as tailoring from "@/lib/services/tailoring";
import { audit } from "@/lib/services/audit";
import { AppError } from "@/lib/infra/errors";
import {
  BackgroundAnswersSchema,
  DeliveryPreferencesSchema,
  EligibilityAnswersSchema,
  PromoCodeInputSchema,
  ScreeningAnswersSchema,
  SelfIdentificationSchema,
} from "@/lib/domain/schemas";
import * as answers from "@/lib/services/answers";
import * as delivery from "@/lib/services/delivery";
import { listPlans } from "@/lib/services/billing";
import { quoteDiscount } from "@/lib/services/partners";
import { run } from "./_wrap";

const id = z.string().min(1).max(64);

/* ---------- jobs ---------- */

export async function saveJobAction(jobId: string) {
  return run("jobs.save", async (u) => (await apps.saveJob(u, id.parse(jobId))).id, { message: "Saved to your shortlist" });
}

export async function dismissMatchAction(jobId: string) {
  return run("jobs.dismiss", (u) => setMatchVisibility(u, id.parse(jobId), "dismissed"), { message: "Hidden from your feed" });
}

export async function restoreMatchAction(jobId: string) {
  return run("jobs.restore", (u) => setMatchVisibility(u, id.parse(jobId), "new"), { message: "Restored to your feed" });
}

/* ---------- applications ---------- */

export async function moveApplicationAction(applicationId: string, status: string) {
  return run("applications.move", async (u) => (await apps.moveApplication(u, id.parse(applicationId), ApplicationStatusSchema.parse(status))).status);
}

export async function submitForReviewAction(applicationId: string) {
  return run("applications.review", async (u) => (await apps.submitForReview(u, id.parse(applicationId))).status, { message: "Sent to a human specialist" });
}

export async function updateNotesAction(applicationId: string, notes: string) {
  return run("applications.notes", async (u) => void (await apps.updateNotes(u, id.parse(applicationId), z.string().max(5000).parse(notes))), { message: "Notes saved", refresh: false });
}

export async function addNoteAction(applicationId: string, message: string) {
  return run("applications.addNote", async (u) => void (await apps.addNote(u, id.parse(applicationId), z.string().trim().min(1).max(1000).parse(message))));
}

export async function setNextStepAction(applicationId: string, label: string, at: string) {
  return run("applications.nextStep", async (u) => {
    const step = label.trim() ? { label: z.string().trim().min(2).max(120).parse(label), at: z.iso.datetime({ offset: true }).or(z.iso.date()).parse(at) } : null;
    await apps.setNextStep(u, id.parse(applicationId), step ? { ...step, at: new Date(step.at).toISOString() } : null);
  }, { message: "Next step updated" });
}

/* ---------- tailoring ---------- */

export async function generateTailoringAction(jobId: string) {
  return run("tailoring.generate", async (u) => (await tailoring.generateTailoring(u, id.parse(jobId))).document.id, { message: "Tailoring ready for your review" });
}

export async function decideBulletAction(documentId: string, bulletId: string, decision: string) {
  return run("tailoring.bullet", async (u) => void (await tailoring.decideBullet(u, id.parse(documentId), id.parse(bulletId), z.enum(["accepted", "rejected", "pending"]).parse(decision))));
}

export async function saveCoverLetterAction(documentId: string, text: string) {
  return run("tailoring.cover", async (u) => void (await tailoring.updateCoverLetter(u, id.parse(documentId), z.string().trim().min(50, "Cover letter looks too short").max(8000).parse(text))), { message: "Cover letter saved" });
}

export async function approveTailoringAction(documentId: string) {
  return run("tailoring.approve", async (u) => void (await tailoring.approveDocument(u, id.parse(documentId))), { message: "Approved — ready for human review" });
}

/* ---------- profile ---------- */

export async function updateProfileAction(input: unknown) {
  return run("profile.update", async (u) => void (await profile.updateProfile(u, input)), { message: "Profile saved — re-ranking your matches" });
}

export async function completeOnboardingAction(input: unknown) {
  return run("onboarding.complete", (u) => profile.completeOnboarding(u, input), { refresh: false });
}

export async function uploadResumeAction(form: FormData) {
  return run("resume.upload", async (u) => {
    const file = form.get("file");
    if (!(file instanceof File)) throw new z.ZodError([{ code: "custom", path: ["file"], message: "Choose a file", input: null }]);
    const res = await profile.uploadResume(u, file, { name: String(form.get("name") ?? ""), makePrimary: form.get("primary") === "on" });
    return { id: res.resume.id, name: res.resume.name, extracted: res.extracted };
  }, { message: "Resume uploaded" });
}

export async function uploadAvatarAction(form: FormData) {
  return run("avatar.upload", async (u) => {
    const file = form.get("file");
    if (!(file instanceof File)) throw new z.ZodError([{ code: "custom", path: ["file"], message: "Choose an image", input: null }]);
    return profile.uploadAvatar(u, file);
  }, { message: "Profile photo updated" });
}

export async function removeAvatarAction() {
  return run("avatar.remove", (u) => profile.deleteAvatar(u), { message: "Profile photo removed" });
}

export async function deleteResumeAction(resumeId: string) {
  return run("resume.delete", (u) => profile.deleteResume(u, id.parse(resumeId)), { message: "Resume deleted" });
}

export async function setPrimaryResumeAction(resumeId: string) {
  return run("resume.primary", (u) => profile.setPrimaryResume(u, id.parse(resumeId)), { message: "Primary resume updated" });
}

export async function rematchAction() {
  return run("matching.rematch", (u) => profile.rematchNow(u), { message: "Matches refreshed" });
}

/* ---------- application answers ---------- */

export async function saveEligibilityAnswersAction(input: unknown) {
  return run("answers.eligibility", (u) => answers.saveSection(u, "eligibility", EligibilityAnswersSchema.parse(input)), { message: "Work eligibility saved" });
}

export async function saveScreeningAnswersAction(input: unknown) {
  return run("answers.screening", (u) => answers.saveSection(u, "screening", ScreeningAnswersSchema.parse(input)), { message: "Employer questions saved" });
}

export async function saveBackgroundAnswersAction(input: unknown) {
  return run("answers.background", (u) => answers.saveSection(u, "background", BackgroundAnswersSchema.parse(input)), { message: "Background answers saved" });
}

export async function saveSelfIdentificationAction(input: unknown) {
  return run("answers.selfId", (u) => answers.saveSection(u, "selfIdentification", SelfIdentificationSchema.parse(input)), { message: "Self-identification saved" });
}

export async function saveDeliveryPreferencesAction(input: unknown) {
  return run("answers.delivery", (u) => answers.saveSection(u, "delivery", DeliveryPreferencesSchema.parse(input)), { message: "Preferences saved — your specialist has been told" });
}

/* ---------- managed delivery ---------- */

export async function pauseDeliveryAction(reason: string) {
  return run("delivery.pause", (u) => delivery.setPaused(u, true, z.string().trim().min(3, "Tell us why").max(200).parse(reason)), { message: "Applications paused" });
}

export async function resumeDeliveryAction() {
  return run("delivery.resume", (u) => delivery.setPaused(u, false), { message: "Applications resumed — back to work tomorrow morning" });
}

/* ---------- promo codes ---------- */

export async function applyPromoCodeAction(code: string, planId: string, interval: string) {
  return run("promo.apply", async () => {
    const plans = await listPlans();
    const plan = plans.find((p) => p.id === z.enum(["entry", "professional", "executive"]).parse(planId));
    if (!plan) throw new AppError("not_found", "That plan isn't available.");
    const gross = z.enum(["month", "year"]).parse(interval) === "year" ? plan.priceYearly : plan.priceMonthly;
    return quoteDiscount(PromoCodeInputSchema.parse(code), plan.id, gross, plan.currency);
  }, { refresh: false });
}

/* ---------- settings & account ---------- */

export async function updateSettingsAction(input: unknown) {
  return run("settings.update", async (u) => {
    const data = SettingsSchema.parse(input);
    await (await userRepo()).upsertSettings({ ...data, userId: u.id });
    await audit(u, "settings.updated", "user_settings", u.id);
  }, { message: "Preferences saved" });
}

export async function updateAccountAction(fullName: string) {
  return run("account.update", async (u) => {
    await (await userRepo()).updateUser(u.id, { fullName: AccountNameSchema.parse(fullName) });
    await audit(u, "account.updated", "user", u.id);
  }, { message: "Account updated" });
}

export async function changePlanAction(planId: string, interval: string, acceptedTerms: boolean, promoCode = "") {
  return run("billing.change", async (u) => {
    if (acceptedTerms !== true) throw new AppError("validation", "Please agree to the Terms & Conditions before paying.");
    const plan = z.enum(["entry", "professional", "executive"]).parse(planId);
    const every = z.enum(["month", "year"]).parse(interval);
    await changePlan(u, plan, every, PromoCodeInputSchema.parse(promoCode) || undefined);
    await audit(u, "billing.terms_accepted", "user", u.id, { planId, termsVersion: "2026-10-17" });
  }, { message: "Plan updated" });
}

export async function cancelPlanAction() {
  return run("billing.cancel", (u) => cancelSubscription(u), { message: "Your plan will end at the close of this period" });
}

export async function markNotificationsReadAction(ids?: string[]) {
  return run("notifications.read", async (u) => (await userRepo()).markNotificationsRead(u.id, ids ? z.array(id).max(100).parse(ids) : undefined));
}

export async function requestSkillAction(name: string, context = "") {
  return run("skills.request", async (u) => {
    const r = await skillsService.requestSkill(u, { name, context });
    return { id: r.id, name: r.name, status: r.status };
  }, { message: "Sent for review — we'll notify you when it's decided" });
}

export async function deleteAccountAction(confirmation: string) {
  const res = await run("privacy.delete", (u) => deleteMyAccount(u, z.string().max(20).parse(confirmation)), { refresh: false });
  if (res.ok) redirect("/?account=deleted");
  return res;
}
