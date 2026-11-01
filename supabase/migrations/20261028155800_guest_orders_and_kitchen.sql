create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  table_number text not null check (char_length(table_number) between 1 and 80),
  customer_phone text check (
    customer_phone is null or customer_phone ~ '^\+91[6-9][0-9]{9}$'
  ),
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  notes text check (notes is null or char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name text not null check (char_length(item_name) between 1 and 160),
  quantity integer not null check (quantity between 1 and 20),
  unit_price numeric(8, 2) not null check (unit_price >= 0),
  total_price numeric(10, 2) not null check (total_price >= 0),
  special_instructions text check (
    special_instructions is null or char_length(special_instructions) <= 500
  ),
  created_at timestamptz not null default now()
);

create index if not exists orders_restaurant_created_idx
  on public.orders (restaurant_id, created_at desc);
create index if not exists orders_restaurant_status_created_idx
  on public.orders (restaurant_id, status, created_at desc);
create index if not exists order_items_order_created_idx
  on public.order_items (order_id, created_at);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.orders, public.order_items from public, anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;

drop policy if exists "Restaurant admins can read their orders" on public.orders;
create policy "Restaurant admins can read their orders"
  on public.orders for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can update their orders" on public.orders;
create policy "Restaurant admins can update their orders"
  on public.orders for update to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can read their order items" on public.order_items;
create policy "Restaurant admins can read their order items"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
        and public.is_restaurant_admin(orders.restaurant_id)
    )
  );

create or replace function public.place_guest_order(
  p_restaurant_id uuid,
  p_table_id uuid,
  p_unique_code text,
  p_customer_phone text,
  p_notes text,
  p_items jsonb
)
returns table (id uuid, total_amount numeric, table_number text, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  guest_table public.tables%rowtype;
  new_order_id uuid;
  order_total numeric(10, 2) := 0;
  requested_item jsonb;
  menu_item public.menu_items%rowtype;
  item_quantity integer;
  item_instructions text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'invalid_items' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'invalid_items' using errcode = '22023';
  end if;

  if p_notes is not null and char_length(p_notes) > 1000 then
    raise exception 'invalid_notes' using errcode = '22023';
  end if;

  if p_customer_phone is not null
     and p_customer_phone !~ '^\+91[6-9][0-9]{9}$' then
    raise exception 'invalid_phone' using errcode = '22023';
  end if;

  select * into guest_table
  from public.tables
  where tables.id = p_table_id
    and tables.restaurant_id = p_restaurant_id
    and tables.unique_code = p_unique_code
    and tables.is_active = true;

  if not found or not exists (
    select 1 from public.restaurants
    where restaurants.id = p_restaurant_id and restaurants.is_published = true
  ) then
    raise exception 'table_unavailable' using errcode = 'P0002';
  end if;

  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(requested_item) <> 'object'
       or requested_item->>'menuItemId' is null
       or requested_item->>'quantity' is null
       or (requested_item->>'menuItemId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or (requested_item->>'quantity') !~ '^[0-9]+$' then
      raise exception 'invalid_item' using errcode = '22023';
    end if;

    item_quantity := (requested_item->>'quantity')::integer;
    item_instructions := nullif(btrim(requested_item->>'specialInstructions'), '');
    if item_quantity < 1 or item_quantity > 20
       or (item_instructions is not null and char_length(item_instructions) > 500) then
      raise exception 'invalid_item' using errcode = '22023';
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

  insert into public.orders (
    restaurant_id, table_id, table_number, customer_phone, total_amount, notes
  )
  values (
    p_restaurant_id, guest_table.id, guest_table.table_number,
    p_customer_phone, order_total, nullif(btrim(p_notes), '')
  )
  returning orders.id into new_order_id;

  for requested_item in select value from jsonb_array_elements(p_items)
  loop
    item_quantity := (requested_item->>'quantity')::integer;
    item_instructions := nullif(btrim(requested_item->>'specialInstructions'), '');
    select * into menu_item
    from public.menu_items
    where menu_items.id = (requested_item->>'menuItemId')::uuid
      and menu_items.restaurant_id = p_restaurant_id;

    insert into public.order_items (
      order_id, menu_item_id, item_name, quantity, unit_price, total_price,
      special_instructions
    )
    values (
      new_order_id, menu_item.id, menu_item.name, item_quantity,
      menu_item.price, menu_item.price * item_quantity, item_instructions
    );
  end loop;

  return query
    select orders.id, orders.total_amount, orders.table_number, orders.created_at
    from public.orders
    where orders.id = new_order_id;
end;
$$;

revoke all on function public.place_guest_order(uuid, uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.place_guest_order(uuid, uuid, text, text, text, jsonb)
  to service_role;

grant select on public.orders, public.order_items to authenticated;
grant update (status, updated_at) on public.orders to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'orders'
     ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end;
$$;
