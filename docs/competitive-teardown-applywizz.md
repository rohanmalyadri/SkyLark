# ApplyWizz teardown (REA)

Reverse-engineered 2026-10-17 from the publicly served production bundle of
`https://www.applywizz.ai/` using REA (`capture_browser_scenario` → static chunk
analysis). Everything below is **observed** in shipped artifacts unless marked
*inferred*. No account was created, no credential was used, and no endpoint was
exercised beyond loading the public marketing page.

## 1. What they actually sell

Not software — **a done-for-you application service**. The product is human
operators (backed by tooling) submitting **20–25 job applications per day** on the
candidate's behalf, five days a week.

> "No time to apply? We do it for you. Apply Wizz sends 20-25 job applications
> every day - tailored to your profile - so you can focus on interviews, not job
> boards."

The three promises they repeat: *consistency* (daily volume), *relevance*
(handpicked, not spray-and-pray), *proof* (progress updates and interview alerts).

Pricing (first month / recurring):

| Plan | First month | Then | Daily applications |
| --- | --- | --- | --- |
| Basic | $209 | $140/mo | 20+ |
| Professional (highlighted) | $299 | $140/mo | 20+ |
| Executive | $400 | $260/mo | 40+ |

A second, cheaper **Job Board** product line exists in the code with its own
plans: `monthly` $45, `3-months` $119.99, `6-months` $224 (defaults in
`paymentService`; live values come from `admin_settings`).

## 2. Stack (observed)

- **Frontend**: Vite + React 18 SPA, React Router, Tailwind, GSAP + Framer Motion,
  statically hosted. Chunks: `index`, `react-vendor`, `ui-motion`, `charts`,
  `icons`, `gsap-vendor`.
- **Backend**: **Supabase** (Postgres + PostgREST + Edge Functions). Project ref
  `njpraxyykyggxbcseixq`. There is no bespoke API server — the browser talks to
  PostgREST directly with the anon key.
- **Edge Functions**: `payment-success-handler`, `send-onboarding-credentials`.
- **Payments**: Razorpay (INR) and PayPal (USD), switchable at runtime from an
  admin setting; PayPal plan IDs are held per account (`india`, `dubai`).
- **Analytics**: GA4 (`G-FJTR6X7LWR`) + Microsoft Clarity (`wg0l9m395z`).
- **Media**: Cloudinary (`dpuziwnvl`). **Content**: static JSON at
  `/content/posts/index.json`. **Reviews**: Trustpilot (linked, not API).
- Built with an AI site builder — chunks still carry `data-component-path`
  attributes that expose the original source tree (`src/pages/JobBoardNew/...`).

## 3. Route map (from the shipped router)

```
/ /about /pricing /job-board /trustwall /community /more-domains
/blog /blog/:slug /offers /labour-day_offer /o/:token
/disclaimer /privacy-policy /terms-of-service
/payment/success /payment/cancel /application-payment-success
job-board/{login, onboard, onboardform, checkout, pricing,
           adminlogin, admindashboard,
           subadminlogin, subadmindashboard,
           influencerlogin, influencerdashboard}
```

**Four role tiers**: candidate → sub-admin (the operators who do the applying) →
admin → influencer (affiliate). Sessions are kept in `localStorage` under
`admin_session`, `subadmin_session`, `influencer_session`.

## 4. Data model (from PostgREST calls in the bundle)

| Table | Role |
| --- | --- |
| `jobboard_transactions` | the spine: one row per customer+plan+payment |
| `jobboard_transaction_history` | archive written when a payment is confirmed |
| `applywizz_transactions` | the main-product (non-job-board) payments |
| `admin_settings` | key/value runtime config: prices, gateway, PayPal plan IDs |
| `admin_users` | admin + sub-admin accounts (`role` column) |
| `influencers` | affiliates: `promo_code`, `affiliate_link_hash`, `total_earnings` |
| `influencer_payout_settings` | `flat_price`, `affiliate_price`, `has_barter` |
| `leads` | marketing contact form captures |
| `sales_closure` | sales attribution |

