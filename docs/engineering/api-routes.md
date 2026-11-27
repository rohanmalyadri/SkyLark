# Every API the product uses

Skylark talks to its server in two ways:

- **API routes**: normal web addresses (`/api/...`, `/auth/...`) that return JSON, a file or a
  redirect. Used for lookups while typing, downloads, sign-in hand-offs, the public candidate API,
  and calls from Razorpay and Vercel Cron.
- **Server actions**: functions the browser calls when a button or form changes something ("Save
  job", "Pay", "Send message"). Next.js sends them as a POST to the page's own address. Every one
  goes through the same wrapper: sign-in check, role check, rate limit, input validation, clean
  error. They are listed below by name because they don't have a URL of their own.

Pages themselves don't call an API to load their data: the server reads the database while
building the page and sends finished HTML. So "opening the dashboard" is one page request, and the
calls listed under each screen are what happens when the person clicks something.

How errors look everywhere: `{ "error": { "code": "validation", "message": "...", "fieldErrors": { "field": ["..."] } } }`
for API routes, `{ ok: false, error, code, fieldErrors }` for actions. Unexpected failures never show
internals; they return a short reference code that matches a line in the server log.

## API routes

| Method and path | Who can call it | What it does |
|---|---|---|
| `GET /api/health` | Anyone | Says `ok` or `degraded` after one small database read. For uptime monitors. |
| `GET /api/geo/countries` | Anyone | List of countries for location pickers. Cached for a day. |
| `GET /api/geo/countries/{code}/regions` | Anyone (120/min per IP) | States or regions of one country. |
| `GET /api/geo/countries/{code}/cities?region=` | Anyone (120/min per IP) | Cities in a country, narrowed by region. |
| `GET /api/skills/suggest?q=` | Anyone (90/min per IP) | Skill name suggestions while typing, from our curated list plus ESCO and Stack Overflow. |
| `GET /api/roles/suggest?q=` | Anyone (90/min per IP) | Job title suggestions while typing, from ESCO. |
| `GET /api/v1/matches` | Signed-in candidate (300/min) | The candidate's ranked job matches with score, reasons per factor and missing skills. Same filters as the jobs page. |
| `GET /api/v1/applications` | Signed-in candidate (300/min) | The candidate's tracker: every saved or applied job and its status. |
| `POST /api/v1/applications` | Signed-in candidate (120/min) | Saves a job to the tracker. Needs an `Idempotency-Key` header so a retry never saves twice. |
| `GET /api/resumes/{id}` | The owner, or staff with `?owner=` | Downloads a resume through a 60-second signed link. Every download is written to the audit log. |
| `GET /api/avatars/{id}` | Signed-in users | Profile photos in demo mode (Supabase serves them directly in production). |
| `GET /api/me/export` | Signed-in user | Downloads everything we hold about the person as one JSON file (Settings → Your data). |
| `POST /api/webhooks/razorpay` | Razorpay only (signature checked) | Hears about subscription renewals, failed charges and cancellations, re-reads the subscription from Razorpay, and updates the plan. |
| `GET /api/cron/worker` | Vercel Cron only (secret checked) | Daily at 09:00 UTC: queues job imports, opens the day's application runs and works through queued background jobs. |
| `GET /auth/callback` | Browser, from Supabase | Finishes Google sign-in or an email link: swaps the one-time code for a session, then sends new users to onboarding. |
| `GET /auth/google` and `/auth/google/callback` | Browser | Google sign-in without Supabase (demo or self-hosted only). |
| `GET /auth/reset` | Browser | Clears a session whose account no longer exists, then shows the login page. |
| `GET /r/{token}` | Anyone | A partner's share link: remembers the referral and opens pricing with their code filled in. |

Rate limits shown are per signed-in user unless they say per IP.

## Server actions

### Public (no sign-in)

| Action | What it does |
|---|---|
| `submitLeadAction` | Marketing contact form. 5 per hour per IP. |
| `quotePromoCodeAction` | Prices a promo code on the pricing page without using it up. 20 per hour per IP. |

### Signing in

| Action | What it does |
|---|---|
| `signUpAction` | Creates an account with email and password, then opens onboarding. 10 per 5 minutes per IP. |
| `signInAction` | Signs in. Limited per IP and per account; an unknown email goes to sign-up with the email filled in. |
| `googleAction` | Starts "Continue with Google". |
| `demoAction` | Signs in as a demo person (demo mode only). |
| `signOutAction` | Signs out. |

### Candidate

| Area | Actions |
|---|---|
| Onboarding | `intakeChatAction` (one chat message, read by Gemini), `completeOnboardingAction` (saves the profile), `uploadResumeAction` |
| Jobs | `saveJobAction`, `dismissMatchAction`, `restoreMatchAction`, `rematchAction` (re-score now) |
| Tracker | `moveApplicationAction`, `submitForReviewAction`, `updateNotesAction`, `addNoteAction`, `setNextStepAction` |
| Tailoring | `generateTailoringAction` (12 per hour), `decideBulletAction`, `saveCoverLetterAction`, `approveTailoringAction` |
| Profile | `updateProfileAction`, `uploadResumeAction`, `deleteResumeAction`, `setPrimaryResumeAction`, `uploadAvatarAction`, `removeAvatarAction`, `requestSkillAction` (ask staff to add a skill) |
| Answer vault | `saveEligibilityAnswersAction`, `saveScreeningAnswersAction`, `saveBackgroundAnswersAction`, `saveSelfIdentificationAction`, `saveDeliveryPreferencesAction` |
| Done-for-you applications | `pauseDeliveryAction`, `resumeDeliveryAction` |
| Messages | `sendMyMessageAction`, `markMyMessagesReadAction` |
| Settings and billing | `updateAccountAction`, `updateSettingsAction`, `sendEmailCodeAction`, `verifyEmailCodeAction`, `startCheckoutAction`, `confirmCheckoutAction` (checks Razorpay's signature), `cancelPlanAction`, `applyPromoCodeAction`, `markNotificationsReadAction`, `deleteAccountAction` |

### Staff console

| Area | Actions |
|---|---|
| Profile checks | `decideVerificationAction`, `refreshEnrichmentAction` (GitHub evidence), `decideSkillRequestAction` |
| Application reviews | `claimReviewAction`, `toggleChecklistAction`, `completeReviewAction`, `markSubmittedAction` |
| Daily application runs | `claimDeliveryRunAction`, `recordSubmissionAction`, `closeDeliveryRunAction`, `scheduleDeliveryDayAction`, `unlockSelfIdentificationAction` (reason required, audited) |
| Clients and inbox | `createClientAction`, `updateClientAction`, `deleteClientAction` (admin only), `sendClientMessageAction`, `markClientReadAction`, `addClientNoteAction`, `linkClientAccountAction` |
| Partners and pricing | `createPartnerAction`, `updatePartnerAction`, `savePromoCodeAction`, `updatePlanAction` (admin only) |
| Leads | `updateLeadAction` |
| Job pipeline | `triggerIngestionAction`, `retryJobAction`, `runWorkerAction` (admin only) |

## New user walkthrough

Every screen a new candidate sees, in order, and what the server does behind it.

| # | Screen | What loads (on the server) | What the person can do, and the call behind it |
|---|---|---|---|
| 1 | **Home** `/` | Plans and prices from `plans`, exchange rates from Frankfurter (cached). | Contact form → `submitLeadAction`. "Get started" → `/signup`. |
| 2 | **Pricing** `/pricing` | Same plans and rates. | Try a promo code → `quotePromoCodeAction`. Partner links arrive via `GET /r/{token}`. |
| 3 | **Sign up** `/signup` | Nothing; just the form. | Create account → `signUpAction` (Supabase Auth creates the login, our trigger creates the `users` row). Or Google → `googleAction` → Google → `GET /auth/callback`. |
| 4 | **Onboarding** `/onboarding` | Any profile saved so far. | Upload resume → `uploadResumeAction` (file to Storage, text read by Claude or the built-in reader). Chat → `intakeChatAction` per message (Gemini). Type a skill → `GET /api/skills/suggest`; a job title → `GET /api/roles/suggest`; pick a city → `GET /api/geo/countries/...`. Finish → `completeOnboardingAction` (saves profile and runs the first match). |
| 5 | **Dashboard** `/dashboard` | Top matches, upcoming steps, verification status, today's application run. Triggers a catalog refresh if jobs are stale. | Save a job → `saveJobAction`. Re-score → `rematchAction`. Pause applications → `pauseDeliveryAction`. |
| 6 | **Jobs** `/jobs` | Ranked matches with filters. | Save → `saveJobAction`. Hide → `dismissMatchAction`. |
| 7 | **Job detail** `/jobs/{id}` | The job, its score and each factor's reason. | Tailor → `generateTailoringAction`. |
| 8 | **Tailoring** `/jobs/{id}/tailor` | The tailored draft. | Accept or reject bullets → `decideBulletAction`. Edit letter → `saveCoverLetterAction`. Approve → `approveTailoringAction`. Send to a human → `submitForReviewAction`. |
| 9 | **Applications** `/applications` | The tracker board. | Drag a card → `moveApplicationAction`. Notes and next steps → `updateNotesAction`, `addNoteAction`, `setNextStepAction`. |
| 10 | **Answers** `/answers` | Saved application answers and plan. | Each section saves with its own `save...AnswersAction`. |
| 11 | **Profile** `/profile` | Profile, resumes, verification. | Save → `updateProfileAction`. Resumes → upload, delete, set primary; download → `GET /api/resumes/{id}`. Photo → `uploadAvatarAction`. |
| 12 | **Messages** `/messages` | The conversation with the Skylark team. | Send → `sendMyMessageAction`. The first message also opens a client record for staff. |
| 13 | **Settings** `/settings` | Account, plan, verification state. | Verify email → `sendEmailCodeAction`, `verifyEmailCodeAction`. Pay → `startCheckoutAction` → Razorpay window → `confirmCheckoutAction`; later renewals arrive at `POST /api/webhooks/razorpay`. Export data → `GET /api/me/export`. Delete account → `deleteAccountAction`. Sign out → `signOutAction`. |

Behind the scenes, once a day, `GET /api/cron/worker` imports new jobs and re-scores everyone's
matches, so the dashboard has fresh jobs the next morning without the candidate doing anything.
