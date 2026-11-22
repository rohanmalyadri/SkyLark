-- ---------------------------------------------------------------------------
-- Clients can chat with the team from their own account. A client record links to at
-- most one user account and each account to at most one client. Users still get no
-- direct table access: their Messages page goes through a server action that has
-- already checked the session, exactly like the staff side.
--
-- Deleting the account unlinks the client rather than deleting it: what was agreed and
-- paid is the business's own record.
-- ---------------------------------------------------------------------------
alter table public.clients add column user_id uuid references public.users (id) on delete set null;
create unique index clients_user_idx on public.clients (user_id) where user_id is not null;
