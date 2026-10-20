# Graph Report - AutoApply  (2026-10-19)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2034 nodes · 7452 edges · 78 communities (65 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 110 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f34fd0cd`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MemoryRepository
- systemRepo
- Repository
- stage-shapes.ts
- engine.ts
- fields.tsx
- dal.ts
- services/admin.ts
- ServerEnv
- cn
- repository.ts
- next
- Panel
- domain/types.ts
- Button
- useAction
- dataset.ts
- verify.ts
- candidate.ts
- jobs/[id]/page.tsx
- dashboard/page.tsx
- services/profile.ts
- check
- schemas.ts
- normalize.ts
- app-shell.tsx
- SupabaseRepository
- delivery.ts
- (marketing)/page.tsx
- sources.ts
- pricing-table.tsx
- constants.ts
- geo.ts
- package.json
- supabase.ts
- dependencies
- marketing/motion.tsx
- demo-session.ts
- verification.ts
- [slug]/page.tsx
- compilerOptions
- devDependencies
- admin/jobs/page.tsx
- seed.ts
- (marketing)/pricing/page.tsx
- PageMotion
- smooth-anchors.tsx
- app/layout.tsx
- auth-forms.tsx
- email.ts
- marks.tsx
- HumanReview
- helpers.ts
- ApplicationStatus
- text.ts
- validation.test.ts
- profile/page.tsx
- Skeleton
- scripts
- vitest
- hero-scene.tsx
- admin/page.tsx
- site-header.tsx
- SkillRequest
- toReview
- emptySelfIdentification
- textProblem
- .upsertProfile
- toSkillRequest
- toTailored
- eslint.config.mjs
- .createResume
- .listPromoCodes
- .createIngestionRun
- .createNotification
- .getSettings
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `Repository` - 193 edges
2. `cn()` - 135 edges
3. `systemRepo()` - 130 edges
4. `SupabaseRepository` - 115 edges
5. `MemoryRepository` - 114 edges
6. `check()` - 104 edges
7. `next` - 88 edges
8. `Button` - 82 edges
9. `clone()` - 81 edges
10. `AppError` - 71 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `buildDataset()`  [EXTRACTED]
  scripts/seed.ts → src/lib/seed/dataset.ts
- `CatalogStatus` --indirect_call--> `isSampleJob()`  [INFERRED]
  src/lib/services/catalog.ts → src/lib/pipeline/source-meta.ts
- `PrivacyPanel()` --indirect_call--> `deleteAccountAction()`  [INFERRED]
  src/components/app/settings/privacy-panel.tsx → src/app/actions/candidate.ts
- `AccountForm()` --indirect_call--> `updateAccountAction()`  [INFERRED]
  src/components/app/settings/settings-forms.tsx → src/app/actions/candidate.ts
- `BillingPanel()` --indirect_call--> `cancelPlanAction()`  [INFERRED]
  src/components/app/settings/settings-forms.tsx → src/app/actions/candidate.ts

## Import Cycles
- None detected.

## Communities (78 total, 13 thin omitted)

### Community 0 - "MemoryRepository"
Cohesion: 0.04
Nodes (4): clone(), MemoryRepository, nowIso(), defaultSettings()

### Community 1 - "systemRepo"
Cohesion: 0.08
Nodes (70): applyPromoCodeAction(), isOperator(), systemRepo(), userRepo(), AppError, forbidden(), notFound(), assertStaff() (+62 more)

### Community 2 - "Repository"
Cohesion: 0.04
Nodes (13): DrawerData, Repository, Application, ApplicationEvent, ApplicationWithJob, DeliveryRun, DeliveryRunWithContext, IngestionRun (+5 more)

### Community 3 - "stage-shapes.ts"
Cohesion: 0.07
Nodes (21): setupProcess(), Anim, Anim01, Anim02, Anim03, Anim04, getSection(), getSectionProgress() (+13 more)

