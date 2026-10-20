import type {
  AnswerSection,
  Application,
  ApplicationAnswers,
  ApplicationEvent,
  ApplicationStatus,
  ApplicationWithJob,
  AuditLog,
  BackgroundJob,
  BackgroundJobStatus,
  CandidateProfile,
  Company,
  DeliveryRun,
  DeliveryRunStatus,
  DeliveryRunWithContext,
  HumanReview,
  HumanReviewWithContext,
  IngestionRun,
  Job,
  JobWithCompany,
  Lead,
  LeadStatus,
  Match,
  MatchStatus,
  MatchWithJob,
  Notification,
  Partner,
  Payment,
  Plan,
  PlanId,
  ProfileVerification,
  PromoCode,
  Referral,
  ReferralStatus,
  SelfIdentification,
  Resume,
  SkillRequest,
  SkillRequestStatus,
  ReviewStatus,
  Role,
  Subscription,
  TailoredDocument,
  User,
  UserSettings,
  VerificationStatus,
} from "@/lib/domain/types";

export interface MatchQuery {
  minScore?: number;
  status?: MatchStatus[];
  limit?: number;
}

export interface AdminStats {
  candidates: number;
  activeJobs: number;
  applications: number;
  reviewQueue: number;
  reviewsOverdue: number;
  failedJobs: number;
  applicationsByStatus: Record<ApplicationStatus, number>;
  applicationsPerDay: { date: string; count: number }[];
  matchesPerDay: { date: string; count: number }[];
  /** Managed-delivery health for today: how many runs are on target. */
  delivery: { runs: number; delivered: number; short: number; submitted: number; target: number };
  newLeads: number;
}

export interface DeliveryRunQuery {
  userId?: string;
  /** Exact working day, YYYY-MM-DD. */
  day?: string;
  /** Inclusive lower bound on `day`. */
  since?: string;
  status?: DeliveryRunStatus[];
  operatorId?: string;
  limit?: number;
}

export interface LeadQuery {
  status?: LeadStatus[];
  search?: string;
  limit?: number;
}

export type NewRow<T> = Omit<T, "id" | "createdAt"> & { id?: string; createdAt?: string };

/**
 * Persistence boundary for the whole product. Services depend on this interface only,
 * so storage can move between Supabase/Postgres and the in-memory demo store freely.
 */
