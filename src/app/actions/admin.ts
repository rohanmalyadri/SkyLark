"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { PLANS_TAG } from "@/lib/services/public";
import * as admin from "@/lib/services/admin";
import { markSubmitted } from "@/lib/services/applications";
import * as reviews from "@/lib/services/reviews";
import { runWorker } from "@/lib/pipeline/worker";
import { audit } from "@/lib/services/audit";
import { decideSkillRequest } from "@/lib/services/skills";
import { STAFF_ROLES } from "@/lib/auth/dal";
import type { User } from "@/lib/domain/types";
import {
  CloseRunSchema,
  LeadUpdateSchema,
  PartnerCreateSchema,
  PartnerUpdateSchema,
  PromoCodeSaveSchema,
  RecordSubmissionSchema,
} from "@/lib/domain/schemas";
import * as answersService from "@/lib/services/answers";
import * as delivery from "@/lib/services/delivery";
import * as leads from "@/lib/services/leads";
import * as partners from "@/lib/services/partners";
import { run } from "./_wrap";

const STAFF = [...STAFF_ROLES] as User["role"][];
/** Submitting applications and reading a candidate's answers is an operator job. */
const OPERATORS = ["operator", "admin"] as User["role"][];
const ADMIN_ONLY = ["admin"] as User["role"][];
/* ---------- managed delivery ---------- */

export async function claimDeliveryRunAction(runId: string) {
  return run("delivery.claim", (u) => delivery.claimRun(u, id.parse(runId)), { roles: OPERATORS, message: "Run claimed — it's yours for today" });
}

export async function recordSubmissionAction(input: unknown) {
  return run("delivery.record", async (u) => {
    const res = await delivery.recordSubmission(u, RecordSubmissionSchema.parse(input));
    return { submitted: res.run.submitted, target: res.run.target };
  }, { roles: OPERATORS, message: "Submission recorded with proof" });
}

export async function closeDeliveryRunAction(input: unknown) {
  return run("delivery.close", async (u) => {
    const data = CloseRunSchema.parse(input);
    return (await delivery.closeRun(u, data.runId, data.note)).status;
  }, { roles: OPERATORS, message: "Day closed out" });
}

export async function scheduleDeliveryDayAction() {
  return run("delivery.schedule", () => delivery.scheduleDay(), { roles: ADMIN_ONLY, message: "Today's runs scheduled" });
}

/* ---------- partners & promo codes ---------- */

export async function createPartnerAction(input: unknown) {
  return run("partner.create", async (u) => {
    const p = await partners.createPartner(u, PartnerCreateSchema.parse(input));
    return { id: p.id, promoCode: p.promoCode, linkToken: p.linkToken };
  }, { roles: ADMIN_ONLY, message: "Partner created with their code and share link" });
}

export async function updatePartnerAction(partnerId: string, input: unknown) {
  return run("partner.update", async (u) => void (await partners.updatePartner(u, id.parse(partnerId), PartnerUpdateSchema.parse(input))), { roles: ADMIN_ONLY, message: "Partner updated" });
}

export async function savePromoCodeAction(input: unknown) {
  return run("promo.save", async (u) => {
    const data = PromoCodeSaveSchema.parse(input);
    const saved = await partners.savePromoCode(u, { ...data, startsAt: new Date(data.startsAt).toISOString(), expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null });
    updateTag(PLANS_TAG);
    return saved.code;
  }, { roles: ADMIN_ONLY, message: "Promo code saved" });
}

/* ---------- leads ---------- */

export async function updateLeadAction(leadId: string, input: unknown) {
  return run("lead.update", async (u) => (await leads.updateLead(u, id.parse(leadId), LeadUpdateSchema.parse(input))).status, { roles: STAFF, message: "Lead updated" });
}

/* ---------- answer vault (staff) ---------- */

export async function unlockSelfIdentificationAction(userId: string, reason: string) {
  return run("answers.unlock", async (u) => {
    const res = await answersService.answersForStaff(u, id.parse(userId), { includeSelfIdentification: true, reason: z.string().trim().max(300).parse(reason) });
    return res.answers.selfIdentification;
  }, { roles: OPERATORS, refresh: false });
}

const id = z.string().min(1).max(64);

export async function claimReviewAction(reviewId: string) {
  return run("review.claim", (u) => reviews.claimReview(u, id.parse(reviewId)), { roles: STAFF, message: "Review claimed" });
}

export async function toggleChecklistAction(reviewId: string, key: string, done: boolean) {
  return run("review.checklist", (u) => reviews.toggleChecklist(u, id.parse(reviewId), z.string().max(40).parse(key), z.boolean().parse(done)), { roles: STAFF });
}

export async function completeReviewAction(reviewId: string, outcome: string, notes: string) {
  return run(
    "review.complete",
    (u) => reviews.completeReview(u, id.parse(reviewId), z.enum(["approved", "changes_requested"]).parse(outcome), z.string().max(2000).parse(notes)),
    { roles: STAFF, message: outcome === "approved" ? "Review approved" : "Changes requested" },
  );
}

export async function markSubmittedAction(applicationId: string) {
  return run("application.submit", async (u) => void (await markSubmitted(u, id.parse(applicationId))), { roles: STAFF, message: "Marked as applied" });
}

export async function triggerIngestionAction(sourceId: string) {
  return run("pipeline.ingest", async (u) => {
    const res = await admin.triggerIngestion(u, z.string().max(40).parse(sourceId));
    return { created: res.created };
  }, { roles: ["admin"], message: "Ingestion queued" });
}

export async function retryJobAction(jobId: string) {
  return run("pipeline.retry", (u) => admin.retryBackgroundJob(u, id.parse(jobId)), { roles: ["admin"], message: "Job re-queued" });
}

export async function runWorkerAction() {
  return run("pipeline.worker", async (u) => {
    const res = await runWorker({ limit: 25, budgetMs: 25_000 });
    await audit(u, "pipeline.worker_run", "background_job", null, res);
    return res;
  }, { roles: ["admin"] });
}

export async function updatePlanAction(planId: string, input: unknown) {
  return run(
    "plans.update",
    async (u) => {
      await admin.updatePlan(u, z.enum(["entry", "professional", "executive"]).parse(planId), input);
      updateTag(PLANS_TAG);
    },
    { roles: ["admin"], message: "Pricing updated" },
  );
}

export async function decideVerificationAction(userId: string, decision: string, note: string) {
  return run(
    "verification.decide",
    async (u) => void (await admin.decideVerification(u, id.parse(userId), { decision, note })),
    { roles: STAFF, message: decision === "approved" ? "Profile approved" : decision === "rejected" ? "Profile rejected" : "Changes requested" },
  );
}

export async function refreshEnrichmentAction(userId: string) {
  return run("verification.refresh", async (u) => void (await admin.refreshCandidateEnrichment(u, id.parse(userId))), { roles: STAFF, message: "GitHub data refreshed" });
}

export async function decideSkillRequestAction(requestId: string, decision: string, note: string) {
  return run("skills.decide", async (u) => void (await decideSkillRequest(u, id.parse(requestId), { decision, note })), { roles: STAFF, message: decision === "approved" ? "Skill approved" : "Request rejected" });
}
