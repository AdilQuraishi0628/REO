-- Preparatory migration. Apply to staging before running convert-staff-pins.ts.
alter table public.restaurants add column if not exists pin_reset_required boolean not null default false;
