# Capstone review prep: A1 to A6

Notes for the two founders to read together before the review. Each section has the one line to aim
for, the questions the panel is likely to ask with answers taken from the code, and what to have ready.
Every number below has a source in this repository. If a number changes before the day, change it here.

**The 12 minutes:** 3 min live demo → 5 min panel questions (often runs longer) → 2 min both founders
answer → 2 min scoring. Presentation is 15 marks; the other 85 come from the work behind it.

**Who does what on the day** (agree this beforehand, fill in the names):

| | Name |
|---|---|
| Opens with the problem (20 seconds) | ______ |
| Drives the demo | ______ |
| First answer on product, customer and evidence questions | ______ |
| First answer on code and architecture questions | ______ |

Either of you must be able to answer any question. "First answer" only stops you talking over each other.

---

## A1 Problem clarity (15)

**Aim for this sentence:**
> An early-career software engineer in India who wants a job abroad spends hours every week applying to
> roles they cannot legally take, because job boards don't show which employers will sponsor a work visa.

Source: [`problem-statement/README.md`](problem-statement/README.md).

**Likely questions and answers**

| Question | Answer |
|---|---|
| Who exactly faces this? Name a role. | A final-year student, or an engineer with 0 to 3 years' experience, in India, applying to jobs in Germany, the UK, Canada, Australia or the US. |
| When does it happen? | Every application cycle. Listings that need local work rights or won't sponsor often say so late in the description or not at all, so the candidate reads, tailors and applies anyway. |
| What does it cost them, in time or money? | **Money:** done-for-you services such as ApplyWizz charge $140 to $260 a month after a first month of $209 to $400 (observed 2026-10-17, [teardown](research/competitive-teardown-applywizz.md)). **Time:** only quote an hours-per-week number that came from a real conversation you can name. If you have none yet, say so (see A2). |
| What do they do about it today? | Apply in bulk and hope; read each listing by hand for visa wording; or pay a service to apply for them. |
| Isn't this just "an app for job applications"? | No. That's a solution. The problem is the wasted applications to roles the candidate is not allowed to take. Our answer is that eligibility and sponsorship are part of every score, so a role you can't take never outranks one you can. |

**Common mistake to avoid:** leading with features (AI tailoring, 3D site, chat onboarding). Lead with
the person and the wasted hours.

**Be ready to describe one real person you met who has this problem.** It should be someone from a real
conversation (see A2), described by role, not by an illustrative sample.

---

## A2 Field evidence (15)

