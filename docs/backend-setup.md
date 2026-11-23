# Backend setup (Supabase + Vercel)

Without Supabase keys the app runs in demo mode on in-memory data that resets on every deploy.
These steps switch the live site to a real database, real accounts and file storage.

## 1. Create the database tables (Supabase dashboard)

1. Open the project at https://supabase.com/dashboard → **SQL Editor** → **New query**.
2. Paste the whole of the combined setup script (all files in `supabase/migrations`, in order, wrapped in
   one transaction) and click **Run**. If Supabase warns about a "destructive operation", click
   **Run this query**: the only drop is a `drop trigger if exists` on a trigger that doesn't exist yet.
3. **Table Editor** should now list about 28 tables, and **Storage** two buckets: `documents` (private)
   and `avatars` (public).

The script also records the migrations as applied, so later migrations can go through the Supabase CLI
(`supabase link --project-ref <ref>` then `supabase db push`) without re-running these.

## 2. Auth settings (Supabase dashboard → Authentication)

- **URL Configuration** → Site URL: `https://www.skylarkgo.in`.
  Redirect URLs: add `https://www.skylarkgo.in/**` and `https://skylarkgo.in/**`. Keep
  `https://skylark-ten-mu.vercel.app/**` and, for preview deployments,
  `https://*-rohans-projects-8d7addbc.vercel.app/**`.
- **Sign In / Providers → Email** → turn **Confirm email** off, unless you add custom SMTP
  (Authentication → Emails → SMTP Settings, e.g. Resend). Supabase's built-in mailer only delivers
  to members of your Supabase team and a couple of emails an hour, so other people could not confirm
  their accounts or reset passwords.
- Google sign-in (optional): enable Google under Providers with a Google OAuth client, then set
  `SUPABASE_GOOGLE_AUTH=on` on Vercel. Until then the Google button stays hidden.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Value | Where in Supabase |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the publishable key (`sb_publishable_…`) | Project Settings → API Keys |
| `SUPABASE_SERVICE_ROLE_KEY` | the secret key (`sb_secret_…`), mark Sensitive | Project Settings → API Keys |
| `ADMIN_EMAILS` | your email; promoted to admin on sign-in | |

All three Supabase values must be present or the app stays in demo mode. `NEXT_PUBLIC_*` values are
baked in at build time, so **redeploy** after setting them. `SESSION_SECRET`, `CRON_SECRET` and
`NEXT_PUBLIC_APP_URL` are already set. `NEXT_PUBLIC_APP_URL` must be the public domain,
`https://www.skylarkgo.in`: Google sign-in and email links return there, and the sign-in cookie only
exists on the domain the visitor started from, so a stale value breaks sign-in with "link is invalid
or expired".

Optional extras (see `.env.example`): `ANTHROPIC_API_KEY` for AI tailoring (otherwise a rules engine is
used), `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` for Indian and US listings, `GITHUB_TOKEN`, `STACKEXCHANGE_KEY`,
and `GEMINI_API_KEY` (mark Sensitive) to turn on the chat-style onboarding. Without it, onboarding is the
step-by-step form only. A free-tier Gemini key is rate-limited to a handful of requests a minute, so turn on
billing for the Google AI Studio project before real traffic.

## Payments (Razorpay)

Paid plans are auto-renewing subscriptions (monthly or yearly) on Razorpay Subscriptions. The app
creates the matching Razorpay plans itself on first checkout, tagged `skylark:<plan>:<interval>:<currency>:<amount>`;
changing a price in the `plans` table just creates a new Razorpay plan for new subscribers.

1. Run `supabase/migrations/20261122000001_subscription_provider_ref.sql` in the Supabase SQL Editor
   (adds `subscriptions.provider_ref`).
2. In the Razorpay dashboard, switch to **Test Mode**, then Account & Settings → API Keys → Generate
   Key. Set `RAZORPAY_KEY_ID` (`rzp_test_…`) and `RAZORPAY_KEY_SECRET` (mark Sensitive) on Vercel.
3. Account & Settings → Webhooks → Add New Webhook: URL `https://www.skylarkgo.in/api/webhooks/razorpay`,
   a secret you make up (set the same value as `RAZORPAY_WEBHOOK_SECRET`, Sensitive), and the events
   `subscription.authenticated`, `.activated`, `.charged`, `.pending`, `.halted`, `.paused`,
   `.resumed`, `.cancelled`, `.completed`, `.updated`. Renewals and cancellations only reach the app
   through this webhook.
4. Redeploy, subscribe from Settings → Subscription & billing with a
   [test card or UPI ID](https://razorpay.com/docs/payments/payments/test-card-details/), and check the
   payment shows under Receipts and in the Razorpay dashboard.
5. Going live: complete Razorpay KYC and get Subscriptions enabled on the account, generate live keys
   (`rzp_live_…`) and a live-mode webhook, and swap the three values. Plans are charged in
   `plans.currency`; a currency other than INR needs international payments enabled on the account.

Access follows payment: a renewal that fails keeps the plan for a 3-day grace period, then the user
drops to Entry. Cancelling stops renewals at the end of the paid period. Switching plans starts a new
subscription and cancels the old one once the new one is paid. Promo codes aren't applied to Razorpay
subscriptions yet (they need Razorpay offers). Without keys, demo mode keeps an instant mock charge, and
a Supabase deployment refuses to sell plans.

## Region

The Supabase project lives in AWS ap-southeast-2 (Sydney), so `vercel.json` pins functions to `syd1`.
Every page makes several database calls; from Vercel's default US region each one crosses the Pacific
and job imports overrun the 60-second function limit. If the database ever moves, move this too.

## 4. Check it worked

- `https://www.skylarkgo.in/api/health` returns `{"status":"ok"}`, and **Admin → System health** shows "Data mode: Supabase".
- Sign up with the `ADMIN_EMAILS` address, sign out and back in: you land in `/obscuron-nexus-92vX7q`.
- The daily cron (`/api/cron/worker`, 09:00 UTC) imports jobs. To fill the board straight away, open
  **Admin → Pipeline** and run an import.

## Testing against a real Supabase locally

`supabase start` (Docker) applies the migrations; put its URL and keys in `.env.local`, then
`npm run seed -- --demo` adds the sample dataset and `E2E_SEED_PASSWORD=<SEED_DEMO_PASSWORD> npm run test:e2e`
runs the browser tests against it. Never seed the production project.
