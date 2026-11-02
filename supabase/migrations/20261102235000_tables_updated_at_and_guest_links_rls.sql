-- Migration: tables_updated_at_and_guest_links_rls
-- Purpose:
-- 1. Ensure `tables.updated_at` column exists safely without breaking environments created without it.
-- 2. Grant anonymous guests SELECT access on strictly necessary columns for table token resolution on `guest_links` and `tables`.
-- 3. Avoid opening tenant tables broadly.

-- 1. Ensure updated_at exists on tables
alter table public.tables
  add column if not exists updated_at timestamptz not null default now();

-- 2. Secure guest_links for anonymous table token resolution
alter table public.guest_links enable row level security;

-- Grant column-level SELECT on guest_links strictly for token resolution fields
grant select (id, restaurant_id, token, table_label, kind, created_at)
  on public.guest_links to anon, authenticated;

drop policy if exists "Guests can read guest links" on public.guest_links;
create policy "Guests can read guest links"
  on public.guest_links for select to anon
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = guest_links.restaurant_id
    )
  );

-- 3. Secure tables for anonymous table token resolution
grant select (id, restaurant_id, table_number, unique_code, is_active, created_at)
  on public.tables to anon;

drop policy if exists "Guests can read active tables for published restaurants" on public.tables;
drop policy if exists "Guests can read tables for resolution" on public.tables;
create policy "Guests can read tables for resolution"
  on public.tables for select to anon
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = tables.restaurant_id
    )
  );
