# Skylark presentation: speaker notes

Durations are guides. They add up to about 35 minutes; trim the deep-dive slides for a shorter slot.

## 01 · Skylark · about 0:45

**Say**

Let the opening play without talking. When the tagline lands: “This is Skylark. It helps people who are applying for jobs in another country apply to fewer roles, and only to roles they can actually take.”

**Key points**

- Skylark is live at skylarkgo.in, built by Team Synapse X (Rohan Malyadri and Meda Abhiram).
- The tagline names the three promises you will come back to: explainable matches, tailoring you approve, and a human review.

**Presenter**

Any key skips the opening. The mark is assembled from the exact polygons of the official logo.

**Transition**

“To see why this matters, start with what job hunting across borders actually looks like.”

---

## 02 · The problem · about 1:15

**Say**

“Most job boards optimise for volume. For someone looking for work in another country, volume is the problem.”

Step 1: “Most of what they see are roles they cannot legally take, at companies that will never sponsor them.” The wall dims; only a few listings stay lit.

Step 2: “So they mass-apply, and that burns their name with recruiters.”

**Key points**

- The wall is illustrative, not a statistic. Say so if asked.
- The audience: candidates applying across borders, for example from India to Germany, the UK, the US, Canada or Australia.

**If asked**

Is there data on how many listings are ineligible? We don’t claim a number. The point is structural: job boards do not treat work authorization or sponsorship as part of the match.

**Transition**

“The tools people use today don’t help, and here is exactly where they fall short.”

---

## 03 · Where job boards fall short · about 1:30

**Say**

“Here is the same job search, two ways.” Walk the rows two at a time; each click strikes the old way and brings in Skylark’s.

- Eligibility and the match score: on a job board eligibility is your problem and the score is a black box. In Skylark eligibility is a factor in every score, and every factor has a sentence you can read.
- Applications and quality control: tailored per role with your approval, then a specialist checks it.
- Forms and proof: answer the common questions once; every submission records the portal and the employer’s confirmation reference.

**If asked**

Why cap at 35? So a role you can’t legally take can never outrank one you can, whatever your skills say. You’ll see it happen in the match engine slide.

**Transition**

“So what does a product built the other way round look like?”

---

## 04 · Introducing Skylark · about 1:00

**Say**

“This is Skylark.” Pause on the landing page as it rises. “A human-assisted job application service for people applying across borders.”

Step 1: “It ranks the roles you can actually take, explains every score, tailors each application with your approval, and has a specialist review and submit it, with a receipt for every one.”

**Key points**

- This is the real landing page, captured from the running app.
- The three promises (explained, approved, reviewed) return on the closing statement.

**Transition**

“Behind that sits one simple idea.”

---

## 05 · The vision · about 1:00

**Say**

“Skylark’s goal is simple: apply only where you can actually work.” Explain the sentence on screen: one validated profile, every live role ranked on eligibility first, explained, approved by you, checked by a human.

Step 1: routes light up from one candidate’s home market. “Listings come from public job APIs: Arbeitnow by default, sixteen public Greenhouse boards, and Adzuna, The Muse and Lever when they’re configured.”

**Key points**

- The globe is drawn from the same stippled world map the website uses.
- Routes are illustrative, not traffic data.
- Every source is a documented public API; nothing is scraped.

**If asked**

Why India first? The founding market; plans are charged in INR through Razorpay. The job catalogue itself is global.

**Transition**

“Here is the product that does it.”

---

## 06 · Product overview · about 1:45

**Say**

“These are real screens, captured from the running app in demo mode.” Let the gallery drift for a beat, then step through four of them.

- Dashboard: new matches, active applications and today’s application quota.
- Why it matches: a score of 90 broken into seven factors, each with weight, rating and reason.
- Tailoring: original against suggested; nothing changes until the candidate accepts.
- Specialist review: the operations console, where a human checks the application before it’s sent.

**If asked**

Is this real data? Demo mode uses clearly labelled fictional sample data. Production runs on Supabase with live listings.

**Transition**

“Six capabilities make this work.”

---

## 07 · Core capabilities · about 2:00

**Say**

