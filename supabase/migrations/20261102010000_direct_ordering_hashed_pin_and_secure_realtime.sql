-- Migration: 20261102010000_direct_ordering_hashed_pin_and_secure_realtime.sql
-- Description: Direct ordering (nullable table_id + order_type), staff_pin_hash,
--              revoking anon RLS on orders/service_requests/reservations,
--              protecting restaurants staff PIN columns from anon SELECT,
--              and server-verified pricing in place_guest_order RPC.

-- ============================================================================
-- 1. Prerequisites & Idempotency Guards
-- ============================================================================
-- Ensure is_restaurant_admin helper function exists
create or replace function public.is_restaurant_admin(p_restaurant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.restaurant_admins
    where restaurant_admins.restaurant_id = p_restaurant_id
      and restaurant_admins.user_id = auth.uid()
  );
$$;

-- Ensure restaurants.is_published exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'restaurants'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'restaurants' and column_name = 'is_published'
  ) then
    alter table public.restaurants add column is_published boolean not null default true;
  end if;
end;
$$;

-- Ensure tables.is_active exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'tables'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tables' and column_name = 'is_active'
  ) then
    alter table public.tables add column is_active boolean not null default true;
  end if;
end;
$$;

-- Ensure orders.updated_at exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'orders'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'updated_at'
  ) then
    alter table public.orders add column updated_at timestamptz not null default now();
  end if;
end;
$$;

-- ============================================================================
-- 2. Direct Ordering: order_type and nullable table_number
-- ============================================================================
alter table public.orders
  add column if not exists order_type text not null default 'dine_in'
    check (order_type in ('dine_in', 'takeaway'));

alter table public.orders
  alter column table_number drop not null;

-- ============================================================================
-- 3. Staff PIN: Secure Hashed Storage
-- ============================================================================
alter table public.restaurants
  add column if not exists staff_pin_hash text;

-- ============================================================================
-- 4. Secure RLS: Revoke Anon SELECT on Sensitive Tables & Protect PIN
-- ============================================================================
-- Revoke anon select on orders, service_requests, and reservations
revoke select on public.orders from anon;
revoke select on public.service_requests from anon;
revoke select on public.reservations from anon;

-- Drop open anon Realtime read policies
drop policy if exists "Realtime read access for orders" on public.orders;
drop policy if exists "Realtime read access for service requests" on public.service_requests;
drop policy if exists "Realtime read access for reservations" on public.reservations;

-- Authenticated staff & admin policies
drop policy if exists "Staff and owners can view orders" on public.orders;
create policy "Staff and owners can view orders"
  on public.orders for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Staff and owners can view service requests" on public.service_requests;
create policy "Staff and owners can view service requests"
  on public.service_requests for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Staff and owners can view reservations" on public.reservations;
create policy "Staff and owners can view reservations"
  on public.reservations for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

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

-- Ensure restaurants RLS is enabled and only published restaurants are readable
alter table public.restaurants enable row level security;

drop policy if exists "Public can read published restaurants" on public.restaurants;
create policy "Public can read published restaurants"
  on public.restaurants for select
  using (is_published = true);

-- Protect staff PIN columns from direct public anon select dynamically and safely
do $$
declare
  col_record record;
  grant_cols text := '';
begin
  -- Revoke table-level select from anon
  execute 'revoke select on public.restaurants from anon';

  -- Build safe column list excluding any PIN or sensitive hash columns
  for col_record in (
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'restaurants'
      and column_name not in ('kitchen_pin', 'staff_pin_hash')
  ) loop
    if grant_cols <> '' then
      grant_cols := grant_cols || ', ';
    end if;
    grant_cols := grant_cols || quote_ident(col_record.column_name);
  end loop;

  if grant_cols <> '' then
    execute 'grant select (' || grant_cols || ') on public.restaurants to anon';
  end if;
end;
$$;

-- Ensure public can read menu categories and available menu items for published restaurants
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;