export interface Repository {
  /* users */
  getUser(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  listUsers(opts?: { role?: Role; search?: string; limit?: number }): Promise<User[]>;
  createUser(user: NewRow<User>): Promise<User>;
  updateUser(id: string, patch: Partial<Pick<User, "fullName" | "avatarUrl" | "onboardedAt" | "role">>): Promise<User>;
  /** Erases an account and everything owned by it; audit entries are kept but stripped of the IP address. */
  deleteUserData(id: string): Promise<void>;

  /* profiles */
  getProfile(userId: string): Promise<CandidateProfile | null>;
  upsertProfile(profile: CandidateProfile): Promise<CandidateProfile>;
  listProfiles(limit?: number): Promise<CandidateProfile[]>;

  /* profile verification (server- and staff-written only) */
  getVerification(userId: string): Promise<ProfileVerification | null>;
  upsertVerification(v: Omit<ProfileVerification, "updatedAt">): Promise<ProfileVerification>;
  listVerifications(opts?: { status?: VerificationStatus[]; limit?: number }): Promise<ProfileVerification[]>;

  /* skill review requests (server-written) */
  createSkillRequest(r: NewRow<SkillRequest>): Promise<SkillRequest>;
  getSkillRequest(id: string): Promise<SkillRequest | null>;
  listSkillRequests(opts?: { status?: SkillRequestStatus[]; userId?: string; limit?: number }): Promise<SkillRequest[]>;
  updateSkillRequest(id: string, patch: Partial<Pick<SkillRequest, "status" | "note" | "reviewedBy" | "reviewedAt">>): Promise<SkillRequest>;

  /* resumes */
  listResumes(userId: string): Promise<Resume[]>;
  getResume(userId: string, id: string): Promise<Resume | null>;
  createResume(resume: NewRow<Resume>): Promise<Resume>;
  deleteResume(userId: string, id: string): Promise<void>;
  setPrimaryResume(userId: string, id: string): Promise<void>;

  /* companies & jobs */
  listCompanies(): Promise<Company[]>;
  upsertCompany(company: NewRow<Company>): Promise<Company>;
  listJobs(opts?: { status?: Job["status"]; limit?: number; search?: string }): Promise<JobWithCompany[]>;
  getJob(id: string): Promise<JobWithCompany | null>;
  findJobsByFingerprint(fingerprints: string[]): Promise<string[]>;
  insertJobs(jobs: NewRow<Job>[]): Promise<Job[]>;
  updateJob(id: string, patch: Partial<Pick<Job, "status">>): Promise<void>;
  /** Marks listings as still live at the source (re-opening any that had been closed). */
  touchJobs(fingerprints: string[], seenAt: string): Promise<number>;
  /** Closes active listings the source no longer shows, or that are too old to still be open. */
  closeStaleJobs(opts: { source?: string; seenBefore?: string; postedBefore?: string }): Promise<number>;

  /* matches */
  listMatches(userId: string, query?: MatchQuery): Promise<MatchWithJob[]>;
  getMatch(userId: string, jobId: string): Promise<Match | null>;
  upsertMatches(matches: NewRow<Omit<Match, "updatedAt">>[]): Promise<number>;
  setMatchStatus(userId: string, jobId: string, status: MatchStatus): Promise<void>;

  /* applications */
  listApplications(userId: string): Promise<ApplicationWithJob[]>;
  listAllApplications(opts?: { status?: ApplicationStatus; limit?: number }): Promise<(ApplicationWithJob & { candidateName: string })[]>;
  getApplication(id: string): Promise<ApplicationWithJob | null>;
  getApplicationForJob(userId: string, jobId: string): Promise<Application | null>;
  createApplication(app: NewRow<Omit<Application, "updatedAt">>): Promise<Application>;
  updateApplication(id: string, patch: Partial<Omit<Application, "id" | "userId" | "jobId" | "createdAt">>): Promise<Application>;
  listEvents(applicationId: string): Promise<ApplicationEvent[]>;
  addEvent(event: NewRow<ApplicationEvent>): Promise<ApplicationEvent>;
  listRecentActivity(userId: string, limit: number): Promise<(ApplicationEvent & { jobTitle: string; companyName: string })[]>;

  /* tailoring */
  getTailoredDocument(id: string): Promise<TailoredDocument | null>;
  getLatestTailored(userId: string, jobId: string): Promise<TailoredDocument | null>;
  createTailoredDocument(doc: NewRow<Omit<TailoredDocument, "updatedAt">>): Promise<TailoredDocument>;
  countTailoredSince(userId: string, since: string): Promise<number>;
  countReviewsSince(userId: string, since: string): Promise<number>;
  updateTailoredDocument(id: string, patch: Partial<Pick<TailoredDocument, "bullets" | "coverLetter" | "summary" | "status">>): Promise<TailoredDocument>;

  /* human review */
  listReviews(opts?: { status?: ReviewStatus[]; limit?: number }): Promise<HumanReviewWithContext[]>;
  getReview(id: string): Promise<HumanReviewWithContext | null>;
  getReviewForApplication(applicationId: string): Promise<HumanReview | null>;
  createReview(review: NewRow<HumanReview>): Promise<HumanReview>;
  updateReview(id: string, patch: Partial<Omit<HumanReview, "id" | "applicationId" | "createdAt">>): Promise<HumanReview>;

  /* billing */
  listPlans(opts?: { includeInactive?: boolean }): Promise<Plan[]>;
  updatePlan(id: PlanId, patch: Partial<Omit<Plan, "id">>): Promise<Plan>;
  getSubscription(userId: string): Promise<Subscription | null>;
  upsertSubscription(sub: NewRow<Subscription>): Promise<Subscription>;
  listPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: NewRow<Payment>): Promise<Payment>;

  /* notifications & settings */
  listNotifications(userId: string, limit?: number): Promise<Notification[]>;
  createNotification(n: NewRow<Notification>): Promise<Notification>;
  markNotificationsRead(userId: string, ids?: string[]): Promise<void>;
  getSettings(userId: string): Promise<UserSettings>;
  upsertSettings(settings: UserSettings): Promise<UserSettings>;

  /* audit */
  addAudit(entry: NewRow<AuditLog>): Promise<void>;
  listAudit(opts?: { limit?: number; entityType?: string; entityId?: string; actorId?: string }): Promise<AuditLog[]>;

