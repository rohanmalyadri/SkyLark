-- Promo codes are partner discounts, not public data. The pricing page quotes a code through the
-- server (service role, rate-limited per IP), so nobody needs to list codes from the browser.
-- Before this, anyone holding the publishable key could read every active code over the REST API.
drop policy if exists promo_codes_read on public.promo_codes;
create policy promo_codes_staff_read on public.promo_codes for select to authenticated using (public.is_staff());
revoke select on public.promo_codes from anon;
