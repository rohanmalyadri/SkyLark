-- The managed application service: a reusable answer vault, a daily delivery record with
-- proof of submission, an affiliate programme with promo codes, and marketing leads.

-- ---------------------------------------------------------------------------
-- Staff predicates. The 'operator' enum value is added by the preceding migration so it
-- is already committed and safe to reference from these function bodies.
-- ---------------------------------------------------------------------------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('reviewer', 'operator', 'admin'));
$$;

create or replace function public.is_operator() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('operator', 'admin'));
$$;

-- ---------------------------------------------------------------------------
-- Application answers: the questions every employer portal asks, answered once.
-- A candidate owns their row outright. Staff may read it because a specialist has to
-- transcribe these answers into employer forms — except self-identification, which is
-- column-privileged away from browser sessions entirely and only ever read through the
-- service role after an audited unlock.
-- ---------------------------------------------------------------------------
create table public.application_answers (
  user_id uuid primary key references public.users (id) on delete cascade,
  eligibility jsonb not null default '{}'::jsonb check (jsonb_typeof(eligibility) = 'object'),
  screening jsonb not null default '{}'::jsonb check (jsonb_typeof(screening) = 'object'),
  background jsonb not null default '{}'::jsonb check (jsonb_typeof(background) = 'object'),
  self_identification jsonb not null default '{}'::jsonb check (jsonb_typeof(self_identification) = 'object'),
  delivery jsonb not null default '{}'::jsonb check (jsonb_typeof(delivery) = 'object'),
  updated_at timestamptz not null default now()
);
create trigger application_answers_touch before update on public.application_answers
  for each row execute function public.touch_updated_at();

alter table public.application_answers enable row level security;
create policy answers_select on public.application_answers for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy answers_insert on public.application_answers for insert to authenticated
  with check (user_id = auth.uid());
create policy answers_update on public.application_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Nobody reaching Postgres through a browser session can read EEO self-identification,
-- not even the row's own owner. A column-level revoke alone would do nothing while a
-- table-wide SELECT grant exists, so the table grant goes first and the readable columns
-- are granted back by name. The service role bypasses both, so unlocking goes through an
-- audited server path instead.
revoke select on public.application_answers from anon, authenticated;
grant select (user_id, eligibility, screening, background, delivery, updated_at) on public.application_answers to authenticated;

-- ---------------------------------------------------------------------------
-- Delivery runs: one row per candidate per working day. Server-written only — a
-- candidate must never be able to claim work was done for them.
-- ---------------------------------------------------------------------------
create table public.delivery_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  day date not null,
  target integer not null default 0 check (target >= 0 and target <= 200),
  submitted integer not null default 0 check (submitted >= 0 and submitted <= 200),
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'delivered', 'short', 'skipped')),
  operator_id uuid references public.users (id) on delete set null,
  note text not null default '' check (char_length(note) <= 1000),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index delivery_runs_day_idx on public.delivery_runs (day desc, status);
create index delivery_runs_user_idx on public.delivery_runs (user_id, day desc);

alter table public.delivery_runs enable row level security;
create policy delivery_runs_select on public.delivery_runs for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
revoke insert, update, delete on public.delivery_runs from anon, authenticated;

-- Proof of submission, written beside the application it belongs to.
alter table public.applications add column if not exists proof jsonb;
alter table public.applications add column if not exists delivery_run_id uuid references public.delivery_runs (id) on delete set null;
create index if not exists applications_delivery_run_idx on public.applications (delivery_run_id) where delivery_run_id is not null;

