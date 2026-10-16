export type Role = "candidate" | "reviewer" | "operator" | "admin";

export type Seniority = "entry" | "mid" | "senior" | "lead" | "executive";
export type WorkMode = "remote" | "hybrid" | "onsite";
export type RemotePreference = WorkMode | "any";
export type AuthStatus = "citizen" | "permanent_resident" | "work_visa" | "student_visa" | "none";
export type SponsorshipPolicy = "yes" | "no" | "unknown";
export type SponsorshipHistory = "frequent" | "occasional" | "none" | "unknown";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl: string | null;
  onboardedAt: string | null;
  createdAt: string;
}

export interface Place {
  city: string;
  country: string; // ISO 3166-1 alpha-2
}

export interface WorkAuthorization {
  country: string;
  status: AuthStatus;
}

export interface Skill {
  name: string;
  level: 1 | 2 | 3 | 4 | 5;
  years: number;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  startDate: string; // YYYY-MM
  endDate: string | null;
  description: string;
  highlights: string[];
  skills: string[];
}

export const DEGREE_LEVELS = ["High school", "Certificate or bootcamp", "Diploma", "Associate", "Bachelor's", "Master's", "MBA", "Doctorate"] as const;
export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

export interface Education {
  id: string;
  school: string;
  degree: DegreeLevel;
  field: string;
  /** Graduation year (or expected graduation year). */
  year: number;
}

export interface SalaryExpectation {
  min: number;
  currency: string;
}

/** A candidate's home location. `region` is the state, province or region name. */
export interface HomeLocation extends Place {
  region: string;
}

export interface CandidateProfile {
  userId: string;
  headline: string;
  summary: string;
  location: HomeLocation;
  citizenship: string[];
  workAuthorizations: WorkAuthorization[];
  requiresSponsorship: boolean;
  willingToRelocate: boolean;
  relocationCountries: string[];
  remotePreference: RemotePreference;
  preferredRoles: string[];
  preferredCountries: string[];
  seniority: Seniority;
  yearsExperience: number;
  skills: Skill[];
  experience: Experience[];
  education: Education[];
  salaryExpectation: SalaryExpectation | null;
  links: { linkedin?: string; github?: string; portfolio?: string };
  updatedAt: string;
}

/* ---------- Skill review requests ---------- */

export type SkillRequestStatus = "pending" | "approved" | "rejected";

