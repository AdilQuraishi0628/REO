-- Migration: 20261102030000_order_codes_and_direct_ordering.sql
-- Description: Short collision-safe order codes (#A1042), direct ordering (dine_in without table, takeaway),
--              and server-verified pricing in place_guest_order RPC.

-- ============================================================================
-- 1. Orders table order_code and order_type columns
-- ============================================================================
alter table public.orders
  add column if not exists order_code text;

alter table public.orders
  add column if not exists order_type text default 'dine_in';

create index if not exists idx_orders_order_code
  on public.orders (restaurant_id, order_code);

create index if not exists idx_orders_order_type
  on public.orders (restaurant_id, order_type);

-- ============================================================================
-- 2. Enhanced place_guest_order RPC with Order Codes & Direct Ordering
-- ============================================================================
drop function if exists public.place_guest_order(uuid, uuid, text, text, text, jsonb);
drop function if exists public.place_guest_order(uuid, uuid, text, text, text, jsonb, text);
drop function if exists public.place_guest_order(uuid, uuid, text, text, text, jsonb, text, text);

create or replace function public.place_guest_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_unique_code text,
  p_customer_phone text,
  p_notes text,
  p_items jsonb,
  p_order_type text default 'dine_in',
  p_order_code text default null
)
returns table (
  id uuid,
  total_amount numeric,
  table_number text,
  order_type text,
  order_code text,
  created_at timestamptz
)
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
  final_order_code text;
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

  -- Resolve collision-safe order code (#A1042 format)
  if p_order_code is not null and btrim(p_order_code) <> '' then
    final_order_code := btrim(p_order_code);
  else
    final_order_code := '#' || chr(65 + floor(random() * 26)::int) || lpad(floor(1000 + random() * 9000)::text, 4, '0');
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

  -- Create order with server-calculated total and order code
  insert into public.orders (
    restaurant_id, table_id, table_number, order_type, order_code,
    customer_phone, total_amount, notes, status, status_updated_at, created_at, updated_at
  )
  values (
    p_restaurant_id, p_table_id, resolved_table_number, p_order_type, final_order_code,
    p_customer_phone, order_total, nullif(btrim(p_notes), ''), 'pending', now(), now(), now()
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
      new_order_id,
      menu_item.id,
      menu_item.name,
      item_quantity,
      menu_item.price,
      menu_item.price * item_quantity,
      item_instructions
    );
  end loop;

  return query
  select
    o.id,
    o.total_amount,
    o.table_number,
    o.order_type,
    o.order_code,
    o.created_at
  from public.orders o
  where o.id = new_order_id;
end;
$$;

grant execute on function public.place_guest_order(
  uuid, uuid, text, text, text, jsonb, text, text
) to anon, authenticated, service_role;
