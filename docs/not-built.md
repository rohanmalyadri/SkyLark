# What we have not built, and why

| # | Not built | Where you can see it | Why not yet |
|---|---|---|---|
| 1 | **Automatic submission to employer portals.** A specialist submits each application by hand and records the portal and the employer's confirmation reference. | [`src/lib/services/delivery.ts`](../src/lib/services/delivery.ts), [`applications.ts`](../src/lib/services/applications.ts) | Human review before anything is sent is the core promise of the product. Every portal is different, many forbid automated submissions, and a wrong automated application would hurt the candidate's name with that employer. |
| 2 | **Password reset.** There is no "forgot password" flow. | No reset route under [`src/app/(auth)`](../src/app/(auth)) | It needs outgoing email. The SMTP mailer only arrived with email verification ([PR #24](https://github.com/rohanmalyadri/SkyLark/pull/24)), so reset is the next thing to build on it. |
| 3 | **Matching against the whole job catalogue.** A candidate is scored against the newest 5,000 active listings, out of about 11,500. | [`src/lib/services/matching/service.ts`](../src/lib/services/matching/service.ts) (`limit: 5000`) | Scoring is done in one pass in a serverless function. We chose to ship a bounded, predictable run first; the paged version is written and waiting to be opened as a pull request. |
| 4 | **Paging in the operations console.** The candidate list loads up to 1,000 accounts at once. | [`src/lib/services/admin.ts`](../src/lib/services/admin.ts) (`limit: 1000`) | We put the time into the candidate-facing flow first. Needed before the number of accounts gets near 1,000. |
| 5 | **The weekly match limit on plans.** The pricing page shows "matches per week", but the app doesn't enforce it. | [`src/lib/seed/catalog.ts`](../src/lib/seed/catalog.ts), [`pricing/page.tsx`](../src/app/(marketing)/pricing/page.tsx) | We haven't settled whether there should be a free tier and what the limits should be, so we didn't want to lock a number into the code yet. |
| 6 | **Continuous integration.** Typecheck, lint and tests run locally but not on every pull request. | No `.github/workflows/` folder | Time. The workflow is written and queued as a pull request after the SEO change ([PR #27](https://github.com/rohanmalyadri/SkyLark/pull/27)) merges. |
| 7 | **Updating listings that a job source edits.** New listings are cleaned up and normalised; a listing the source changes later is not re-normalised. | [`src/lib/pipeline/`](../src/lib/pipeline) | Edits are rare compared with new listings and closed ones (which we do handle), so we left it for later. |
| 8 | **A mobile app.** Skylark is a responsive website only. | [`e2e/`](../e2e) covers phone layouts of the website | One web app covers phones and laptops with a single codebase for a two-person team. |

## Open product decisions

- **Plan names.** The Terms page names a "Basic" plan; the app calls the same plan "Entry"
  ([`terms/page.tsx`](../src/app/(marketing)/terms/page.tsx), [`catalog.ts`](../src/lib/seed/catalog.ts)).
  We need to pick one.
