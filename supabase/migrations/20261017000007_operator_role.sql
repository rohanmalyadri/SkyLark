-- Operators are the specialists who submit applications on a candidate's behalf. They are
-- staff, but unlike reviewers their job is submission rather than approval.
--
-- This lives in its own migration on purpose: Postgres will not let a newly added enum
-- value be *used* in the transaction that added it, and the next migration needs
-- 'operator' inside the body of a `language sql` function, which is parsed at creation.
alter type public.user_role add value if not exists 'operator';
