-- Migration: 20261101234500_realtime_foundation_and_kitchen.sql
-- Description: Enable Supabase Realtime publication, REPLICA IDENTITY FULL,
--              status_updated_at trigger for orders, and multi-tenant safe RLS.

-- 1. Add status_updated_at column to public.orders
alter table public.orders
  add column if not exists status_updated_at timestamptz not null default now();

-- Backfill existing orders
update public.orders
set status_updated_at = coalesce(updated_at, created_at, now())
where status_updated_at is null;

-- 2. Trigger function to auto-update status_updated_at on every status change
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

-- 3. Set REPLICA IDENTITY FULL
-- REPLICA IDENTITY FULL ensures PostgreSQL includes the old row values during UPDATE and DELETE
-- in the WAL stream, enabling Supabase Realtime to evaluate filters such as restaurant_id=eq.${id}.
do $$
declare
  tbl text;
  tables_to_set text[] := array[
    'orders',
    'service_requests',
    'menu_items',
    'categories',
    'menu_categories',
    'restaurants'
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

-- 4. Add tables to supabase_realtime publication
do $$
declare
  tbl text;
  tables_to_add text[] := array[
    'orders',
    'service_requests',
    'menu_items',
    'categories',
    'menu_categories',
    'restaurants'
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

-- 5. Multi-Tenant Safe RLS for Realtime Subscriptions
-- Ensure anon and authenticated roles have SELECT permissions on published tables
grant select on public.orders to anon, authenticated;
grant select on public.service_requests to anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant select on public.restaurants to anon, authenticated;

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

-- RLS policies for Realtime read access
-- Multi-tenant isolation: Subscriptions must filter by restaurant_id=eq.${restaurant_id}.
-- Server-side RLS guarantees that only rows belonging to valid restaurants are readable.
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
