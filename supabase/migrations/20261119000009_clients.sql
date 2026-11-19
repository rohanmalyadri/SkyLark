-- ---------------------------------------------------------------------------
-- Clients: the admin CRM. People who buy the service, what they agreed to pay, whether
-- it was paid, and the conversation with them. Staff-only to read; every write goes
-- through a server action under the service role, so browser sessions get no write access.
--
-- payment_source records who vouches for a payment status: 'manual' is a staff entry,
-- 'gateway' is a payment provider's confirmation. Only a gateway integration may set
-- payment_reference, and the check below keeps a manual row from carrying one.
-- ---------------------------------------------------------------------------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 32),
  company text not null default '' check (char_length(company) <= 120),
  city text not null default '' check (char_length(city) <= 80),
  status text not null default 'lead' check (status in ('lead', 'in_discussion', 'active', 'completed', 'on_hold')),
  amount integer check (amount is null or amount between 0 and 100000000),
  payment_status text not null default 'unpaid' check (payment_status in ('paid', 'pending', 'unpaid', 'refunded')),
  payment_source text not null default 'manual' check (payment_source in ('manual', 'gateway')),
  paid_at timestamptz,
  payment_method text check (char_length(payment_method) <= 60),
  payment_reference text check (char_length(payment_reference) <= 120),
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_reference_needs_gateway check (payment_reference is null or payment_source = 'gateway')
);
create index clients_recent_idx on public.clients (last_interaction_at desc nulls last);
create index clients_payment_idx on public.clients (payment_status);
create trigger clients_touch before update on public.clients
  for each row execute function public.touch_updated_at();

create table public.client_messages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  direction text not null check (direction in ('inbound', 'outbound')),
  author_name text not null check (char_length(author_name) between 1 and 120),
  author_id uuid references public.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  -- Seeded illustration rather than a real exchange; the UI labels these.
  sample boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index client_messages_thread_idx on public.client_messages (client_id, created_at);
create index client_messages_unread_idx on public.client_messages (client_id) where direction = 'inbound' and read_at is null;

create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  author_id uuid references public.users (id) on delete set null,
  author_name text not null check (char_length(author_name) between 1 and 120),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

alter table public.clients enable row level security;
alter table public.client_messages enable row level security;
alter table public.client_notes enable row level security;
create policy clients_select on public.clients for select to authenticated using (public.is_staff());
create policy client_messages_select on public.client_messages for select to authenticated using (public.is_staff());
create policy client_notes_select on public.client_notes for select to authenticated using (public.is_staff());
revoke insert, update, delete on public.clients, public.client_messages, public.client_notes from anon, authenticated;
