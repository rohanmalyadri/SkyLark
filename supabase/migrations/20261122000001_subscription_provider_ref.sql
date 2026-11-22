-- Links a subscription to its payment provider's subscription (e.g. Razorpay sub_…), so renewals,
-- failed charges and cancellations reported by webhook land on the right row.
alter table public.subscriptions add column if not exists provider_ref text;
create unique index if not exists subscriptions_provider_ref_idx on public.subscriptions (provider_ref) where provider_ref is not null;