One sentence per capability; each click brings the next one forward with its own animation.

- Explainable matching: seven factors, each 0 to 100 with a readable reason.
- Eligibility first: work authorization and sponsorship are profile fields; a role that won’t sponsor someone who needs it is capped at 35.
- Tailoring you approve: every change carries its reason; nothing is applied until accepted.
- Human review: five checks, 24-hour SLA, approve or send back with a note.
- Answer vault: answer the common employer questions once; EEO answers can’t be read from the browser.
- Delivery with receipts: plans carry a daily quota (10, 25 or 40); only a recorded submission moves the counter.

**If asked**

Who are the specialists? Staff using the operations console. They can only move an application to “applied” after recording the portal and confirmation reference.

**Transition**

“Here’s how those pieces connect, from the candidate’s first click to a submitted application.”

---

## 08 · How Skylark works · about 2:00

**Say**

“Three lanes: the candidate, Skylark, and a specialist. Watch one application move through them.” Each click advances the glowing application one station.

1. Build a profile (you): upload a resume; every field is validated on the server, including skills against a curated taxonomy, Stack Overflow tags and ESCO.
2. Verification (specialist): new and edited profiles go to a review queue with automatic flags.
3. Match (Skylark): live listings are scored; 85 or more sends a notification.
4. Tailor and approve (Skylark drafts, you decide): accept or reject each suggestion. The status becomes “preparing”.
5. Review and submit (specialist): checklist, submission, and the employer’s confirmation reference. “Human review” then “applied”.
6. Track (you): screening, interview, offer, with notes and a full history.

**If asked**

Can a candidate skip review? No. Entering human review needs an approved tailored document, and only a specialist can move an application to applied.

**Transition**

“Under the hood, this runs on four layers.”

---

## 09 · System architecture · about 2:30

**Say**

“Four layers, assembled.” Click through each layer; it lifts and lights while the rest dims.

- Experience: one Next.js 16 app: marketing site, candidate app, operations console and messages.
- Server: proxy.ts refreshes the session and routes people early, but it isn’t the lock. Every page, Server Action and route handler re-checks authorization.
- Domain services: matching, tailoring, reviews and the pipeline, written against one Repository interface.
- Data: Supabase Postgres with RLS, Auth and Storage. Without Supabase variables, the same interface is backed by an in-memory seeded store, which is why the whole product runs locally with zero setup.
- External: the blue packets. Each provider sits behind an interface: AI behind AIProvider, jobs behind JobSource.

**If asked**

Why Sydney? The Supabase project is hosted there, so Vercel functions are pinned to the same region (syd1).

Two trust levels? Reads and writes made for a person use their session, so RLS applies. System rows (matches, queue jobs, audit entries) are written server-side with the service role, and browsers have no write path to them.

**Transition**

“Let’s zoom into the pipeline layer: how a job listing gets in.”

---

## 10 · The job pipeline · about 2:30

**Say**

“Follow one posting through the pipeline.” Each click moves the camera to the next stage and the posting changes shape.

1. Fetch: one JobSource interface. Arbeitnow (keyless) and sixteen Greenhouse boards by default; Adzuna, The Muse and Lever when configured. Three retries with backoff.
2. Normalize: HTML becomes title, seniority, location, salary, sponsorship and skills.
3. Deduplicate: a sha256 fingerprint of company, normalised title and country collapses cross-posts; (source, external_id) catches a board renaming a role.
4. Store: listings a source stops showing, or older than 45 days, are closed. If nothing refreshed in 24 hours, candidates are told live data is unavailable.
5. Queue: match jobs in batches of 100, each with an idempotency key; workers claim with FOR UPDATE SKIP LOCKED; failures back off with jitter, then dead-letter.
6. Score and notify: seven factors; 85 or more notifies the candidate.

**If asked**

Why daily? Vercel’s Hobby plan allows a daily cron. The worker is idempotent, so a retried cron can’t double-schedule.

**Transition**

“The heart of that last step is the match engine.”

---

## 11 · The match engine · about 2:30

**Say**