  /* background jobs */
  enqueue(job: Pick<BackgroundJob, "type" | "payload"> & Partial<Pick<BackgroundJob, "idempotencyKey" | "runAfter" | "maxAttempts">>): Promise<{ job: BackgroundJob; created: boolean }>;
  claimJobs(limit: number, now: string): Promise<BackgroundJob[]>;
  completeJob(id: string): Promise<void>;
  failJob(id: string, error: string, retryAt: string | null): Promise<void>;
  retryJob(id: string): Promise<void>;
  listBackgroundJobs(opts?: { status?: BackgroundJobStatus[]; limit?: number }): Promise<BackgroundJob[]>;
  createIngestionRun(run: NewRow<IngestionRun>): Promise<IngestionRun>;
  updateIngestionRun(id: string, patch: Partial<Omit<IngestionRun, "id" | "source" | "startedAt">>): Promise<void>;
  listIngestionRuns(limit?: number): Promise<IngestionRun[]>;

  /* application answers (the reusable answer vault) */
  /**
   * The vault without EEO self-identification. That column is revoked from every browser
   * session in Postgres, so this is the only shape a session-bound repository can read.
   */
  getAnswers(userId: string): Promise<ApplicationAnswers | null>;
  /**
   * The EEO answers on their own. Requires the privileged repository: callers must have
   * established either that the reader owns the row, or that a specialist unlocked it for a
   * named form (which is audited).
   */
  getSelfIdentification(userId: string): Promise<SelfIdentification | null>;
  upsertAnswers(answers: Omit<ApplicationAnswers, "updatedAt">): Promise<ApplicationAnswers>;
  /** Patches one section, leaving the others untouched. */
  patchAnswerSection<K extends AnswerSection>(userId: string, section: K, value: ApplicationAnswers[K]): Promise<ApplicationAnswers>;

  /* managed delivery */
  getDeliveryRun(userId: string, day: string): Promise<DeliveryRun | null>;
  getDeliveryRunById(id: string): Promise<DeliveryRunWithContext | null>;
  createDeliveryRun(run: NewRow<DeliveryRun>): Promise<DeliveryRun>;
  updateDeliveryRun(id: string, patch: Partial<Omit<DeliveryRun, "id" | "userId" | "day" | "createdAt">>): Promise<DeliveryRun>;
  listDeliveryRuns(query?: DeliveryRunQuery): Promise<DeliveryRunWithContext[]>;
  /** Candidates whose plan entitles them to delivery and who have no run for `day` yet. */
  candidatesNeedingDelivery(day: string, limit: number): Promise<{ userId: string; planId: PlanId }[]>;

  /* partners & referrals */
  getPartner(id: string): Promise<Partner | null>;
  getPartnerByPromoCode(code: string): Promise<Partner | null>;
  getPartnerByLinkToken(token: string): Promise<Partner | null>;
  getPartnerForUser(userId: string): Promise<Partner | null>;
  listPartners(opts?: { status?: Partner["status"]; limit?: number }): Promise<Partner[]>;
  createPartner(partner: NewRow<Partner>): Promise<Partner>;
  updatePartner(id: string, patch: Partial<Pick<Partner, "name" | "email" | "status" | "payout" | "note" | "userId">>): Promise<Partner>;
  createReferral(referral: NewRow<Referral>): Promise<Referral>;
  getReferral(partnerId: string, userId: string): Promise<Referral | null>;
  listReferrals(opts?: { partnerId?: string; userId?: string; status?: ReferralStatus[]; limit?: number }): Promise<Referral[]>;
  updateReferral(id: string, patch: Partial<Pick<Referral, "status" | "userId" | "planId" | "amount" | "currency" | "convertedAt">>): Promise<Referral>;

  /* promo codes */
  getPromoCode(code: string): Promise<PromoCode | null>;
  listPromoCodes(opts?: { activeOnly?: boolean; limit?: number }): Promise<PromoCode[]>;
  upsertPromoCode(code: Omit<PromoCode, "redemptions" | "createdAt"> & Partial<Pick<PromoCode, "redemptions" | "createdAt">>): Promise<PromoCode>;
  /** Counts a redemption. Returns false when the code has hit its cap, so callers can refuse it. */
  redeemPromoCode(code: string): Promise<boolean>;

  /* leads */
  createLead(lead: NewRow<Omit<Lead, "updatedAt">>): Promise<Lead>;
  listLeads(query?: LeadQuery): Promise<Lead[]>;
  updateLead(id: string, patch: Partial<Pick<Lead, "status" | "ownerId" | "note">>): Promise<Lead>;

  /* idempotency & analytics */
  getIdempotentResponse(key: string): Promise<unknown | null>;
  saveIdempotentResponse(key: string, response: unknown): Promise<void>;
  adminStats(now: string): Promise<AdminStats>;
}