/** A skill missing from every recognised vocabulary, submitted by a candidate for staff review. */
export interface SkillRequest {
  id: string;
  userId: string;
  name: string;
  /** Why the candidate thinks it's a real skill (optional context for reviewers). */
  context: string;
  status: SkillRequestStatus;
  note: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/* ---------- Profile verification ---------- */

export type VerificationStatus = "pending" | "approved" | "changes_requested" | "rejected";

export interface ProfileFlag {
  code: string;
  severity: "info" | "warning";
  message: string;
  field?: string;
}

export interface GithubProject {
  name: string;
  description: string;
  url: string;
  language: string | null;
  stars: number;
  topics: string[];
  pushedAt: string;
}

/** Public GitHub data fetched through the official REST API. Never edited by the candidate. */
export interface GithubEnrichment {
  status: "verified" | "not_found" | "unavailable";
  username: string;
  profileUrl: string;
  name: string | null;
  bio: string | null;
  publicRepos: number;
  followers: number;
  accountCreatedAt: string | null;
  languages: { name: string; repos: number }[];
  /** Canonical skills evidenced by the candidate's own public repositories. */
  verifiedSkills: string[];
  projects: GithubProject[];
  fetchedAt: string;
  error?: string;
}

export interface ProfileEnrichment {
  github?: GithubEnrichment;
}

/** Human approval state of a candidate profile. Written only by the server and staff. */
export interface ProfileVerification {
  userId: string;
  status: VerificationStatus;
  note: string;
  flags: ProfileFlag[];
  enrichment: ProfileEnrichment;
  submittedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** What the reviewer saw when approving, so later additions aren't presented as reviewed. */
  approvedSnapshot: { skills: string[]; links: string[] } | null;
  updatedAt: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  size: string;
  headquarters: Place;
  description: string;
  sponsorshipHistory: SponsorshipHistory;
  website: string;
  brandColor: string;
}

export interface Salary {
  min: number;
  max: number;
  currency: string;
}

export interface Job {
  id: string;
  companyId: string;
  title: string;
  department: string;
  seniority: Seniority;
  employmentType: "full_time" | "contract" | "part_time";
  locations: Place[];
  workMode: WorkMode;
  remoteCountries: string[];
  salary: Salary | null;
  description: string;
  responsibilities: string[];
  requirements: string[];
  requiredSkills: string[];
  niceToHaveSkills: string[];
  minYears: number;
  visaSponsorship: SponsorshipPolicy;
  source: string;
  sourceUrl: string;
  externalId: string;
  fingerprint: string;
  status: "active" | "closed";
  postedAt: string;
  /** Last time the source still listed this posting; stale listings are closed. */
  lastSeenAt: string;
  createdAt: string;
}

export interface JobWithCompany extends Job {
  company: Company;
}

/* ---------- Matching ---------- */

export type FactorKey = "skills" | "experience" | "education" | "eligibility" | "location" | "sponsorship" | "preferences";
export type FactorRating = "strong" | "moderate" | "weak" | "blocked";
export type Eligibility = "eligible" | "needs_sponsorship" | "ineligible";

export interface MatchFactor {
  key: FactorKey;
  label: string;
  rating: FactorRating;
  score: number; // 0..100
  weight: number; // 0..1
  reason: string;
}

export interface MatchBreakdown {
  factors: MatchFactor[];
  eligibility: Eligibility;
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  /** Matched skills backed by the candidate's public GitHub repositories. */
  verifiedSkills?: string[];
  summary: string;
  modelVersion: string;
}

export type MatchStatus = "new" | "saved" | "dismissed" | "applied";

export interface Match {
  id: string;
  userId: string;
  jobId: string;
  score: number;
  breakdown: MatchBreakdown;
  status: MatchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MatchWithJob extends Match {
  job: JobWithCompany;
}

/* ---------- Applications ---------- */

export const APPLICATION_STATUSES = [
  "saved",
  "preparing",
  "human_review",
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const PIPELINE_STAGES = ["discovered", "matched", "tailored", "reviewed", "applied"] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  matchId: string | null;
  status: ApplicationStatus;
  stage: PipelineStage;
  tailoredDocumentId: string | null;
  notes: string;
  nextStep: { label: string; at: string } | null;
  appliedAt: string | null;
  /** Evidence of submission, written when the application is actually sent. */
  proof?: SubmissionProof | null;
  /** The managed-delivery run that submitted this, when a specialist did it. */
  deliveryRunId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationWithJob extends Application {
  job: JobWithCompany;
  score: number | null;
}

export type EventActor = "candidate" | "ai" | "reviewer" | "operator" | "system";

export interface ApplicationEvent {
  id: string;
  applicationId: string;
  type: "created" | "status_change" | "note" | "ai" | "review" | "system";
  actor: EventActor;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

/* ---------- Tailoring & review ---------- */

export interface BulletSuggestion {
  id: string;
  original: string;
  suggested: string;
  reason: string;
  decision: "pending" | "accepted" | "rejected";
}

export interface SkillAlignment {
  skill: string;
  status: "matched" | "transferable" | "missing";
  evidence: string;
}

export interface TailoredDocument {
  id: string;
  userId: string;
  jobId: string;
  applicationId: string | null;
  resumeId: string | null;
  version: number;
  summary: string;
  bullets: BulletSuggestion[];
  coverLetter: string;
  skillAlignment: SkillAlignment[];
  recommendations: string[];
  provider: string;
  model: string;
  status: "draft" | "approved";
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = "queued" | "in_review" | "approved" | "changes_requested";

export interface ReviewChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export interface HumanReview {
  id: string;
  applicationId: string;
  reviewerId: string | null;
  status: ReviewStatus;
  priority: "normal" | "high";
  checklist: ReviewChecklistItem[];
  notes: string;
  slaDueAt: string;
  createdAt: string;
  completedAt: string | null;
}

export interface HumanReviewWithContext extends HumanReview {
  application: ApplicationWithJob;
  candidate: Pick<User, "id" | "fullName" | "email">;
  reviewerName: string | null;
}

/* ---------- Documents ---------- */

export interface Resume {
  id: string;
  userId: string;
  name: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  isPrimary: boolean;
  parsedText: string | null;
  createdAt: string;
}

/* ---------- Application answer vault ---------- */

/**
 * The questions every employer portal asks and nobody wants to answer twice.
 * Answered once here, then reused on every application. `null` means "not answered yet"
 * so an unanswered question is never silently submitted as "no".
 */

export const GENDER_IDENTITIES = ["woman", "man", "non_binary", "self_describe", "decline"] as const;
export type GenderIdentity = (typeof GENDER_IDENTITIES)[number];

export const RACE_ETHNICITIES = [
  "american_indian_or_alaska_native",
  "asian",
  "black_or_african_american",
  "hispanic_or_latino",
  "native_hawaiian_or_pacific_islander",
  "white",
  "two_or_more",
  "decline",
] as const;
export type RaceEthnicity = (typeof RACE_ETHNICITIES)[number];

export const VETERAN_STATUSES = ["not_a_veteran", "protected_veteran", "veteran_not_protected", "decline"] as const;
export type VeteranStatus = (typeof VETERAN_STATUSES)[number];

export const DISABILITY_STATUSES = ["yes", "no", "decline"] as const;
export type DisabilityStatus = (typeof DISABILITY_STATUSES)[number];

export const TERNARY = ["yes", "no", "decline"] as const;
export type Ternary = (typeof TERNARY)[number];

/** Right-to-work questions. These do feed eligibility screening. */
export interface EligibilityAnswers {
  isOver18: boolean | null;
  authorizedInTargetCountries: boolean | null;
  needsSponsorshipNow: boolean | null;
  needsFutureSponsorship: boolean | null;
  canPerformEssentialFunctions: boolean | null;
  canProvideRightToWorkDocuments: boolean | null;
  /** Earliest date the candidate could start, as YYYY-MM-DD. */
  earliestStartDate: string;
  noticePeriodDays: number | null;
}

/** Employer-relationship questions, asked by most large-company portals. */
export interface ScreeningAnswers {
  appliedOrWorkedHereBefore: boolean | null;
  relatedToCurrentEmployee: boolean | null;
  relationshipDetails: string;
  leftRoleForPolicyViolation: boolean | null;
  policyViolationDetails: string;
  representedByAgency: boolean | null;
  /** Days per week the candidate will attend an office, when a role requires it. */
  onsiteDaysPerWeek: number | null;
  boundByNonCompete: boolean | null;
  nonCompeteDetails: string;
}

/** Background-check consents and disclosures. */
export interface BackgroundAnswers {
  consentToBackgroundCheck: boolean | null;
  consentToDrugScreen: boolean | null;
  refusedOrFailedDrugTest: boolean | null;
  convictedOfFelony: boolean | null;
  felonyDetails: string;
  pendingChargesOrInvestigation: boolean | null;
  pendingDetails: string;
}

/**
 * Voluntary EEO self-identification. Collected because portals ask for it, never used
 * for matching, ranking or any AI prompt, and withheld from staff unless a specialist
 * explicitly unlocks it to complete a form — which is audited.
 */
export interface SelfIdentification {
  gender: GenderIdentity | null;
  genderSelfDescribed: string;
  hispanicOrLatino: Ternary | null;
  raceEthnicity: RaceEthnicity[];
  veteranStatus: VeteranStatus | null;
  disabilityStatus: DisabilityStatus | null;
}

/** How the candidate wants the service to apply on their behalf. */
export interface DeliveryPreferences {
  /** Employers never to apply to, by name. */
  excludedCompanies: string[];
  /** Applications per working day the candidate wants. `null` means their plan's maximum. */
  dailyTarget: number | null;
  /** Only apply to roles scoring at least this much. */
  minScore: number;
  requireApprovalBeforeSubmit: boolean;
  /** Pause the service without cancelling, e.g. while on holiday. */
  paused: boolean;
  pauseReason: string;
}

export const ANSWER_SECTIONS = ["eligibility", "screening", "background", "selfIdentification", "delivery"] as const;
export type AnswerSection = (typeof ANSWER_SECTIONS)[number];

export interface ApplicationAnswers {
  userId: string;
  eligibility: EligibilityAnswers;
  screening: ScreeningAnswers;
  background: BackgroundAnswers;
  selfIdentification: SelfIdentification;
  delivery: DeliveryPreferences;
  updatedAt: string;
}

export interface SectionCompleteness {
  section: AnswerSection;
  label: string;
  answered: number;
  total: number;
  /** Self-identification is always optional, so it never blocks submission. */
  required: boolean;
  missing: string[];
}

export interface AnswerCompleteness {
  sections: SectionCompleteness[];
  /** 0..100 across the required sections only. */
  score: number;
  /** True when every required question is answered and the service can submit forms. */
  readyToSubmit: boolean;
  blocking: string[];
}

/* ---------- Billing ---------- */

export type PlanId = "entry" | "professional" | "executive";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  limits: { matchesPerWeek: number | null; tailoredPerMonth: number | null; humanReviewsPerMonth: number | null; applicationsPerDay: number };
  highlighted: boolean;
  sortOrder: number;
  active: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  interval: "month" | "year";
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface Payment {
  id: string;
  userId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  status: "succeeded" | "failed" | "refunded" | "pending";
  provider: string;
  providerRef: string;
  description: string;
  createdAt: string;
}

/* ---------- Managed delivery (applications submitted for the candidate) ---------- */

export type DeliveryRunStatus = "scheduled" | "in_progress" | "delivered" | "short" | "skipped";

/**
 * One working day of the done-for-you promise, per candidate. The run is the unit the
 * service is held to: a target taken from the plan, what was actually submitted, and why
 * if it fell short.
 */
export interface DeliveryRun {
  id: string;
  userId: string;
  /** The working day this run covers, as YYYY-MM-DD. */
  day: string;
  target: number;
  submitted: number;
  status: DeliveryRunStatus;
  operatorId: string | null;
  note: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface DeliveryRunWithContext extends DeliveryRun {
  candidateName: string;
  candidateEmail: string;
  operatorName: string | null;
}

/** Proof that an application really was submitted, so the candidate never has to trust us. */
export interface SubmissionProof {
  submittedBy: "candidate" | "specialist";
  operatorId: string | null;
  /** Employer-side confirmation number, when the portal issues one. */
  confirmationRef: string;
  /** Which portal took the application, e.g. "Workday", "Greenhouse". */
  portal: string;
  screenshotPath: string | null;
  submittedAt: string;
}

/** What a candidate sees about the service working for them. */
export interface DeliverySummary {
  target: number;
  today: { submitted: number; status: DeliveryRunStatus };
  last7Days: { day: string; submitted: number; target: number }[];
  submittedTotal: number;
  streakDays: number;
  paused: boolean;
  /** Required answers still missing, which stop us submitting anything. */
  blocking: string[];
}

/* ---------- Partners (affiliate programme) ---------- */

export interface PartnerPayout {
  /** Paid per converted referral. */
  perReferral: number;
  /** Paid monthly regardless of volume. */
  flatMonthly: number;
  currency: string;
  /** Paid in kind rather than cash. */
  barter: boolean;
}

export interface Partner {
  id: string;
  /** Set when the partner also has a Skylark login. */
  userId: string | null;
  name: string;
  email: string;
  /** The code a candidate types at checkout. Upper-case, unique. */
  promoCode: string;
  /** Opaque token for the partner's share link, /r/<linkToken>. */
  linkToken: string;
  status: "active" | "paused";
  payout: PartnerPayout;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export type ReferralStatus = "visited" | "signed_up" | "converted" | "void";

export interface Referral {
  id: string;
  partnerId: string;
  /** Null until the visitor creates an account. */
  userId: string | null;
  promoCode: string;
  status: ReferralStatus;
  planId: PlanId | null;
  /** Amount the referred customer paid, in `currency`. */
  amount: number;
  currency: string;
  convertedAt: string | null;
  createdAt: string;
}

export interface PartnerStats {
  partner: Partner;
  visits: number;
  signUps: number;
  conversions: number;
  revenue: number;
  earnings: number;
  currency: string;
  byDay: { day: string; signUps: number; conversions: number }[];
  recent: Referral[];
}

/* ---------- Promo codes ---------- */

export interface PromoCode {
  code: string;
  kind: "percent" | "amount";
  /** Percent off (1..100) or a fixed amount in `currency`. */
  value: number;
  currency: string;
  description: string;
  partnerId: string | null;
  /** Empty means every plan. */
  appliesToPlans: PlanId[];
  /** Only discount the first billing period. */
  firstPeriodOnly: boolean;
  maxRedemptions: number | null;
  redemptions: number;
  startsAt: string;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface DiscountQuote {
  code: string;
  description: string;
  /** Price before the discount. */
  gross: number;
  discount: number;
  /** What the customer actually pays. */
  net: number;
  currency: string;
  firstPeriodOnly: boolean;
}

/* ---------- Leads (people who ask us to get in touch) ---------- */

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  /** E.164-ish, stored with the dialling code the visitor chose. */
  phone: string;
  city: string;
  country: string;
  message: string;
  /** Which page or campaign produced the lead. */
  source: string;
  promoCode: string;
  status: LeadStatus;
  ownerId: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------- Notifications, settings, audit ---------- */

export interface Notification {
  id: string;
  userId: string;
  type: "match" | "review" | "application" | "system" | "billing";
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface UserSettings {
  userId: string;
  emailDigest: "daily" | "weekly" | "off";
  notifyNewMatches: boolean;
  notifyReviewComplete: boolean;
  notifyApplicationUpdates: boolean;
  minMatchScore: number;
  timezone: string;
}

export interface AuditLog {
  id: string;
  actorId: string | null;
  actorRole: Role | "system";
  action: string;
  entityType: string;
  entityId: string | null;
  meta: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}

/* ---------- Pipeline ---------- */

export type BackgroundJobType = "ingest_source" | "match_candidate" | "match_job" | "tailor_application" | "send_notification";
export type BackgroundJobStatus = "queued" | "running" | "succeeded" | "failed" | "dead";

export interface BackgroundJob {
  id: string;
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  status: BackgroundJobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  idempotencyKey: string | null;
  runAfter: string;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface IngestionRun {
  id: string;
  source: string;
  status: "running" | "succeeded" | "failed";
  fetched: number;
  normalized: number;
  duplicates: number;
  inserted: number;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}
