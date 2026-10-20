-- Human verification of candidate profiles, public-profile enrichment, and job freshness.

-- ---------------------------------------------------------------------------
-- Profile verification: one row per candidate, written only by the server (service role)
-- after it has authorized the actor. Candidates can read their own status and reviewer note;
-- staff can read everyone's. No browser session can insert, update or delete these rows.
-- ---------------------------------------------------------------------------
create table public.profile_verifications (
  user_id uuid primary key references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  note text not null default '' check (char_length(note) <= 2000),
  flags jsonb not null default '[]'::jsonb check (jsonb_typeof(flags) = 'array'),
  enrichment jsonb not null default '{}'::jsonb check (jsonb_typeof(enrichment) = 'object'),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  -- Skills and links as they were when a reviewer approved the profile.
  approved_snapshot jsonb,
  updated_at timestamptz not null default now(),
  check ((status in ('approved', 'rejected', 'changes_requested')) = (reviewed_at is not null))
);
create index profile_verifications_queue_idx on public.profile_verifications (status, submitted_at desc);
create trigger profile_verifications_touch before update on public.profile_verifications
  for each row execute function public.touch_updated_at();

alter table public.profile_verifications enable row level security;
create policy verifications_select on public.profile_verifications for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
revoke insert, update, delete on public.profile_verifications from anon, authenticated;

-- Existing profiles enter the review queue.
insert into public.profile_verifications (user_id, submitted_at)
select user_id, updated_at from public.candidate_profiles
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Accounts: one account per email address, regardless of letter case.
-- ---------------------------------------------------------------------------
create unique index if not exists users_email_lower_key on public.users (lower(email));

-- ---------------------------------------------------------------------------
-- Jobs: when the source last listed a posting. Listings that disappear from their source,
-- or outlive the maximum age, are closed by the ingestion pipeline.
-- ---------------------------------------------------------------------------
alter table public.jobs add column if not exists last_seen_at timestamptz not null default now();
create index if not exists jobs_source_seen_idx on public.jobs (source, last_seen_at) where status = 'active';

-- ---------------------------------------------------------------------------
-- Skill review requests: skills a candidate uses that no recognised vocabulary lists.
-- Written by the server after validating the request; reviewed by staff.
-- ---------------------------------------------------------------------------
create table public.skill_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  context text not null default '' check (char_length(context) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '' check (char_length(note) <= 500),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index skill_requests_queue_idx on public.skill_requests (status, created_at desc);
create unique index skill_requests_one_pending on public.skill_requests (user_id, lower(name)) where status = 'pending';

alter table public.skill_requests enable row level security;
create policy skill_requests_select on public.skill_requests for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
revoke insert, update, delete on public.skill_requests from anon, authenticated;