“This is the core algorithm. Seven factors with published weights: skills 30, eligibility 20, experience 18, location 12, sponsorship 8, preferences 7, education 5. The score is their weighted sum.”

Step 1: “An example candidate in India targeting Germany, on a Berlin listing that offers sponsorship. Each factor fills with its own score; the weighted sum is 86.”

Step 2: “Now the same listing says it won’t sponsor. Eligibility and sponsorship drop to zero. The sum falls to 64, but 64 would still outrank roles this person can take, so ineligible roles are capped at 35.”

Step 3: “And skills seen only on GitHub are shown as evidence, never added to the score.”

**Key points**

- The engine is a pure function, scoreMatch(profile, job, company), with a versioned model id (match-v2.0). It runs identically in the worker, the UI and tests.
- The example values are the engine’s own rules applied to sample inputs; the factor scores come from the README’s worked example.

**If asked**

Partial skill credit? Half credit for a close sibling: Vue for React, GCP for AWS.

Why not machine learning? Explainability. A candidate and a specialist can read exactly why, and the weights are a public constant.

**Transition**

“Once a role fits, Skylark helps write the application. That’s where AI comes in, carefully.”

---

## 12 · Deep dive: tailoring · about 2:00

**Say**

“Of everything Skylark does, this is where trust matters most, because AI touches the candidate’s own story.”

Step 1: zoom to a suggestion. “Original on the left, suggested on the right, and the reason underneath: this version surfaces TypeScript, which the role requires.”

Step 2: the control panel. “Nothing is applied until the candidate accepts. They approve the version, and only then can it go to a specialist.”

Step 3: “The prompt forbids inventing employers, titles or numbers. Claude’s output is validated against a Zod schema, and if the call fails or there’s no key, a deterministic rules provider produces the result. An outage never blocks a candidate.”

**If asked**

Which model? Claude through the Anthropic SDK for tailoring and resume extraction; Gemini for chat-style onboarding. Both optional.

**Transition**

“Let’s put it all together as a candidate experiences it.”

---

## 13 · User journey · about 2:00

**Say**

Narrate as the cursor moves; each click is one moment in the journey.

1. Sign in with email (verification codes over SMTP) or Google.
2. Dashboard: today’s matches and the day’s application progress.
3. Ranked roles: every role scored, filterable by country, eligibility and minimum fit.
4. Why it fits: the seven-factor breakdown with eligibility and sponsorship.
5. Approve changes: accept or keep the original, then approve the version.
6. Track it: saved, preparing, human review, applied, then screening, interview and offer.

**If asked**

Mobile? Yes: a bottom tab bar, one tracker column at a time. The end-to-end suite runs phone-width layouts.

**Transition**

“A few engineering decisions make that experience trustworthy.”

---

## 14 · Engineering highlights · about 2:30

**Say**

“Five decisions, and why each one matters.” One click per decision.

- Tested against real Postgres: the policy suite applies every migration to PGlite and proves the RLS rules. It caught a column REVOKE that did nothing, and a REVOKE EXECUTE that left the default PUBLIC grant in place.
- One interface, two stores: zero-setup local runs; services are store-agnostic.
- AI with a fallback: Zod-validated output; rules provider on failure.
- Fail closed: say “unavailable” rather than guess.
- Idempotent: keys on every enqueue and on mutating API calls; SKIP LOCKED so many workers can drain the queue without double-processing.

**If asked**

Why PGlite? It runs the real Postgres engine in-process, so policy tests run in CI-like conditions without Docker.

**Transition**

“Here are the technologies that carry those decisions.”

---

## 15 · Technology · about 1:45

**Say**

“Rather than a wall of logos, here is what each tool does.” At the centre: Next.js 16 with React 19.

- Interface: Tailwind v4 and Radix for accessible app UI; Framer Motion in the app; GSAP, Lenis and WebGL for the marketing site; Zod 4 validates on the server and drives inline feedback.
- Data and services: Supabase (Postgres with RLS, Auth with email and Google, Storage); Claude for tailoring and resume extraction; Gemini for chat onboarding; Razorpay subscriptions in INR; Nodemailer over SMTP for verification codes.
- Delivery and quality: Vercel in Sydney with Vercel Cron; Vitest, PGlite and Playwright.

