-- Migration: 20261102003000_full_realtime_and_reservations.sql
-- Description: Full Realtime foundation, REPLICA IDENTITY FULL, status_updated_at trigger,
--              and table reservations schema with multi-tenant safe RLS.

-- ============================================================================
-- 1. Orders: status_updated_at and trigger
-- ============================================================================
alter table public.orders
  add column if not exists status_updated_at timestamptz not null default now();

update public.orders
set status_updated_at = coalesce(updated_at, created_at, now())
where status_updated_at is null;

create or replace function public.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is distinct from new.status then
    new.status_updated_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_order_status_change on public.orders;
create trigger trg_order_status_change
  before update on public.orders
  for each row
  execute function public.handle_order_status_change();

-- ============================================================================
-- 2. Restaurant Reservation Settings
-- ============================================================================
alter table public.restaurants
  add column if not exists enable_reservations boolean not null default true,
  add column if not exists reservation_opening_time time not null default '11:00:00',
  add column if not exists reservation_closing_time time not null default '23:00:00',
  add column if not exists reservation_slot_duration integer not null default 60,
  add column if not exists reservation_max_party_size integer not null default 12,
  add column if not exists reservation_max_days_advance integer not null default 30,
  add column if not exists reservation_auto_confirm boolean not null default false;

-- ============================================================================
-- 3. Reservations Table
-- ============================================================================
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  guest_name text not null check (char_length(btrim(guest_name)) between 1 and 120),
  phone text not null check (char_length(btrim(phone)) between 7 and 24),
  party_size integer not null check (party_size between 1 and 40),
  reservation_date date not null,
  reservation_time time not null,
  table_id uuid references public.tables(id) on delete set null,
  notes text check (notes is null or char_length(notes) <= 1000),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_reservations_restaurant_date_time
  on public.reservations (restaurant_id, reservation_date, reservation_time);

create index if not exists idx_reservations_restaurant_status
  on public.reservations (restaurant_id, status, created_at desc);

create index if not exists idx_reservations_table
  on public.reservations (table_id);

-- Auto-update updated_at timestamp on reservations
create or replace function public.handle_reservation_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_reservation_updated_at on public.reservations;
create trigger trg_reservation_updated_at
  before update on public.reservations
  for each row
  execute function public.handle_reservation_updated_at();

-- ============================================================================
-- 4. Set REPLICA IDENTITY FULL
-- ============================================================================
-- Ensures WAL payload contains the entire previous row on UPDATE and DELETE,
-- allowing Realtime client filters like restaurant_id=eq.${id} or id=eq.${id} to work.
do $$
declare
  tbl text;
  tables_to_set text[] := array[
    'orders',
    'service_requests',
    'menu_items',
    'categories',
    'menu_categories',
    'restaurants',
    'reservations'
  ];
begin
  foreach tbl in array tables_to_set loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = tbl
    ) then
      execute format('alter table public.%I replica identity full;', tbl);
    end if;
  end loop;
end;
$$;

-- ============================================================================
-- 5. Add Tables to supabase_realtime Publication
-- ============================================================================
do $$
declare
  tbl text;
  tables_to_add text[] := array[
    'orders',
    'service_requests',
    'menu_items',
    'categories',
    'menu_categories',
    'restaurants',
    'reservations'
  ];
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array tables_to_add loop
      if exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = tbl
      ) and not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl
      ) then
        execute format('alter publication supabase_realtime add table public.%I;', tbl);
      end if;
    end loop;
  end if;
end;
$$;

-- ============================================================================
-- 6. Multi-Tenant Safe RLS Policies
-- ============================================================================
alter table public.reservations enable row level security;

-- Grants
grant select on public.orders to anon, authenticated;
grant select on public.service_requests to anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant select on public.restaurants to anon, authenticated;
grant select, insert on public.reservations to anon, authenticated;
grant all on public.reservations to authenticated, service_role;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'categories') then
    grant select on public.categories to anon, authenticated;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'menu_categories') then
    grant select on public.menu_categories to anon, authenticated;
  end if;
end;
$$;

-- Orders Realtime read policy:
-- Subscriptions are filtered by restaurant_id=eq.${id} (Kitchen/Admin) or id=eq.${id} (Guest)
drop policy if exists "Realtime read access for orders" on public.orders;
create policy "Realtime read access for orders"
  on public.orders for select to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = orders.restaurant_id
        and r.is_published = true
    )
  );

-- Service requests Realtime read policy
drop policy if exists "Realtime read access for service requests" on public.service_requests;
create policy "Realtime read access for service requests"
  on public.service_requests for select to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = service_requests.restaurant_id
        and r.is_published = true
    )
  );

-- Reservations RLS policies:
-- Guests can create reservations for published restaurants with reservations enabled
drop policy if exists "Guests can create reservations" on public.reservations;
create policy "Guests can create reservations"
  on public.reservations for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = reservations.restaurant_id
        and r.is_published = true
        and r.enable_reservations = true
    )
  );

-- Realtime read access for reservations (scoped to valid published restaurant)
drop policy if exists "Realtime read access for reservations" on public.reservations;
create policy "Realtime read access for reservations"
  on public.reservations for select to anon, authenticated
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = reservations.restaurant_id
        and r.is_published = true
    )
  );

-- Staff and owners can manage reservations for their restaurants
drop policy if exists "Staff and owners can manage reservations" on public.reservations;
create policy "Staff and owners can manage reservations"
  on public.reservations for all to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));