### Community 4 - "engine.ts"
Cohesion: 0.06
Nodes (51): AnthropicProvider, ExtractionSchema, TailoringSchema, BACKEND, FRONTEND, GERUND_PAST, HeuristicProvider, heuristicTailor() (+43 more)

### Community 5 - "fields.tsx"
Cohesion: 0.09
Nodes (54): framer-motion, completeOnboardingAction(), removeAvatarAction(), updateProfileAction(), uploadAvatarAction(), uploadResumeAction(), Finishing(), OnboardingWizard() (+46 more)

### Community 6 - "dal.ts"
Cohesion: 0.10
Nodes (40): server-only, zod, signUpAction(), runPublic(), submitLeadAction(), GET(), GET(), GET() (+32 more)

### Community 7 - "services/admin.ts"
Cohesion: 0.08
Nodes (46): authorized(), GET(), maxDuration, fallback, getAIProvider(), withFallback(), emit(), Level (+38 more)

### Community 8 - "ServerEnv"
Cohesion: 0.09
Nodes (45): AuthState, demoAction(), googleAction(), safeNext(), signInAction(), GET(), GET(), GET() (+37 more)

### Community 9 - "cn"
Cohesion: 0.10
Nodes (42): radix-ui, signOutAction(), ResumeManager(), NotificationsButton(), UserMenu(), canMove(), CardBody(), Column() (+34 more)

### Community 10 - "repository.ts"
Cohesion: 0.05
Nodes (23): day(), g, Store, DeliveryRunQuery, LeadQuery, MatchQuery, AnswerSection, ApplicationAnswers (+15 more)

### Community 11 - "next"
Cohesion: 0.09
Nodes (40): nextConfig, securityHeaders, next, Audit(), AuditPage(), FILTERS, metadata, Delivery() (+32 more)

### Community 12 - "Panel"
Cohesion: 0.12
Nodes (43): createPartnerAction(), savePromoCodeAction(), updatePartnerAction(), pauseDeliveryAction(), resumeDeliveryAction(), metadata, Partners(), PartnersPage() (+35 more)

### Community 13 - "domain/types.ts"
Cohesion: 0.04
Nodes (37): ANSWER_SECTIONS, AnswerCompleteness, BackgroundAnswers, BackgroundJobStatus, BackgroundJobType, DegreeLevel, DeliveryPreferences, DeliverySummary (+29 more)

### Community 14 - "Button"
Cohesion: 0.10
Nodes (38): lucide-react, react, sonner, ADMIN_ONLY, claimDeliveryRunAction(), claimReviewAction(), closeDeliveryRunAction(), completeReviewAction() (+30 more)

### Community 15 - "useAction"
Cohesion: 0.12
Nodes (39): decideSkillRequestAction(), decideVerificationAction(), refreshEnrichmentAction(), updateLeadAction(), PlanEditor(), LeadRow(), STATUS_TONE, RefreshGithubButton() (+31 more)

### Community 16 - "dataset.ts"
Cohesion: 0.10
Nodes (34): CandidateProfile, Company, Role, Seniority, SponsorshipPolicy, WorkMode, SAMPLE_SOURCE, COMPANIES (+26 more)

### Community 17 - "verify.ts"
Cohesion: 0.11
Nodes (37): skillCheck(), ACRONYMS, byKey, canonicalSkillName(), dedupe(), editDistance(), lookupLocal(), prettifyTag() (+29 more)

### Community 18 - "candidate.ts"
Cohesion: 0.13
Nodes (35): addNoteAction(), approveTailoringAction(), cancelPlanAction(), changePlanAction(), decideBulletAction(), deleteAccountAction(), deleteResumeAction(), dismissMatchAction() (+27 more)

### Community 19 - "jobs/[id]/page.tsx"
Cohesion: 0.18
Nodes (30): Jobs(), metadata, Review(), ReviewPage(), HISTORY, JobDetail(), JobPage(), metadata (+22 more)

### Community 20 - "dashboard/page.tsx"
Cohesion: 0.13
Nodes (28): ActivityRow(), ACTOR_STYLE, Dashboard(), DashboardPage(), metadata, TaskRow(), Insights(), Jobs() (+20 more)

