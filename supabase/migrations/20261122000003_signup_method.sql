-- Records how each account was created and lets the server explain a failed email sign-in.
--
-- public.users.email already keeps every account's sign-up email. This adds how they signed up:
-- 'password' (email + password) or 'google'. Any other provider enabled later is stored by its
-- Supabase name, so a new provider can never break sign-up.

alter table public.users add column if not exists signup_method text;

create or replace function public.signup_method_from_provider(p_provider text) returns text
language sql immutable set search_path = '' as $$
  select case when p_provider is null or p_provider = '' then null when p_provider = 'email' then 'password' else p_provider end
$$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, full_name, avatar_url, signup_method)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    public.signup_method_from_provider(new.raw_app_meta_data ->> 'provider')
  )
  on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

-- Backfill existing accounts from the provider Supabase recorded when they signed up.
update public.users u
   set signup_method = public.signup_method_from_provider(a.raw_app_meta_data ->> 'provider')
  from auth.users a
 where a.id = u.id and u.signup_method is null;

-- Sign-in methods for an email: null when no account uses it, otherwise the linked identity
-- providers ('email' means a password exists). Server-only: it reveals whether an account exists,
-- so only the service role may call it, and the app rate-limits the callers.
create or replace function public.account_sign_in_methods(p_email text) returns text[]
language sql stable security definer set search_path = '' as $$
  select case
    when not exists (select 1 from auth.users u where lower(u.email) = lower(p_email)) then null
    else coalesce(
      (select array_agg(distinct i.provider order by i.provider)
         from auth.identities i join auth.users u on u.id = i.user_id
        where lower(u.email) = lower(p_email)),
      '{}'::text[])
  end
$$;

revoke execute on function public.account_sign_in_methods(text) from public, anon, authenticated;
grant execute on function public.account_sign_in_methods(text) to service_role;