**Read this first.** The only filled-in interview notes in the project are the illustrative samples in
[PR #34](https://github.com/rohanmalyadri/SkyLark/pull/34). Every one of them is labelled as fictional.
**Do not show them, quote them or count them as interviews.** The panel asks for "your interview notes,
with the date and the role of every person you met". Presenting invented people as real would be
misrepresentation, and an experienced panel will usually find out with one follow-up question
("What was their name? How did you reach them?"). The guide itself says a team that reports honestly,
including disagreement, scores well here.

**What to do before the review (this is the highest-value hour you have):**

1. Talk to 4 to 6 real people this week. 10 to 15 minutes each is enough. Good, reachable people:
   - final-year CSE/IT classmates or juniors who are applying abroad,
   - seniors or alumni now doing an MS or working in Germany, the UK or Canada,
   - your university's placement or international office,
   - anyone you know who has paid an overseas application or visa consultant.
2. For each person, copy [`interview-notes/_template.md`](interview-notes/_template.md) to
   `interview-notes/YYYY-MM-DD-role.md` and write: date, role, how you met, what they said, **one line in
   their own words**, and whether they agreed with the idea.
3. Ask the same questions each time:
   - How many applications abroad have you sent in the last month? How long does each take?
   - How do you check whether a company sponsors visas? How often did you find out too late?
   - Have you paid anyone to apply for you, or thought about it? How much?
   - If a tool ranked jobs by whether you can actually take them, would that change what you do? What would make you not trust it?
4. Write down the answers that go against the idea. "Two of five said they only apply through referrals,
   so ranking job boards doesn't help them" is a strong answer in this section.
5. Fill the blank cost rows in [`problem-statement/README.md`](problem-statement/README.md) only from these notes.

**If you can't do interviews before the day,** say it straight:
> "We haven't done formal interviews yet. The problem comes from our own experience as students looking
> at jobs abroad and from studying ApplyWizz, which charges $140 to $260 a month for this. Our next step
> is interviews with [group]; here are the questions we'll ask."

You will lose some marks in A2, but you keep your credibility for the other 85.

**Likely questions** (answer only from real notes):

| Question | How to answer |
|---|---|
| How many people did you speak to, and who? | Give the exact count and roles: "Five: three final-year students, one senior in Berlin, one placement officer." |
| What surprised you? | One real surprise, with the person's role. |
| Did anyone change your thinking? | Name the change, and if it changed the product, point at it. |
| Can we see your notes? | Open `docs/interview-notes/` on the laptop, or hand over a printout. |

**Desk research you can honestly cite** (label it as desk research, not field evidence):
- ApplyWizz teardown: what a done-for-you service sells and charges ([`research/`](research/competitive-teardown-applywizz.md)).
- Live job data: the import holds about 11,500 listings; Arbeitnow is mostly European roles, which is why
  Greenhouse boards with India and APAC teams were added (`src/lib/env.ts`, `DEFAULT_GREENHOUSE_BOARDS`).

---

## A3 Solution and prototype (20)

**Aim for this sentence:**
> Skylark ranks live jobs by whether you can actually take them, explains every score in seven factors,
> and nothing is sent to an employer until the candidate and a human specialist have both approved it.

### The one main flow to demo

Profile → ranked matches → why this score → tailor and approve → specialist review → tracked application.

### 3-minute demo script

Use the live site **www.skylarkgo.in**, signed in as a test candidate you prepared the day before. Test the
whole run on the demo laptop the same morning.

| Time | Do | Say |
|---|---|---|
| 0:00–0:20 | Landing page. | "Indian engineers applying abroad waste hours on roles they can't legally take. Skylark fixes the ranking." |
| 0:20–0:50 | Show the prepared candidate's profile, then (if time) one turn of chat onboarding. | "The profile captures citizenship, work authorizations and whether they need sponsorship. Chat answers are checked by the same validators as the form; the AI proposes, our code decides." |
| 0:50–1:40 | **Jobs** page, then open one strong match. Point at the seven factor bars. | "Every score is seven published weights: skills 30%, eligibility 20%, experience 18%, location 12%, sponsorship 8%, preferences 7%, education 5%. Each has a written reason." |
| 1:40–2:05 | Open a role that won't sponsor. | "This one says it won't sponsor. Eligibility is blocked, so the score is capped at 35 however good the skills are. That's the whole problem in one rule." |
| 2:05–2:40 | Tailoring workspace: accept one suggestion, reject one, send for review. | "AI drafts suggestions. The candidate accepts or rejects each line; nothing is applied automatically." |
| 2:40–3:00 | Application tracker showing the human-review stage. | "A specialist checks it before anything is submitted, by hand, to the employer's portal. Questions?" |

If something breaks: say what broke in one sentence ("the import is slow on this network"), move to the
next step, and keep going. The guide says marks are not cut for a break during a live demo.

### Offline backup (decide now, test the day before)

1. **Local demo mode:** `npm run dev` with no Supabase variables runs on the in-memory demo store with
   labelled sample jobs. Every screen in the script works.
2. **Recorded demo:** the 1 min 55 s product capture in the presentation (PR #29) or
   `video/readme-720p-under10mb.mp4` in the project files. Have it on the laptop's disk, not streamed.
3. **Screenshots:** [`media/`](media/) has jobs, job detail, tailoring, tracker and review screens.

Say clearly when you switch: "The network is down, so this is our local demo mode with sample listings."

### Likely questions

| Question | Answer |
|---|---|
| What works today, end to end? | Sign-up (email or Google), onboarding (form or chat), daily job import, matching, tailoring with accept/reject, human review, application tracker, Razorpay subscriptions in INR, user ↔ team chat, admin panel. Live at www.skylarkgo.in on Supabase. |
| What's still pending? | Read from [`not-built.md`](not-built.md): automatic portal submission (deliberately), password reset, matching beyond the newest 5,000 jobs (fix in PR #33), admin paging, plan match limits, CI, re-normalising edited listings, a native app. |
| Why build matching before anything else? | Ranking by eligibility is the problem. Tailoring and review only matter once the candidate is looking at jobs they can take. |
| What would a user do if a step failed? | If the AI provider fails, tailoring falls back to a deterministic rules provider (`src/lib/ai/index.ts`, `withFallback`). If chat onboarding has no key or fails, the step-by-step form is used. If a job source is down, the others still import, and failed background jobs are retried. |
| Why not auto-apply? | Many portals forbid automated submissions, each is different, and a bad automatic application hurts the candidate with that employer. Human review is the product's promise. |

**Bring a printed copy of [`not-built.md`](not-built.md).** The guide lists it.

---

## A4 Technical execution (20)

**Aim for this sentence:**
> A Next.js app on Vercel, with Postgres on Supabase protected by row-level security, a daily pipeline
> that imports about 11,500 jobs, and a deterministic matching engine whose seven weights are published.

### Draw this on paper (both of you)

```
Browser ──> Next.js 16 on Vercel (Sydney)
              ├─ pages + server actions + REST API (/api/v1/matches, /api/v1/applications)
              ├─ services: matching, tailoring, reviews, billing, chat
              └─ Repository interface ──> Supabase: Postgres + RLS, Auth, Storage (Sydney)
                                     └─> in-memory demo store when Supabase isn't configured
Vercel Cron (daily 09:00 UTC) ──> /api/cron/worker ──> fetch jobs ──> normalise ──> dedupe ──> store ──> match
External: Arbeitnow + 16 Greenhouse boards (jobs), Claude (tailoring), Gemini (chat onboarding),
          Razorpay (payments, webhooks), Google sign-in, SMTP (email verification)
```

### The three key decisions, with reasons

1. **Matching is rules, not AI.** Score = weighted sum of seven factors (`FACTOR_WEIGHTS` in
   `src/lib/services/matching/engine.ts`), capped at 35 when the candidate is ineligible (same file,
   `Math.min(score, 35)`). *Why:* a candidate can see exactly why a job ranks where it does, the result is
   the same every time, it's testable, and it costs nothing per match. AI is used only where language is
   the job: drafting tailoring suggestions and reading chat answers.
2. **AI behind an interface, with a fallback.** Product code calls `AIProvider`, never a model SDK.
   Without a key or on error, a deterministic rules provider takes over (`src/lib/ai/index.ts`). Gemini
   chat output is re-checked by the same validators as the form (`src/lib/services/intake.ts`).
   *Why:* a model outage or a wrong answer never blocks or corrupts a profile.
3. **One `Repository` interface, two stores.** `src/lib/data/repository.ts` with `memory.ts` (demo) and
   `supabase.ts` (production). *Why:* we built and tested everything before a live database existed,
   the demo works offline, and the backend could be swapped without touching the product code.

Good alternates if asked "why these tools": Next.js gives pages and API in one codebase for a two-person
team; Supabase gives Postgres, auth, storage and RLS without running servers; Vercel deploys on push;
Razorpay because it charges Indian cards in INR (the account can't charge USD).

### Likely questions

| Question | Answer, with the file to open |
|---|---|
| Where is user data stored, and who can see it? | Supabase Postgres in Sydney. Row-level security is on for every user table; there are about 48 policies across the migrations (`supabase/migrations/20261007000002_security.sql` has 34). A candidate can read only their own rows; staff roles are checked in policies. Resumes and avatars are in Supabase Storage. Users can export their data from Settings → Your data (`/api/me/export`). |
| What happens when the model gives a wrong answer? | Tailoring: suggestions are never applied automatically, each one is accepted or rejected, then a specialist reviews. Chat onboarding: every extracted value is validated (location dataset, skill vocabulary, link checks, gibberish check); failures go back to the user as a follow-up question (`intake.ts`). |
| How does a job get from a board to a match? | `src/lib/pipeline/ingest.ts`: fetch with retries → normalise (title, seniority, salary, sponsorship wording, skills) → dedupe by sha256 fingerprint and by source + id → store, close stale listings → queue matching. Sponsorship is detected from the description text (`detectSponsorship` in `normalize.ts`). |
| How do you know the payment is real? | Razorpay webhooks are verified with HMAC-SHA256 and a timing-safe compare (`src/lib/services/razorpay.ts`, `src/app/api/webhooks/razorpay/route.ts`); a bad signature returns 401. Staff-entered payments are always marked manual. |
| How is the cron endpoint protected? | It needs `CRON_SECRET`, compared timing-safe (`src/app/api/cron/worker/route.ts`). |
| How did you test it? | 24 unit and integration test files, about 260 tests (265 pass on PR #33; run it yourself the day before) (`npm test`), including row-level-security tests on an in-process Postgres (PGlite), plus Playwright end-to-end tests in `e2e/`. CI isn't set up yet (not-built item 6). |
| What's the weakest part? | Matching scores the newest 5,000 of about 11,500 jobs in one serverless run (`matching/service.ts`, `limit: 5000`); the paged fix is PR #33. And the cron runs once a day on Vercel's free plan. |
| Any keys in the code? | No. Secrets are only in Vercel env vars and a git-ignored `.env.local`; the repo and history were scanned for keys in PR #31. |

**Before the review:** both of you open each file in the list below and explain it out loud to the other.
If AI tools helped write a part, read that part line by line now. The guide warns the panel will ask.

### Files to have open in tabs

1. `src/lib/services/matching/engine.ts`: weights, eligibility, the 35 cap
2. `src/lib/pipeline/ingest.ts` and `normalize.ts` (`detectSponsorship`)
3. `src/lib/ai/index.ts`: provider and fallback
4. `src/lib/services/intake.ts`: chat onboarding validation
5. `src/lib/data/repository.ts`: the one data interface
6. `supabase/migrations/20261007000002_security.sql`: RLS policies
7. `src/lib/services/razorpay.ts`: signature check
8. `docs/not-built.md`

---

## A5 Presentation and clarity (15)

**Aim for:** problem → evidence → solution → what's built → what's next, one idea per slide, every number
with a source. Slide design and animation carry no marks.

**Numbers you can say, and where each comes from**

| Number | Source |
|---|---|
| About 11,500 live job listings | Production import after PR #16 removed the 1,000-row cap |
| 7 match factors; weights 30/20/18/12/8/7/5 | `src/lib/services/matching/engine.ts` |
| Ineligible roles capped at 35 | same file |
| 16 Greenhouse company boards + Arbeitnow | `src/lib/env.ts` |
| 15 database migrations | `supabase/migrations/` |
| 24 test files, about 260 tests (check with `npm test`) | `src/**/*.test.ts`, `supabase/tests` |
| Plans Rs 1,599 / 3,999 / 11,999 a month | `src/lib/seed/catalog.ts`, Razorpay |
| ApplyWizz $140–$260/month | `docs/research/competitive-teardown-applywizz.md`, observed 2026-10-17 |
| Interview numbers | **Only from real notes in `docs/interview-notes/`** |

**Remove from the slides before the day:**
- Any number that has no source in the table above.
- Any user, revenue or traction figure (we have none to cite).
- Any slide built on the illustrative sample interviews (PR #34).

**How to practise:**
- Say the 8-minute explanation aloud twice with a timer.
- Run the full 12 minutes once with someone outside the team acting as the panel and interrupting
  you mid-demo. Practise saying "Good question, I'll come back to it" and actually coming back.
- If a question is hard to answer in English, say so and explain again in simpler words. Fluency is not marked.

**Answer the question that was asked.** If they ask "how many people did you meet?", the first words out
are the number.

---

## A6 Team ownership (15)

The panel will ask the CEO a technical question and the CTO a customer question, on purpose, and may
ask one of you to answer while the other stays quiet.

### Cross-training checklist

**CEO must be able to (without help):**
- [ ] Draw the architecture above on paper and name each box.
- [ ] Explain how a match score is calculated, the seven weights, and why an ineligible role caps at 35.
- [ ] Say where user data is stored (Supabase Postgres, Sydney) and who can see it (RLS: own rows only).
- [ ] Explain what AI does and doesn't do (drafts and reads; never scores, never submits) and the fallback.
- [ ] Walk through how a job gets from a board into the database (fetch, normalise, dedupe, store, match).
- [ ] Open `engine.ts` and point at the weights and the cap.

**CTO must be able to (without help):**
- [ ] Say the problem sentence word for word, naming the role.
- [ ] Describe one real person from the interviews: role, what they said, what it costs them.
- [ ] Say what this customer spends today (time from interviews; ApplyWizz $140–$260/month for services).
- [ ] Name who would pay, and the plan prices in rupees.
- [ ] Say how many people you spoke to and what surprised you.
- [ ] Name what we chose not to build and why (auto-submit, native app).

**Both:**
- [ ] One practice session where each explains the other's part. Write down the gaps and fix them this week.
- [ ] Agree on one real disagreement you had and how you settled it. A true one is better than a tidy one.
      Possible candidates to check against your own memory: auto-submit vs human review; INR subscriptions
      vs the one-time payment the Terms describe; plan names "Entry" vs "Basic".
- [ ] Agree who starts the demo and who takes which questions (table at the top).

---

## What to bring (from the guide)

- [ ] Working build on a laptop tested the same morning (live site signed in, and local demo mode ready)
- [ ] Interview notes with the date and role of every person (real ones only)
- [ ] Code open in the editor, the 8 files above in tabs
- [ ] Slides for the parts you can't show live (`docs/slides/`)
- [ ] Printed [`not-built.md`](not-built.md)
- [ ] Charger, a phone hotspot, and the offline demo video on disk

## Two days before: final check

- [ ] Both of us can state the problem in one sentence that names a specific role
- [ ] We have notes from every person we met, with dates
- [ ] The main flow runs start to finish on a device we've tested
- [ ] Either of us can open any file and explain it
- [ ] Every number in the slides has a source we can name
- [ ] The CEO can draw the system design; the CTO can describe the customer
- [ ] We have a written list of what we didn't build, with reasons
- [ ] We've practised the full twelve minutes, with interruptions
