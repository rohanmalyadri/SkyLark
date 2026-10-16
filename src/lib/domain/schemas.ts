import { z } from "zod";
import { checkGithub, checkLinkedin, checkPortfolio, type LinkCheck } from "@/lib/validation/links";
import { implausibleTokens, nameProblem, textProblem, tidyName } from "@/lib/validation/text";
import { APPLICATION_STATUSES, DEGREE_LEVELS } from "./types";

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

export const VerificationDecisionSchema = z
  .object({
    decision: z.enum(["approved", "changes_requested", "rejected"]),
    note: z.string().trim().max(2000),
  })
  .refine((d) => d.decision === "approved" || d.note.length >= 10, { path: ["note"], message: "Explain what the candidate needs to change (at least 10 characters)" });