**If asked**

Why Razorpay? The business is Indian; Razorpay subscriptions charge in INR with signature-verified webhooks.

**Transition**

“Because this handles people’s identities and documents, security is built in layers.”

---

## 16 · Security and privacy · about 2:00

**Say**

“Each ring is a real layer in the code.” Outside in: proxy.ts as an early gate; a data access layer that re-checks authorization everywhere; row level security on every table; column privileges so nobody can change their own role or email; and EEO answers whose SELECT is revoked from every browser role.

Step 2: “A request for another candidate’s rows gets through the app, and the database still says no.”

Step 3: storage, abuse controls, observability, privacy export and deletion, and the rule that GitHub data is evidence only.

**If asked**

Who can read EEO answers? No browser session, including the owner. A specialist must name the form that needs it, and each unlock is audited.

Promo codes? Not readable from the browser; quoted server-side with per-IP rate limits and redeemed only on a successful payment.

**Transition**

“Enough diagrams. Let’s see it running.”

---

## 17 · Product demonstration · about 3:00

**Say**

“This is a recording from the running app, so the talk doesn’t depend on the venue’s Wi-Fi. If the connection is good, press L to open the live site.”

**Demo script (live)**

1. Open skylarkgo.in. Show the landing page and pricing (INR plans).
2. Sign in (Google or email code). Show the dashboard.
3. Open Job intelligence, pick a role, open “Why it matches”.
4. Open the tailoring workspace, accept one suggestion.
5. Show the tracker.
For a local run: npm run dev , then open the deck with ?live=http://localhost:3000 and press L. Demo mode has a one-click Candidate sign-in.

**Fallback**

The site sends X-Frame-Options DENY, so it opens in its own window rather than inside the slide. If anything fails, stay on the recording (V pauses it).

**Transition**

“So where does the project stand today?”

---

## 18 · Results and validation · about 1:30

**Say**

“Everything on this slide is verifiable from the repository.”

- 264 automated tests across 24 files pass, including the database-policy suite.
- 15 migrations, every one applied in that suite.
- 22 pull requests merged between 8 October and 24 November 2026.
- 16 Greenhouse boards by default, plus Arbeitnow.
Step 1: the milestones, from first build to a production product with payments, sign-in and a security audit.

**If asked**

Users or revenue? We are not presenting user or revenue numbers. The product is live and taking subscriptions; usage figures would come from the production database.

**Transition**

“And here’s what comes next.”

---

## 19 · Roadmap · about 1:15

**Say**

“Left of the line is shipped and live. Right of it is planned.” Click to reveal the plan.

- Matching currently reads the newest 5,000 listings; next it covers the whole catalogue.
- The site-review items: SEO basics, performance and accessibility, and CI on every PR.
- A password reset flow on top of the SMTP mailer; re-normalising edited listings; more sources for India via Adzuna.

**If asked**

Timeline? These come from the project’s open work and a full-site audit; several are already in review.

**Transition**

“Which brings it back to three promises.”

---

## 20 · Closing statement · about 0:45

**Say**

Slowly, one line per click. “Every score, explained. Every change, approved by you. Every application, checked by a human.”

“That’s Skylark: fewer applications, each one you can actually take.”

**Transition**

Click once more for the close.

---

## 21 · Thank you · about open

**Say**

“Thank you. Skylark is live at skylarkgo.in and the code is on GitHub. Happy to take questions.”

**Likely questions**

- How is this different from LinkedIn Easy Apply? Eligibility is part of the score, every score is explained, every AI change needs approval, and a human reviews before anything is sent.
- What if the AI is down? A deterministic rules provider produces the result; tailoring keeps working.
- How do you stop data leaks between candidates? Row level security on every table, proven by tests against real Postgres.
- How do you make money? Subscriptions in INR through Razorpay (Entry, Professional, Executive), with a daily application quota per plan.
- Where are the jobs from? Public APIs only: Arbeitnow, Greenhouse boards, and Adzuna, The Muse and Lever when configured.
Press R to replay the logo. Home returns to the start.

---
