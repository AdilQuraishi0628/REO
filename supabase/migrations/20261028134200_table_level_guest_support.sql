create table if not exists public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_number text not null check (char_length(table_number) between 1 and 80),
  unique_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, table_number)
);

create index if not exists tables_restaurant_created_idx
  on public.tables (restaurant_id, created_at);

alter table public.feedback
  add column if not exists table_id uuid references public.tables(id) on delete set null;

alter table public.loyalty_members
  add column if not exists table_id uuid references public.tables(id) on delete set null;

alter table public.restaurant_page_views
  add column if not exists table_id uuid references public.tables(id) on delete set null;

alter table public.tables enable row level security;

grant select on public.tables to anon, authenticated;
grant insert, update, delete on public.tables to authenticated;
grant all on public.tables to service_role;

drop policy if exists "Guests can read active tables for published restaurants"
  on public.tables;
create policy "Guests can read active tables for published restaurants"
  on public.tables for select
  using (
    is_active = true
    and exists (
      select 1 from public.restaurants
      where restaurants.id = tables.restaurant_id
        and restaurants.is_published = true
    )
  );

drop policy if exists "Restaurant admins can read their tables"
  on public.tables;
create policy "Restaurant admins can read their tables"
  on public.tables for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can manage their tables"
  on public.tables;
create policy "Restaurant admins can manage their tables"
  on public.tables for all to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));
