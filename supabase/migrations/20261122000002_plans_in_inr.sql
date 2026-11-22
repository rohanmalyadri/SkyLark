-- Razorpay subscriptions on an Indian account are charged in rupees, so plans are priced in INR.
update public.plans set currency = 'INR', price_monthly = 1599,  price_yearly = 15000  where id = 'entry';
update public.plans set currency = 'INR', price_monthly = 3999,  price_yearly = 38400  where id = 'professional';
update public.plans set currency = 'INR', price_monthly = 11999, price_yearly = 115200 where id = 'executive';
