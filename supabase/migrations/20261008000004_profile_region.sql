-- State, province or region of the candidate's home location.
alter table public.candidate_profiles
  add column if not exists location_region text not null default '' check (char_length(location_region) <= 80);