### Community 21 - "services/profile.ts"
Cohesion: 0.12
Nodes (29): GET(), memoryStore(), partnerForLink(), deleteMyAccount(), completeOnboarding(), deleteAvatar(), deleteResume(), setPrimaryResume() (+21 more)

### Community 22 - "check"
Cohesion: 0.08
Nodes (5): check(), toBgJob(), toEvent(), toLead(), toPartner()

### Community 23 - "schemas.ts"
Cohesion: 0.06
Nodes (30): AccountNameSchema, ApplicationStatusSchema, BackgroundAnswersSchema, CloseRunSchema, country, DeliveryPreferencesSchema, EducationSchema, EligibilityAnswersSchema (+22 more)

### Community 24 - "normalize.ts"
Cohesion: 0.12
Nodes (25): heuristicExtract(), NewRow, Salary, CASE_SENSITIVE, clip(), decodeEntities(), DEGREE_RE, requiredDegree() (+17 more)

### Community 25 - "app-shell.tsx"
Cohesion: 0.17
Nodes (23): AdminLayout(), CandidateLayout(), AppShell(), RoleSwitch(), ShellUser(), Variant, Command, CommandPalette() (+15 more)

### Community 26 - "SupabaseRepository"
Cohesion: 0.10
Nodes (4): SupabaseRepository, toDeliveryRun(), toReferral(), toUser()

### Community 27 - "delivery.ts"
Cohesion: 0.18
Nodes (23): emptyAnswers(), answered(), answersForStaff(), assertReadyToSubmit(), completeness(), FOLLOW_UPS, myAnswers(), myAnswerStatus() (+15 more)

### Community 28 - "(marketing)/page.tsx"
Cohesion: 0.13
Nodes (22): GET(), Disciplines(), International(), LandingPage(), LatestWriting(), metadata, Numbers(), STEPS (+14 more)

### Community 29 - "sources.ts"
Cohesion: 0.10
Nodes (16): getJson(), UpstreamError, RawPosting, ADZUNA_CURRENCY, AdzunaPage, AdzunaSource, ArbeitnowPage, ArbeitnowSource (+8 more)

### Community 30 - "pricing-table.tsx"
Cohesion: 0.17
Nodes (21): quotePromoCodeAction(), CurrencyPicker(), limit(), PricingTable(), PromoBox(), PromoState, restatesLimit(), usePromoCode() (+13 more)

### Community 31 - "constants.ts"
Cohesion: 0.11
Nodes (22): Candidate(), CandidatePage(), FlagItem(), metadata, Row(), when(), ICON, NEXT (+14 more)

### Community 32 - "geo.ts"
Cohesion: 0.15
Nodes (22): GET(), GET(), collator, countries, COUNTRY_ALIASES, countryByName, countryCodes, findCity() (+14 more)

### Community 33 - "package.json"
Cohesion: 0.08
Nodes (23): name, private, version, @anthropic-ai/sdk, class-variance-authority, clsx, country-state-city, d3-geo (+15 more)

### Community 34 - "supabase.ts"
Cohesion: 0.11
Nodes (11): fromCompany(), fromJob(), Row, toAudit(), toCompany(), toJob(), toJobWithCompany(), toMatch() (+3 more)

### Community 35 - "dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @anthropic-ai/sdk, class-variance-authority, clsx, country-state-city, @dnd-kit/core, framer-motion, gsap (+14 more)

### Community 36 - "marketing/motion.tsx"
Cohesion: 0.22
Nodes (17): MarketingLayout(), AutoCarousel(), Cursor(), HomeMotion(), isDesktop(), px(), reduced(), setupArc() (+9 more)

### Community 37 - "demo-session.ts"
Cohesion: 0.15
Nodes (15): @supabase/ssr, b64(), createDemoToken(), demoSessionSecret(), DEV_SESSION_SECRET, Payload, SESSION_TTL_SECONDS, sign() (+7 more)

