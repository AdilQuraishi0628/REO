-- Security hardening: apply through Supabase migration tooling, never manually in production.
-- Anonymous callers must not enumerate physical table credentials or execute order RPCs.

alter table public.orders add column if not exists idempotency_key uuid;
create unique index if not exists orders_restaurant_idempotency_key_idx
  on public.orders (restaurant_id, idempotency_key) where idempotency_key is not null;

-- Run scripts/convert-staff-pins.ts on staging first. This migration refuses to
-- remove the legacy column until every usable PIN has a scrypt replacement.
alter table public.restaurants alter column kitchen_pin drop default;
do $$
begin
  if exists (
    select 1 from public.restaurants
    where kitchen_pin is not null
      and kitchen_pin <> '1234'
      and kitchen_pin not like 'scrypt:%'
      and coalesce(staff_pin_hash, '') not like 'scrypt:%'
  ) then
    raise exception 'Refusing to drop kitchen_pin: run convert-staff-pins.ts first';
  end if;
end $$;
alter table public.restaurants drop column if exists kitchen_pin;

revoke all on public.tables from anon;
revoke all on public.guest_links from anon;
drop policy if exists "Guests can read active tables for published restaurants" on public.tables;
drop policy if exists "Guests can read tables for resolution" on public.tables;
drop policy if exists "Guests can read guest links" on public.guest_links;

-- Server code resolves guest QR links with service role after validating the HMAC token.
revoke execute on function public.place_guest_order(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.place_guest_order(uuid, uuid, text, text, text, jsonb) to service_role;

-- Defense in depth: direct PostgREST writes are never available to anonymous users.
revoke all on public.orders, public.order_items, public.service_requests from anon, public;