-- ---------------------------------------------------------------------------
-- Partners: the affiliate programme. Promo codes are public by design (a visitor types
-- one at checkout), but payout terms and partner contact details are staff-only.
-- ---------------------------------------------------------------------------
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  promo_code text not null check (promo_code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  link_token text not null check (char_length(link_token) between 16 and 64),
  status text not null default 'active' check (status in ('active', 'paused')),
  payout jsonb not null default '{"perReferral": 0, "flatMonthly": 0, "currency": "USD", "barter": false}'::jsonb,
  note text not null default '' check (char_length(note) <= 1000),
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index partners_promo_code_key on public.partners (promo_code);
create unique index partners_link_token_key on public.partners (link_token);
create unique index partners_email_key on public.partners (lower(email));

alter table public.partners enable row level security;
-- A partner sees their own row; staff see everyone's. Payout terms are never public.
create policy partners_select on public.partners for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
revoke insert, update, delete on public.partners from anon, authenticated;

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  promo_code text not null,
  status text not null default 'visited' check (status in ('visited', 'signed_up', 'converted', 'void')),
  plan_id text references public.plans (id) on delete set null,
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  converted_at timestamptz,
  created_at timestamptz not null default now()
);
create index referrals_partner_idx on public.referrals (partner_id, created_at desc);
-- One referral record per referred account per partner; a repeat visit is not a new referral.
create unique index referrals_partner_user_key on public.referrals (partner_id, user_id) where user_id is not null;
create index referrals_user_idx on public.referrals (user_id) where user_id is not null;

alter table public.referrals enable row level security;
create policy referrals_select on public.referrals for select to authenticated
  using (public.is_staff() or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
revoke insert, update, delete on public.referrals from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Promo codes. Readable by anyone so the pricing page can quote a discount before
-- sign-in; only the server may create or redeem one.
-- ---------------------------------------------------------------------------
create table public.promo_codes (
  code text primary key check (code ~ '^[A-Z0-9][A-Z0-9_-]{2,23}$'),
  kind text not null check (kind in ('percent', 'amount')),
  value numeric(10, 2) not null check (value > 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  description text not null default '' check (char_length(description) <= 200),
  partner_id uuid references public.partners (id) on delete set null,
  applies_to_plans text[] not null default '{}',
  first_period_only boolean not null default true,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemptions integer not null default 0 check (redemptions >= 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);
create index promo_codes_active_idx on public.promo_codes (active, expires_at);

alter table public.promo_codes enable row level security;
create policy promo_codes_read on public.promo_codes for select to anon, authenticated
  using (active and starts_at <= now() and (expires_at is null or expires_at > now()));
revoke insert, update, delete on public.promo_codes from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Leads: the marketing contact form. Anonymous visitors may insert, nobody but staff
-- may read — a lead list is a competitor's shopping list.
-- ---------------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 32),
  city text not null default '' check (char_length(city) <= 80),
  country text not null default '' check (char_length(country) <= 2),
  message text not null default '' check (char_length(message) <= 2000),
  source text not null default 'website' check (char_length(source) <= 80),
  promo_code text not null default '' check (char_length(promo_code) <= 24),
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  owner_id uuid references public.users (id) on delete set null,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_queue_idx on public.leads (status, created_at desc);
create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
create policy leads_select on public.leads for select to authenticated using (public.is_staff());
-- The public form posts through a server action under the service role, so browser
-- sessions get no write access here either.
revoke insert, update, delete on public.leads from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Daily application quota per plan.
-- ---------------------------------------------------------------------------
update public.plans set limits = limits || '{"applicationsPerDay": 10}'::jsonb where id = 'entry';
update public.plans set limits = limits || '{"applicationsPerDay": 25}'::jsonb where id = 'professional';
update public.plans set limits = limits || '{"applicationsPerDay": 40}'::jsonb where id = 'executive';

-- Every existing candidate gets an empty answer vault to fill in.
insert into public.application_answers (user_id)
select id from public.users where role = 'candidate'
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- Redeeming a promo code is counted in the database, so two concurrent checkouts can
-- never both take the last redemption. Returns false when the cap is already reached.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_promo_code(p_code text) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_ok boolean;
begin
  update public.promo_codes
     set redemptions = redemptions + 1
   where code = p_code
     and active
     and starts_at <= now()
     and (expires_at is null or expires_at > now())
     and (max_redemptions is null or redemptions < max_redemptions)
  returning true into v_ok;
  return coalesce(v_ok, false);
end;
$$;

-- Only the server may redeem; the browser can read a code but never consume one. EXECUTE is
-- granted to PUBLIC by default, so that grant has to go too or the revokes above achieve nothing.
revoke execute on function public.redeem_promo_code(text) from public, anon, authenticated;
