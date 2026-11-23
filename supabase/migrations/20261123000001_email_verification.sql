-- Email verification by one-time code (OTP), required before buying a plan.
--
-- Supabase's own "Confirm email" stays off (no custom mailer there); the app sends the codes itself
-- over SMTP. users.email_verified_at is set only by the server (service role) once a code matches.
-- Google accounts count as verified: Google has already confirmed that address.

alter table public.users add column if not exists email_verified_at timestamptz;
-- Signed-in users may update only full_name, avatar_url and onboarded_at (see the security
-- migration), so nobody can mark their own email verified through the API.

-- One pending code per user. Only a hash of the code is stored.
create table if not exists public.email_verification_codes (
  user_id uuid primary key references public.users (id) on delete cascade,
  email text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.email_verification_codes enable row level security;
-- No policies: only the service role (which bypasses RLS) reads or writes codes.
revoke all on public.email_verification_codes from public, anon, authenticated;

-- New accounts: Google sign-ups start verified.
create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url, signup_method, email_verified_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    public.signup_method_from_provider(new.raw_app_meta_data ->> 'provider'),
    case when new.raw_app_meta_data ->> 'provider' = 'google' then now() end
  )
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

-- A password account that later signs in with Google (same email) is verified from then on.
create or replace function public.handle_new_auth_identity() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.provider = 'google' then
    update public.users set email_verified_at = coalesce(email_verified_at, now()) where id = new.user_id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_identity_created on auth.identities;
create trigger on_auth_identity_created after insert on auth.identities
  for each row execute function public.handle_new_auth_identity();

-- Existing accounts with a Google identity are verified.
update public.users u
   set email_verified_at = now()
 where u.email_verified_at is null
   and exists (select 1 from auth.identities i where i.user_id = u.id and i.provider = 'google');