`jobboard_transactions` columns observed: `jb_id` (human ID `JB-<n>`),
`full_name`, `email`, `country_code`, `mobile_number`, `promo_code`,
`influencer_id`, `location`, `country`, `plan_id`, `plan_started`, `plan_ended`,
`payment_status`, `payment_method`, `payment_account`, `transaction_id`,
`amount`, `currency`, `payment_details`, `paypal_subscription_id`,
`razorpay_subscription_id`, `created_at`, `updated_at`.

## 5. The actual moat: the answer vault

`ClientOnboarding` collects ~60 fields **once**, then reuses them to fill any US
job application portal. This is what makes 20–25 applications/day possible, and
it is the single most valuable thing in the teardown:

- **Identity/contact**: full name, personal + company email, WhatsApp, callable phone
- **Targeting**: job role preferences, alternate roles, location/work preferences,
  salary range, excluded companies, desired application volume
- **Education**: highest education, university, GPA, graduation year, main subject
- **Work authorization**: visa type, sponsorship needed, `is_over_18`,
  `eligible_to_work_in_us`, `authorized_without_visa`, `require_future_sponsorship`,
  `can_perform_essential_functions`
- **Employer screening**: `worked_for_company_before`,
  `discharged_for_policy_violation`, `referred_by_agency`,
  `can_work_3_days_in_office`, `has_relatives_in_company` + details
- **Background/legal**: `convicted_of_felony` + explanation,
  `pending_investigation`, `willing_background_check`, `willing_drug_screen`,
  `failed_or_refused_drug_test`, `uses_substances_affecting_duties` + description,
  `can_provide_legal_docs`
- **EEO self-identification**: `gender`, `is_hispanic_latino`, `race_ethnicity`,
  `veteran_status`, `disability_status`
- **Service window**: `start_date`, `end_date`, `applywizz_id`, `resume_url`,
  `linked_in_url`, `github_url`

## 6. Growth machinery

- **Affiliates**: an influencer gets a `promo_code` and an
  `affiliate_link_hash` = `btoa("<CODE>|<RANDOM>")`, giving a share link
  `/job-board/<hash>`. `ReferralHandler` resolves the hash → stashes
  `applied_promo_code` + `influencer_id` in `sessionStorage`, which
  `paymentService` then stamps onto the transaction.
- **Payouts**: earnings = `referrals × affiliate_price + flat_price`, with an
  optional barter flag. The influencer dashboard charts referrals per day.
- **Campaigns**: `/o/:token` → redirects to `/?promo=<token>#pricing`.
- **Leads**: homepage contact form inserts `{name, phone, email, city, source,
  status:"New", created_at}` into `leads`.
- **Social proof**: 16 client logos, Trustpilot carousel, "Trust Wall", per-domain
  client counts ("113+ Clients"), animated global-reach counters, Zolve payment
  partnership ($20 off).

## 7. What NOT to copy

Their auth is done **in the browser against readable tables**:

```js
// influencerService.js — runs in the user's browser
supabase.from("influencers").select("*")
  .ilike("email", email).eq("password_hash", sha256(password)).single()
```

`adminService` does the same against `admin_users`. The consequences: unsalted
SHA-256 password hashes, password comparison pushed to the client, session state
in `localStorage`, and authorization decided by client-side routing. Role checks
are not enforced at the data layer. Skylark must keep doing the opposite —
server-side sessions, hashing in the service layer, and Postgres RLS as the
boundary (`src/lib/auth/dal.ts`, `supabase/migrations/*_security.sql`).

Also worth avoiding: `payment_status: "pending"` rows treated as successful when
`transaction_id` happens to be non-null, and reconciliation done by a dashboard
button rather than a payment webhook.

## 8. Gap analysis → Skylark

| ApplyWizz capability | Skylark before | Action |
| --- | --- | --- |
| Reusable application answer vault (EEO, work auth, screening) | absent | **build** |
| Daily application quota as the product promise | per-month tailoring limits | **build** |
| Operator console for staff who submit applications | reviewer queue only | **build** |
| Proof of submission per application | none | **build** |
| Affiliate/influencer program + payouts | absent | **build** |
| Promo codes and campaign links | absent | **build** |
| Marketing lead capture | absent | **build** |
| Trust wall / domains / global reach / multi-currency | partial | **build** |
| AI matching with explainable factors | **already stronger** | keep |
| Human review with SLA + checklist | **already stronger** | keep |
| Server-side auth + RLS | **already stronger** | keep |
