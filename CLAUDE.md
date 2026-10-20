@AGENTS.md

# Skylark — project context

Skylark (repo name AutoApply) is a human-assisted job-matching platform: candidates build a validated
profile, get explainable matches against live job listings, and specialists review profiles and
applications before anything is sent. Capstone project by Team Synapse X (Rohan Malyadri, Meda Abhiram).

## Stack

- Next.js 16 App Router (Turbopack, cacheComponents, `proxy.ts`), React 19, Tailwind v4, Zod 4.
- Data behind one `Repository` interface (`src/lib/data`): in-memory demo store when Supabase env vars
  are absent, Supabase (Postgres + RLS + Auth + Storage) when present. Migrations in `supabase/migrations`.
- Marketing site (`src/app/(marketing)`, `tm.css`) is a close port of the Tresmares reference design:
  WebGL hero (`hero-scene.tsx`), SVG stage animations (`stage-shapes.ts`), GSAP + Lenis.

## Where things live

- Validation: `src/lib/validation/*` (gibberish, names, links, email DNS), schemas in `src/lib/domain/schemas.ts`.
- Skills: `src/lib/skills/*` (curated taxonomy, Stack Overflow snapshot, ESCO, optional Lightcast, spelling).
- Jobs: `src/lib/pipeline/*` (Arbeitnow default; Adzuna, The Muse, Greenhouse, Lever when configured).
- Matching: `src/lib/services/matching/engine.ts` (7 published factor weights).
- Verification & admin: `src/lib/services/verification.ts`, `admin.ts`, `skills.ts`; pages under `src/app/admin`.
- Privacy: `src/lib/services/privacy.ts`, `/api/me/export`, Settings → Your data.

## Commands

- `npm run dev`, `npm test` (unit + PGlite RLS tests), `npm run test:e2e` (Playwright, uses installed Edge),
  `npm run typecheck`, `npm run lint`, `npm run build`.
- Only one `next dev` may run per folder. If another session already runs one, attach to it instead of
  starting a second (`.claude/launch.json` → `skylark-dev-attach`).

## Rules for this repo

- Never add Claude co-author trailers or "Generated with Claude Code" lines to commits or PRs.
- Secrets only in git-ignored `.env.local`; never commit them. Tresmares textures in
  `public/art/hero/source/` are git-ignored and must not be redistributed.
- Don't force-push `main` without explicit approval.
- No mock data in production paths: fictional jobs are `source: "sample"` and labelled in the UI.
- Never treat external profile data (GitHub) as a verified credential; it's evidence only.

## Current state (2026-10-20)

- Latest work is on GitHub branch `skylark-upgrade` (commit f34fd0c). GitHub `main` holds an older,
  unrelated history; the user hasn't decided whether to replace it.
- Supabase has never run against a live project (local Docker Desktop was broken). Data is demo-mode only.
- Open decisions:
  - Billing still models monthly/annual subscriptions, but the new Terms (`/terms`) say one-time,
    non-refundable payments, and name a "Basic" plan the app calls "Entry". Ask before changing billing.
  - Deployment: Vercel recommended once hosted Supabase exists (cron in `vercel.json` must become daily
    on the free plan); Railway workspace "RohanMalyadri's Projects" is available as an alternative.
- Known limits: admin candidate list loads all users (paginate before thousands); Arbeitnow is mostly
  European jobs (Adzuna keys needed for India); edited listings aren't re-normalized.