### Community 38 - "verification.ts"
Cohesion: 0.18
Nodes (15): emptyProfile(), ProfileInput, GithubEnrichment, fetchGithubProfile(), GhRepo, GhUser, headers(), skillsFromRepos() (+7 more)

### Community 39 - "[slug]/page.tsx"
Cohesion: 0.25
Nodes (14): BlogIndexPage(), metadata, PostMeta(), generateMetadata(), generateStaticParams(), PostPage(), PostBody(), allPosts() (+6 more)

### Community 40 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 41 - "devDependencies"
Cohesion: 0.12
Nodes (17): devDependencies, d3-geo, dotenv, @electric-sql/pglite, eslint, eslint-config-next, @playwright/test, tailwindcss (+9 more)

### Community 42 - "admin/jobs/page.tsx"
Cohesion: 0.19
Nodes (15): CandidatesPage(), href(), List(), metadata, SORTS, TABS, AdminJobsPage(), Applications() (+7 more)

### Community 43 - "seed.ts"
Cohesion: 0.14
Nodes (8): dotenv, @supabase/supabase-js, admin, existingAuthUsers(), main(), repo, toSubscription(), toVerification()

### Community 44 - "(marketing)/pricing/page.tsx"
Cohesion: 0.20
Nodes (12): Plans(), metadata, PlansAndComparison(), PricingPage(), ROWS, FAQ, FaqList(), exchangeRates() (+4 more)

### Community 45 - "PageMotion"
Cohesion: 0.20
Nodes (11): metadata, PrivacyPage(), initials(), MEMBERS, metadata, TeamPage(), metadata, TermsPage() (+3 more)

### Community 46 - "smooth-anchors.tsx"
Cohesion: 0.27
Nodes (10): nextFrame(), SmoothAnchors(), waitForElement(), ease(), jumpTo(), prefersReducedMotion(), Scroller, scrollToId() (+2 more)

### Community 47 - "app/layout.tsx"
Cohesion: 0.20
Nodes (10): metadata, mono, RootLayout(), sans, serif, viewport, Providers(), EASE_OUT (+2 more)

### Community 48 - "auth-forms.tsx"
Cohesion: 0.33
Nodes (13): DemoAccounts(), DemoButton(), Divider(), fieldError(), GOOGLE_ERRORS, GoogleButton(), GoogleMark(), GoogleSubmit() (+5 more)

### Community 49 - "email.ts"
Cohesion: 0.18
Nodes (8): RFC-2606, RFC-5321, RFC-6761, RFC-7505, TtlCache, cache, DISPOSABLE, domainAcceptsMail()

### Community 50 - "marks.tsx"
Cohesion: 0.28
Nodes (9): AuthLayout(), NotFound(), metadata, Onboarding(), OnboardingPage(), Logo(), SkylarkMark(), requireUser() (+1 more)

### Community 51 - "HumanReview"
Cohesion: 0.17
Nodes (5): Props, HumanReview, HumanReviewWithContext, PipelineStage, ReviewStatus

### Community 52 - "helpers.ts"
Cohesion: 0.30
Nodes (6): demoSignIn(), signUp(), TEST_PASSWORD, typeSuggest(), uniqueEmail(), @playwright/test

### Community 53 - "ApplicationStatus"
Cohesion: 0.18
Nodes (5): AdminStats, fromApplicationPatch(), toApplication(), toAppWithJob(), ApplicationStatus

### Community 54 - "text.ts"
Cohesion: 0.20
Nodes (11): currentMonth(), ExperienceSchema, PersonName, ProfileSchema, implausibleTokens(), judgeToken(), KEYBOARD_ROWS, nameProblem() (+3 more)

### Community 55 - "validation.test.ts"
Cohesion: 0.26
Nodes (9): SignUpSchema, VerificationDecisionSchema, checkGithub(), checkLinkedin(), checkPortfolio(), LinkCheck, parseUrl(), RESERVED_GITHUB (+1 more)

