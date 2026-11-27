# Backend hardening: what protects Skylark

Plan step 3: "Strengthen the backend: input validation, error handling, logging, secure login, and
keys kept out of the code. Done when bad inputs give clean error messages and no secret sits in the
repository."

Most of this was already in place. This page says what exists, what was added on 27 November 2026,
and what is still open.

## 1. Input validation

**In place.** Every server action and API route validates its input before doing anything with it.

- Every form has a Zod schema in `src/lib/domain/schemas.ts` (length limits, formats, allowed
  values). The server re-checks everything; the browser's checks are only for convenience.
- On top of the schemas, `src/lib/validation/*` rejects keyboard-mash text, fake-looking names,
  wrong profile links (for example a LinkedIn link that isn't on linkedin.com) and email domains
  that can't receive mail.
- Skills and job titles must match a known vocabulary (curated list, ESCO, Stack Overflow).
- Uploads are checked by their actual bytes, not their file name, and size-limited.
- Every ID passed in is length-checked; every role-restricted action states its roles.

**Added:**

- `POST /api/v1/applications` now checks that the body says it's JSON, is under 4 KB and parses,
  before validating fields (`src/lib/infra/request.ts`). Before, a broken body was quietly treated
  as empty and produced a confusing "Required".
- Location lookups (`/api/geo/...`) now have their own per-IP rate limit.

## 2. Clean error messages

**In place:** one error type (`AppError`) with a fixed list of codes, each mapped to an HTTP status
(`src/lib/infra/errors.ts`). Actions return `{ ok: false, error, code, fieldErrors }` and the forms
put each message next to its field.

**Added:**

- API routes no longer return raw Zod "issues" (which echoed the submitted values back). They now
  return the same `fieldErrors` shape as actions:
  ```json
  { "error": { "code": "validation", "message": "Please check the request and try again.",
               "fieldErrors": { "jobId": ["Send the jobId of the job to save."] } } }
  ```
- Unexpected failures still never show internals, but now include a short **reference code**:
  "Something went wrong on our side. Please try again. If it keeps happening, send us this code:
  4F2A9C1B." The same code is in the server log next to the real error, so a support message can be
  matched to the exact failure.
- Rate-limited API responses include `Retry-After: 60` and all API errors are marked `no-store`.
- Supabase sign-up errors were shown to the user word for word. They are now mapped to plain
  messages ("Choose a stronger password...", "Too many sign-ups from here...").

Checked by hand against the built server:

| Bad input | Answer |
|---|---|
| `POST /api/v1/applications` with `{nope` | 422 "The request body isn't valid JSON." |
| ... with `{}` | 422 with `fieldErrors.jobId` "Send the jobId of the job to save." |
| ... sent as a form, not JSON | 422 "Send the request body as JSON (Content-Type: application/json)." |
| `GET /api/v1/matches` signed out | 401 "Please sign in to continue." |
| `GET /api/geo/countries/XYZ/regions` | 422 "Use a 2-letter country code" |

## 3. Logging

**In place:** a structured JSON logger (`src/lib/infra/logger.ts`) that Vercel collects. Any field
named like a password, secret, token, cookie or API key is replaced with `[redacted]` before it is
written. Important actions (sign-in, payments, resume downloads by staff, data exports) also go to
the `audit_logs` table, which staff can browse in the console.

**Added:**

- Logged errors include the first five lines of the stack trace, so a 500 points at the failing line.
- Every error log carries the reference code shown to the user.
- Rejected API calls (401, 403, 422, 429) are logged as warnings with the route name.
- Failed sign-ins and sign-ups are logged with a hashed account key, never the email address.

## 4. Secure login

**In place:**

- Passwords are handled by Supabase Auth (bcrypt); Skylark never stores or sees a password hash in
  production. Demo mode uses scrypt.
- Passwords need 10+ characters with a letter and a number, and can't contain the email name.
- Sign-in, sign-up and Google sign-in are limited to 10 tries per 5 minutes per IP.
- Session cookies are `SameSite=Lax` and only sent over HTTPS in production. Supabase's library sets them; the demo-mode cookie is also `httpOnly`.
- After sign-in the app only redirects to its own pages (open-redirect fix, PR #26).
- The staff console answers "not found" to anyone signed out, and every staff action re-checks the
  role on the server. Database row-level security is the last line.
- Security headers on every page: HSTS, no framing, no MIME sniffing, strict referrer, and a
  Content-Security-Policy in report-only mode.

**Added:** a second sign-in limit **per account** (10 tries per 15 minutes, keyed by a hash of the
email). The per-IP limit alone let someone with many IP addresses keep guessing one person's
password. Now that stops after 10 tries whatever the IP.

## 5. Keys kept out of the code

**Audit result: clean.** No key, password or private key is in any tracked file, and none was ever
committed: all 91 commits in the history were scanned.

- Secrets live in `.env.local` (git-ignored) on a laptop and in Vercel's environment settings in
  production. `.env.example` lists the names with empty values.
- The Supabase service key, Razorpay secret, webhook secret, SMTP password, Gemini and Anthropic
  keys are only read on the server (`src/lib/env.ts` is `server-only`, so the build fails if browser
  code imports it).
- The demo session secret in `demo-session.ts` is a development placeholder; production refuses
  demo sign-in unless a real `SESSION_SECRET` is set.

**Added:** `npm run check:secrets` scans every tracked file for Supabase, Razorpay, Google, Anthropic,
GitHub and AWS key patterns, private keys, any tracked `.env` file, and any of our secret variable
names with a value filled in. `npm run check:secrets -- --history` scans every past commit too. Run it
before pushing; it exits with an error and a list if it finds anything.

## Still open

| Item | Why it matters | Suggested fix |
|---|---|---|
| No password reset | Someone who forgets their password can't get back in without Google. | Turn on Supabase's reset email once custom SMTP is set up in Supabase. |
| CSP is report-only | It logs problems but doesn't yet block injected scripts. | Watch the console on a preview for a week, then switch to enforcing. |
| `/api/v1/matches` returns the full list | Up to 2,000 matches in one response on the live site. | Add `?page=` like the jobs page. |
| No automatic secret scan on GitHub | `check:secrets` only runs when someone runs it. | Add it to the CI workflow when that lands, and turn on GitHub secret scanning in the repo settings. |
