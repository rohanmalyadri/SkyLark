import { z } from "zod";
import { checkGithub, checkLinkedin, checkPortfolio, type LinkCheck } from "@/lib/validation/links";
import { implausibleTokens, nameProblem, textProblem, tidyName } from "@/lib/validation/text";
import { APPLICATION_STATUSES, DEGREE_LEVELS, DISABILITY_STATUSES, GENDER_IDENTITIES, LEAD_STATUSES, RACE_ETHNICITIES, TERNARY, VETERAN_STATUSES } from "./types";

/*
 * Input schemas. They run in the browser for inline feedback and again on the server, which is
 * authoritative. Checks that need the network or reference data (skill vocabularies, the city
 * dataset, GitHub, email DNS) run only on the server, in the services.
 */

const country = z.string().regex(/^[A-Z]{2}$/, "Use a 2-letter country code");
const shortText = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer`);
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Free text that must read as real words ("jhfavd" is rejected). */
const plausible = (min: number, max: number, what: string) =>
  z
    .string()
    .trim()
    .min(min, min <= 1 ? `${what} is required` : `${what} should be at least ${min} characters`)
    .max(max, `Use ${max} characters or fewer`)
    .superRefine((v, ctx) => {
      const problem = textProblem(v, what);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    });

const optionalPlausible = (max: number, what: string) =>
  shortText(max).superRefine((v, ctx) => {
    const problem = textProblem(v, what);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  });

const PersonName = z
  .string()
  .superRefine((v, ctx) => {
    const problem = nameProblem(v);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .transform(tidyName);

export const SignUpSchema = z
  .object({
    fullName: PersonName,
    email: z.email("Enter a valid email").max(254).transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(10, "Use at least 10 characters")
      .max(128)
      .regex(/[a-zA-Z]/, "Include a letter")
      .regex(/[0-9]/, "Include a number"),
  })
  .superRefine((v, ctx) => {
    const local = v.email.split("@")[0] ?? "";
    if (local.length >= 4 && v.password.toLowerCase().includes(local)) ctx.addIssue({ code: "custom", path: ["password"], message: "Don't use your email address in your password" });
  });

export const SignInSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password").max(128),
});

export const AccountNameSchema = PersonName;

export const SkillSchema = z.object({
  name: z.string().trim().min(1, "Enter a skill").max(60),
  level: z.number().int().min(1).max(5).transform((v) => v as 1 | 2 | 3 | 4 | 5),
  years: z.number().min(0).max(50, "Use 50 years or fewer"),
});

const currentMonth = () => new Date().toISOString().slice(0, 7);

export const ExperienceSchema = z
  .object({
    id: z.string().min(1).max(64),
    company: plausible(2, 80, "Company"),
    title: plausible(2, 80, "Job title"),
    startDate: z.string().regex(MONTH, "Choose a start month"),
    endDate: z.string().regex(MONTH, "Choose an end month").nullable(),
    description: shortText(500),
    highlights: z.array(z.string().trim().min(1).max(300, "Keep each highlight under 300 characters")).max(8, "Up to 8 highlights"),
    skills: z.array(z.string().trim().min(1).max(60)).max(20),
  })
  .superRefine((e, ctx) => {
    const now = currentMonth();
    if (e.startDate < "1950-01") ctx.addIssue({ code: "custom", path: ["startDate"], message: "Check the start date" });
    if (e.startDate > now) ctx.addIssue({ code: "custom", path: ["startDate"], message: "Start date can't be in the future" });
    if (e.endDate && e.endDate > now) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date can't be in the future — mark the role as current instead" });
    if (e.endDate && e.endDate < e.startDate) ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be after the start date" });
    e.highlights.forEach((h, i) => {
      if (implausibleTokens(h).length >= 2) ctx.addIssue({ code: "custom", path: ["highlights", i], message: "This highlight has words that don't look real — check for typos" });
    });
  });

export const EducationSchema = z.object({
  id: z.string().min(1).max(64),
  school: plausible(2, 120, "School"),
  degree: z.enum(DEGREE_LEVELS, "Choose a qualification"),
  field: plausible(2, 80, "Field of study"),
  year: z
    .number("Enter a graduation year")
    .int()
    .min(1950, "Check the graduation year")
    .refine((y) => y <= new Date().getFullYear() + 7, "Graduation year is too far in the future"),
});

/** Normalises a link through its checker, or reports the checker's error on that field. */
const link = (check: (v: string) => LinkCheck) =>
  z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v, ctx) => {
      if (!v) return undefined;
      const res = check(v);
      if (!res.ok) {
        ctx.addIssue({ code: "custom", message: res.error });
        return z.NEVER;
      }
      return res.value;
    });

export const ProfileSchema = z
  .object({
    headline: optionalPlausible(140, "Headline"),
    summary: shortText(2000).superRefine((v, ctx) => {
      if (implausibleTokens(v).length >= 2) ctx.addIssue({ code: "custom", message: "Your summary has words that don't look real — check for typos" });
    }),
    location: z.object({ city: shortText(80), region: shortText(80).default(""), country: country.or(z.literal("")) }),
    citizenship: z.array(country).max(4),
    workAuthorizations: z.array(z.object({ country, status: z.enum(["citizen", "permanent_resident", "work_visa", "student_visa", "none"]) })).max(10),
    requiresSponsorship: z.boolean(),
    willingToRelocate: z.boolean(),
    relocationCountries: z.array(country).max(20),
    remotePreference: z.enum(["remote", "hybrid", "onsite", "any"]),
    preferredRoles: z.array(plausible(2, 60, "Role")).max(8, "Up to 8 roles"),
    preferredCountries: z.array(country).max(12),
    seniority: z.enum(["entry", "mid", "senior", "lead", "executive"]),
    yearsExperience: z.number().int().min(0).max(60),
    skills: z.array(SkillSchema).max(40, "Up to 40 skills"),
    experience: z.array(ExperienceSchema).max(15),
    education: z.array(EducationSchema).max(6),
    salaryExpectation: z.object({ min: z.number().int().min(1, "Enter an amount").max(5_000_000), currency: z.string().regex(/^[A-Z]{3}$/) }).nullable(),
    links: z.object({ linkedin: link(checkLinkedin), github: link(checkGithub), portfolio: link(checkPortfolio) }),
  })
  .superRefine((p, ctx) => {
    const seen = new Set<string>();
    p.skills.forEach((s, i) => {
      const k = s.name.toLowerCase();
      if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["skills", i, "name"], message: `${s.name} is listed twice` });
      seen.add(k);
    });
    const roles = new Set<string>();
    p.preferredRoles.forEach((r, i) => {
      if (roles.has(r.toLowerCase())) ctx.addIssue({ code: "custom", path: ["preferredRoles", i], message: "Listed twice" });
      roles.add(r.toLowerCase());
    });
  });
export type ProfileInput = z.infer<typeof ProfileSchema>;

export const ApplicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const SettingsSchema = z.object({
  emailDigest: z.enum(["daily", "weekly", "off"]),
  notifyNewMatches: z.boolean(),
  notifyReviewComplete: z.boolean(),
  notifyApplicationUpdates: z.boolean(),
  minMatchScore: z.number().int().min(0).max(100),
  timezone: z.string().min(1).max(64),
});

export const PlanUpdateSchema = z.object({
  name: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(140),
  priceMonthly: z.number().min(0).max(10_000),
  priceYearly: z.number().min(0).max(100_000),
  features: z.array(z.string().trim().min(2).max(120)).min(1).max(12),
  highlighted: z.boolean(),
  active: z.boolean(),
});

/* ---------- Application answer vault ---------- */

/*
 * A yes/no question is tri-state: `null` means unanswered. The forms submit `null` rather
 * than defaulting to false, so we never put an answer in a candidate's mouth.
 */
const yesNo = z.boolean().nullable();
const detail = (max: number) => z.string().trim().max(max, `Use ${max} characters or fewer`);
const DATE_ONLY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const EligibilityAnswersSchema = z.object({
  isOver18: yesNo,
  authorizedInTargetCountries: yesNo,
  needsSponsorshipNow: yesNo,
  needsFutureSponsorship: yesNo,
  canPerformEssentialFunctions: yesNo,
  canProvideRightToWorkDocuments: yesNo,
  earliestStartDate: z
    .string()
    .trim()
    .refine((v) => v === "" || DATE_ONLY.test(v), "Choose a date")
    .refine((v) => v === "" || v >= new Date().toISOString().slice(0, 10), "Your earliest start date can't be in the past"),
  noticePeriodDays: z.number().int().min(0).max(365, "Use 365 days or fewer").nullable(),
});

export const ScreeningAnswersSchema = z
  .object({
    appliedOrWorkedHereBefore: yesNo,
    relatedToCurrentEmployee: yesNo,
    relationshipDetails: detail(500),
    leftRoleForPolicyViolation: yesNo,
    policyViolationDetails: detail(1000),
    representedByAgency: yesNo,
    onsiteDaysPerWeek: z.number().int().min(0).max(7, "A week has 7 days").nullable(),
    boundByNonCompete: yesNo,
    nonCompeteDetails: detail(1000),
  })
  .superRefine((v, ctx) => {
    // A "yes" that employers will ask about needs the explanation with it, not later.
    if (v.relatedToCurrentEmployee && v.relationshipDetails.length < 3) ctx.addIssue({ code: "custom", path: ["relationshipDetails"], message: "Say who you're related to" });
    if (v.leftRoleForPolicyViolation && v.policyViolationDetails.length < 10) ctx.addIssue({ code: "custom", path: ["policyViolationDetails"], message: "Explain what happened, in your own words" });
    if (v.boundByNonCompete && v.nonCompeteDetails.length < 10) ctx.addIssue({ code: "custom", path: ["nonCompeteDetails"], message: "Summarise the restriction and when it ends" });
  });

export const BackgroundAnswersSchema = z
  .object({
    consentToBackgroundCheck: yesNo,
    consentToDrugScreen: yesNo,
    refusedOrFailedDrugTest: yesNo,
    convictedOfFelony: yesNo,
    felonyDetails: detail(2000),
    pendingChargesOrInvestigation: yesNo,
    pendingDetails: detail(2000),
  })
  .superRefine((v, ctx) => {
    if (v.convictedOfFelony && v.felonyDetails.length < 10) ctx.addIssue({ code: "custom", path: ["felonyDetails"], message: "Give the details you'd want an employer to read" });
    if (v.pendingChargesOrInvestigation && v.pendingDetails.length < 10) ctx.addIssue({ code: "custom", path: ["pendingDetails"], message: "Describe the pending matter" });
  });

/** Every field is optional and every field can be declined. */
export const SelfIdentificationSchema = z.object({
  gender: z.enum(GENDER_IDENTITIES).nullable(),
  genderSelfDescribed: detail(80),
  hispanicOrLatino: z.enum(TERNARY).nullable(),
  raceEthnicity: z.array(z.enum(RACE_ETHNICITIES)).max(RACE_ETHNICITIES.length),
  veteranStatus: z.enum(VETERAN_STATUSES).nullable(),
  disabilityStatus: z.enum(DISABILITY_STATUSES).nullable(),
});

export const DeliveryPreferencesSchema = z
  .object({
    excludedCompanies: z.array(z.string().trim().min(1).max(80)).max(50, "Up to 50 companies"),
    // Null is "my plan's maximum", so clearing the field is a valid answer.
    dailyTarget: z.number().int().min(1, "Apply to at least one role a day").max(60).nullable(),
    minScore: z.number().int().min(0).max(100),
    requireApprovalBeforeSubmit: z.boolean(),
    paused: z.boolean(),
    pauseReason: detail(200),
  })
  .refine((v) => !v.paused || v.pauseReason.length >= 3, { path: ["pauseReason"], message: "Tell us why, so your specialist knows when to resume" });

/* ---------- Managed delivery ---------- */

export const RecordSubmissionSchema = z.object({
  applicationId: z.string().min(1).max(64),
  confirmationRef: z.string().trim().max(120),
  portal: z.string().trim().min(2, "Name the portal you submitted through").max(60),
  screenshotPath: z.string().trim().max(300).nullable().optional(),
});

export const CloseRunSchema = z.object({
  runId: z.string().min(1).max(64),
  note: z.string().trim().max(1000),
});

/* ---------- Leads ---------- */

export const LeadSchema = z.object({
  name: PersonName,
  email: z.email("Enter a valid email").max(254).transform((v) => v.toLowerCase()),
  // Deliberately permissive: international numbers vary too much to validate strictly,
  // and a rejected real number costs more than a malformed one.
  phone: z.string().trim().min(5, "Enter a phone number").max(32).regex(/^[+0-9 ()-]+$/, "Use digits, spaces and + ( ) - only"),
  city: z.string().trim().min(2, "Enter your city").max(80),
  country: z.string().regex(/^[A-Z]{2}$/, "Choose a country").or(z.literal("")),
  message: z.string().trim().max(2000),
  source: z.string().trim().max(80).default("website:home"),
  promoCode: z.string().trim().max(24).default(""),
});

export const LeadUpdateSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  note: z.string().trim().max(2000).optional(),
  claim: z.boolean().optional(),
});

/* ---------- Partners & promo codes ---------- */

const PROMO = /^[A-Z0-9][A-Z0-9_-]{2,23}$/;
const promoCode = z
  .string()
  .trim()
  .transform((v) => v.toUpperCase())
  .refine((v) => PROMO.test(v), "Use 3-24 characters: letters, numbers, dashes or underscores");

export const PromoCodeInputSchema = z.string().trim().max(24);

export const PartnerCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter the partner's name").max(120),
  email: z.email("Enter a valid email").max(254),
  promoCode,
  perReferral: z.number().min(0).max(1000),
  flatMonthly: z.number().min(0).max(10_000),
  currency: z.string().regex(/^[A-Z]{3}$/, "Use a 3-letter currency code"),
  barter: z.boolean(),
  note: z.string().trim().max(1000),
  discountPercent: z.number().int().min(1, "Give their audience a real discount").max(50, "Keep discounts at 50% or below"),
});

export const PartnerUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.email().max(254).optional(),
  status: z.enum(["active", "paused"]).optional(),
  note: z.string().trim().max(1000).optional(),
  payout: z
    .object({
      perReferral: z.number().min(0).max(1000),
      flatMonthly: z.number().min(0).max(10_000),
      currency: z.string().regex(/^[A-Z]{3}$/),
      barter: z.boolean(),
    })
    .optional(),
});

export const PromoCodeSaveSchema = z
  .object({
    code: promoCode,
    kind: z.enum(["percent", "amount"]),
    value: z.number().positive("Enter a discount"),
    currency: z.string().regex(/^[A-Z]{3}$/),
    description: z.string().trim().max(200),
    partnerId: z.string().max(64).nullable(),
    appliesToPlans: z.array(z.enum(["entry", "professional", "executive"])).max(3),
    firstPeriodOnly: z.boolean(),
    maxRedemptions: z.number().int().positive().max(1_000_000).nullable(),
    startsAt: z.iso.datetime({ offset: true }).or(z.iso.date()),
    expiresAt: z.iso.datetime({ offset: true }).or(z.iso.date()).nullable(),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "percent" && v.value > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "A percentage can't exceed 100" });
    if (v.expiresAt && new Date(v.expiresAt) <= new Date(v.startsAt)) ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "The end date must be after the start date" });
  });

export const VerificationDecisionSchema = z
  .object({
    decision: z.enum(["approved", "changes_requested", "rejected"]),
    note: z.string().trim().max(2000),
  })
  .refine((d) => d.decision === "approved" || d.note.length >= 10, { path: ["note"], message: "Explain what the candidate needs to change (at least 10 characters)" });