### Community 56 - "profile/page.tsx"
Cohesion: 0.27
Nodes (9): Answers(), AnswersPage(), metadata, metadata, Profile(), ProfilePage(), SECTIONS, requireCandidate() (+1 more)

### Community 57 - "Skeleton"
Cohesion: 0.36
Nodes (9): Login(), LoginPage(), metadata, metadata, SignUp(), SignUpPage(), Skeleton(), googleSignInAvailable() (+1 more)

### Community 58 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, dev, lint, seed, start, test, test:db (+2 more)

### Community 59 - "vitest"
Cohesion: 0.20
Nodes (4): @electric-sql/pglite, vitest, db, root

### Community 60 - "hero-scene.tsx"
Cohesion: 0.31
Nodes (8): gsap, Cloud, CloudPlane, HeroScene(), lerp(), loadImage(), makeClouds(), REF

### Community 61 - "admin/page.tsx"
Cohesion: 0.39
Nodes (7): AdminOverviewPage(), metadata, Overview(), CategoryBars(), DailyBars(), APPLICATION_STATUSES, overview()

### Community 62 - "site-header.tsx"
Cohesion: 0.31
Nodes (6): NAV, STEPS_NAV, SECTION_NAV_EVENT, PATHS, StepIcon(), StepIconName

### Community 66 - "textProblem"
Cohesion: 0.40
Nodes (5): roleCheck(), optionalPlausible(), plausible(), shortText(), textProblem()

### Community 70 - "eslint.config.mjs"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

## Knowledge Gaps
- **14 isolated node(s):** `d3-geo`, `tailwindcss`, `@tailwindcss/turbopack`, `topojson-client`, `tsx` (+9 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 414 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `fields.tsx`, `dal.ts`, `services/admin.ts`, `ServerEnv`, `cn`, `Panel`, `Button`, `useAction`, `candidate.ts`, `jobs/[id]/page.tsx`, `dashboard/page.tsx`, `services/profile.ts`, `app-shell.tsx`, `(marketing)/page.tsx`, `pricing-table.tsx`, `constants.ts`, `geo.ts`, `package.json`, `marketing/motion.tsx`, `demo-session.ts`, `[slug]/page.tsx`, `admin/jobs/page.tsx`, `(marketing)/pricing/page.tsx`, `PageMotion`, `smooth-anchors.tsx`, `app/layout.tsx`, `auth-forms.tsx`, `marks.tsx`, `profile/page.tsx`, `Skeleton`, `admin/page.tsx`, `site-header.tsx`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `d3-geo`, `tailwindcss`, `@tailwindcss/turbopack` to the rest of the system?**
  _14 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MemoryRepository` be split into smaller, more focused modules?**
  _Cohesion score 0.039532794249775384 - nodes in this community are weakly interconnected._
- **Why does `SupabaseRepository` connect `SupabaseRepository` to `toReview`, `systemRepo`, `Repository`, `supabase.ts`, `toSkillRequest`, `toTailored`, `dal.ts`, `.createResume`, `emptySelfIdentification`, `.createIngestionRun`, `.createNotification`, `seed.ts`, `.upsertProfile`, `.listPromoCodes`, `.getSettings`, `ApplicationStatus`, `check`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `systemRepo` be split into smaller, more focused modules?**
  _Cohesion score 0.07993827160493827 - nodes in this community are weakly interconnected._
- **Why does `Repository` connect `Repository` to `MemoryRepository`, `dal.ts`, `repository.ts`, `domain/types.ts`, `dataset.ts`, `check`, `SupabaseRepository`, `supabase.ts`, `seed.ts`, `HumanReview`, `ApplicationStatus`, `SkillRequest`, `toReview`, `toSkillRequest`, `toTailored`, `.createResume`, `.listPromoCodes`, `.createIngestionRun`, `.createNotification`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Should `Repository` be split into smaller, more focused modules?**
  _Cohesion score 0.04024144869215292 - nodes in this community are weakly interconnected._