drop policy if exists "Guests can read menu categories for published restaurants" on public.menu_categories;
create policy "Guests can read menu categories for published restaurants"
  on public.menu_categories for select
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_categories.restaurant_id
        and restaurants.is_published = true
    )
  );

drop policy if exists "Guests can read available menu items for published restaurants" on public.menu_items;
create policy "Guests can read available menu items for published restaurants"
  on public.menu_items for select
  using (
    is_available = true
    and exists (
      select 1 from public.restaurants
      where restaurants.id = menu_items.restaurant_id
        and restaurants.is_published = true
    )
  );

-- ============================================================================
-- 5. Server-Verified Pricing & Direct Ordering RPC
-- ============================================================================
-- Drop earlier signature before recreating with new return type and parameter
drop function if exists public.place_guest_order(uuid, uuid, text, text, text, jsonb);

create or replace function public.place_guest_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_unique_code text,
  p_customer_phone text,
  p_notes text,
  p_items jsonb,
  p_order_type text default 'dine_in'
)
returns table (id uuid, total_amount numeric, table_number text, order_type text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  guest_table public.tables%rowtype;
  new_order_id uuid;
  order_total numeric(10, 2) := 0;
  resolved_table_number text := null;
  requested_item jsonb;
  menu_item public.menu_items%rowtype;
  item_quantity integer;
  item_instructions text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  if p_order_type not in ('dine_in', 'takeaway') then
    raise exception 'invalid_order_type' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.restaurants
    where restaurants.id = p_restaurant_id and restaurants.is_published = true
  ) then
    raise exception 'restaurant_unavailable' using errcode = 'P0002';
  end if;

  -- If dine_in with table_id, verify table exists and is active
  if p_table_id is not null then
    select * into guest_table
    from public.tables
    where tables.id = p_table_id
      and tables.restaurant_id = p_restaurant_id
      and tables.is_active = true;

    if not found then
      raise exception 'table_unavailable' using errcode = 'P0002';
    end if;
    resolved_table_number := guest_table.table_number;
  else
    resolved_table_number := null;
  end if;

  -- Calculate order total strictly from server-side menu_items
  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (requested_item->>'quantity')::integer;
    item_instructions := nullif(btrim(requested_item->>'specialInstructions'), '');

    if item_quantity < 1 or item_quantity > 20 then
      raise exception 'invalid_item_quantity' using errcode = '22023';
    end if;

    select * into menu_item
    from public.menu_items
    where menu_items.id = (requested_item->>'menuItemId')::uuid
      and menu_items.restaurant_id = p_restaurant_id
      and menu_items.is_available = true;

    if not found then
      raise exception 'menu_item_unavailable' using errcode = 'P0002';
    end if;

    order_total := order_total + (menu_item.price * item_quantity);
  end loop;

  -- Create order with server-calculated total
  insert into public.orders (
    restaurant_id, table_id, table_number, order_type,
    customer_phone, total_amount, notes, status, status_updated_at
  )
  values (
    p_restaurant_id, p_table_id, resolved_table_number, p_order_type,
    p_customer_phone, order_total, nullif(btrim(p_notes), ''), 'pending', now()
  )
  returning orders.id into new_order_id;

  -- Insert order items strictly with server-verified name and price
  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (requested_item->>'quantity')::integer;
    item_instructions := nullif(btrim(requested_item->>'specialInstructions'), '');

    select * into menu_item
    from public.menu_items
    where menu_items.id = (requested_item->>'menuItemId')::uuid
      and menu_items.restaurant_id = p_restaurant_id;

    insert into public.order_items (
      order_id, menu_item_id, item_name, quantity,
      unit_price, total_price, special_instructions
    )
    values (
      new_order_id, menu_item.id, menu_item.name, item_quantity,
      menu_item.price, menu_item.price * item_quantity, item_instructions
    );
  end loop;

  return query
  select orders.id, orders.total_amount, orders.table_number, orders.order_type, orders.created_at
  from public.orders
  where orders.id = new_order_id;
end;
$$;
