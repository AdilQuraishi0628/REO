create extension if not exists "pgcrypto";

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  address text not null default '',
  city text not null default '',
  phone text not null default '',
  hours text not null default '',
  hero_image text not null default '',
  initials text not null default '',
  wifi_name text,
  wifi_ssid text not null default '',
  wifi_password text not null default '',
  google_review_url text,
  logo_url text,
  primary_color text not null default '#536543',
  loyalty_enabled boolean not null default true,
  loyalty_reward_goal integer not null default 5 check (loyalty_reward_goal between 2 and 20),
  enable_call_waiter boolean not null default true,
  enable_request_bill boolean not null default true,
  enable_wifi boolean not null default true,
  is_published boolean not null default false,
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 4),
  created_at timestamptz not null default now()
);

alter table public.restaurants
  add column if not exists tagline text not null default '',
  add column if not exists description text not null default '',
  add column if not exists address text not null default '',
  add column if not exists city text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists hours text not null default '',
  add column if not exists hero_image text not null default '',
  add column if not exists initials text not null default '',
  add column if not exists wifi_name text,
  add column if not exists wifi_ssid text not null default '',
  add column if not exists wifi_password text not null default '',
  add column if not exists google_review_url text,
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#536543',
  add column if not exists loyalty_enabled boolean not null default true,
  add column if not exists loyalty_reward_goal integer not null default 5
    check (loyalty_reward_goal between 2 and 20),
  add column if not exists enable_call_waiter boolean not null default true,
  add column if not exists enable_request_bill boolean not null default true,
  add column if not exists enable_wifi boolean not null default true,
  add column if not exists secondary_color text not null default '#C84B16',
  add column if not exists instagram_url text,
  add column if not exists enable_menu boolean not null default true,
  add column if not exists enable_ordering boolean not null default true,
  add column if not exists enable_feedback boolean not null default true,
  add column if not exists enable_google_reviews boolean not null default true,
  add column if not exists loyalty_type text not null default 'stamps',
  add column if not exists loyalty_reward_description text not null default 'Complimentary treat or beverage',
  add column if not exists loyalty_points_per_amount integer not null default 10,
  add column if not exists loyalty_points_goal integer not null default 100,
  add column if not exists kitchen_pin text not null default '1234',
  add column if not exists onboarding_step smallint not null default 0
    check (onboarding_step between 0 and 4);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'restaurant-assets',
  'restaurant-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.restaurants'::regclass
      and conname = 'restaurants_onboarding_step_check'
  ) then
    alter table public.restaurants
      add constraint restaurants_onboarding_step_check
      check (onboarding_step between 0 and 4);
  end if;
end;
$$;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  icon text,
  image_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name),
  unique (restaurant_id, id)
);

alter table public.menu_categories
  add column if not exists icon text,
  add column if not exists image_url text;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text not null default '',
  price numeric(8, 2) not null check (price >= 0),
  pricing_variants jsonb,
  image_url text,
  dietary_tags text[] not null default '{}',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, category_id)
    references public.menu_categories(restaurant_id, id)
    on delete cascade
);

alter table public.menu_items
  add column if not exists pricing_variants jsonb;

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

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  table_number text not null check (char_length(table_number) between 1 and 80),
  type text not null check (type in ('call_waiter', 'request_bill')),
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_restaurant_status_idx
  on public.service_requests (restaurant_id, status, created_at desc);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  guest_name text check (char_length(guest_name) <= 100),
  contact text check (char_length(contact) <= 254),
  phone text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  table_label text check (char_length(table_label) <= 80),
  review_prompted boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.feedback
  add column if not exists table_label text check (char_length(table_label) <= 80),
  add column if not exists table_id uuid references public.tables(id) on delete set null,
  add column if not exists review_prompted boolean not null default false,
  add column if not exists resolved_at timestamptz,
  add column if not exists phone text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$');

create table if not exists public.restaurant_page_views (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  table_label text check (char_length(table_label) <= 80),
  viewed_at timestamptz not null default now()
);

create index if not exists restaurant_page_views_restaurant_date_idx
  on public.restaurant_page_views (restaurant_id, viewed_at desc);

create table if not exists public.loyalty_members (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  full_name text not null check (char_length(full_name) between 1 and 100),
  email text check (char_length(email) between 3 and 254),
  phone text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  stamps integer not null default 0,
  reward_goal integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.loyalty_members
  alter column email drop not null,
  add column if not exists full_name text not null default '',
  add column if not exists phone text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  add column if not exists table_id uuid references public.tables(id) on delete set null;

alter table public.loyalty_members
  drop constraint if exists loyalty_members_stamps_check,
  drop constraint if exists loyalty_members_reward_goal_check,
  add constraint loyalty_members_stamps_check
    check (stamps between 0 and reward_goal),
  add constraint loyalty_members_reward_goal_check
    check (reward_goal between 2 and 20);

create table if not exists public.restaurant_admins (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table if not exists public.rate_limit_buckets (
  key text primary key,
  window_started_at timestamptz not null,
  attempts integer not null check (attempts > 0)
);

create index if not exists rate_limit_buckets_window_idx
  on public.rate_limit_buckets (window_started_at);

create table if not exists public.guest_links (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  kind text not null check (kind in ('qr', 'nfc')),
  token text not null unique,
  table_label text check (char_length(table_label) <= 80),
  created_at timestamptz not null default now()
);

create index if not exists guest_links_restaurant_created_idx
  on public.guest_links (restaurant_id, created_at desc);
create index if not exists restaurant_admins_user_id_idx
  on public.restaurant_admins (user_id);
create index if not exists feedback_restaurant_created_idx
  on public.feedback (restaurant_id, created_at desc);
create index if not exists loyalty_members_restaurant_created_idx
  on public.loyalty_members (restaurant_id, created_at desc);

drop index if exists public.loyalty_members_restaurant_email_idx;
create unique index if not exists loyalty_members_restaurant_phone_idx
  on public.loyalty_members (restaurant_id, phone)
  where phone is not null;

create index if not exists menu_categories_restaurant_order_idx
  on public.menu_categories (restaurant_id, sort_order);
create index if not exists menu_items_restaurant_category_order_idx
  on public.menu_items (restaurant_id, category_id, sort_order);

alter table public.restaurants enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.feedback enable row level security;
alter table public.loyalty_members enable row level security;
alter table public.restaurant_admins enable row level security;
alter table public.guest_links enable row level security;
alter table public.restaurant_page_views enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.tables enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.restaurants, public.menu_categories, public.menu_items
  to anon, authenticated;
grant select on public.tables to anon, authenticated;
grant insert, update, delete on public.tables to authenticated;
revoke all on public.feedback from public, anon, authenticated;
grant all on public.feedback to service_role;
revoke all on public.restaurant_page_views from public, anon, authenticated;
grant insert on public.restaurant_page_views to service_role;
revoke all on public.loyalty_members from public, anon, authenticated;
grant all on public.loyalty_members to service_role;
revoke all on public.restaurant_admins from public, anon, authenticated;
grant all on public.restaurant_admins to service_role;
revoke all on public.guest_links from public, anon, authenticated;
grant all on public.guest_links to service_role;
grant all on public.tables to service_role;
revoke all on public.orders, public.order_items from public, anon, authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;
grant all on public.restaurants, public.menu_categories, public.menu_items
  to service_role;

create or replace function public.is_restaurant_admin(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_admins
    where restaurant_id = p_restaurant_id
      and user_id = auth.uid()
  );
$$;

revoke all on function public.is_restaurant_admin(uuid) from public, anon;
grant execute on function public.is_restaurant_admin(uuid) to authenticated, service_role;

create or replace function public.consume_rate_limit(
  p_key text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_attempts integer;
begin
  if p_key is null or length(p_key) > 160
     or p_max_attempts is null or p_max_attempts < 1 or p_max_attempts > 100
     or p_window_seconds is null or p_window_seconds < 1 or p_window_seconds > 86400 then
    return false;
  end if;

  delete from public.rate_limit_buckets
  where window_started_at < now() - interval '1 day';

  insert into public.rate_limit_buckets as bucket (key, window_started_at, attempts)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_started_at = case
          when bucket.window_started_at <= now() - make_interval(secs => p_window_seconds)
            then now()
          else bucket.window_started_at
        end,
        attempts = case
          when bucket.window_started_at <= now() - make_interval(secs => p_window_seconds)
            then 1
          else bucket.attempts + 1
        end
  returning attempts into current_attempts;

  return current_attempts <= p_max_attempts;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;
revoke all on public.rate_limit_buckets from public, anon, authenticated;
grant all on public.rate_limit_buckets to service_role;

create or replace function public.admin_analytics_summary(
  p_restaurant_id uuid,
  p_since timestamptz default null
)
returns table (
  total_scans bigint,
  loyalty_members bigint,
  feedback_total bigint,
  average_rating numeric,
  review_prompts bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.restaurant_page_views v
      where v.restaurant_id = p_restaurant_id
        and (p_since is null or v.viewed_at >= p_since)),
    (select count(*) from public.loyalty_members m
      where m.restaurant_id = p_restaurant_id
        and (p_since is null or m.created_at >= p_since)),
    (select count(*) from public.feedback f
      where f.restaurant_id = p_restaurant_id
        and (p_since is null or f.created_at >= p_since)),
    (select coalesce(round(avg(f.rating)::numeric, 2), 0) from public.feedback f
      where f.restaurant_id = p_restaurant_id
        and (p_since is null or f.created_at >= p_since)),
    (select count(*) from public.feedback f
      where f.restaurant_id = p_restaurant_id
        and f.review_prompted = true
        and (p_since is null or f.created_at >= p_since));
$$;

revoke all on function public.admin_analytics_summary(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.admin_analytics_summary(uuid, timestamptz)
  to service_role;

create or replace function public.admin_add_loyalty_stamp(
  p_restaurant_id uuid,
  p_member_id uuid
)
returns table (id uuid, stamps integer, reward_goal integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    update public.loyalty_members as member
    set stamps = member.stamps + 1
    where member.id = p_member_id
      and member.restaurant_id = p_restaurant_id
      and member.stamps < member.reward_goal
    returning member.id, member.stamps, member.reward_goal;
end;
$$;

revoke all on function public.admin_add_loyalty_stamp(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_add_loyalty_stamp(uuid, uuid)
  to service_role;

drop policy if exists "Public can read published restaurants"
  on public.restaurants;
create policy "Public can read published restaurants"
  on public.restaurants for select
  using (is_published = true);

drop policy if exists "Restaurant admins can read their restaurants"
  on public.restaurants;
create policy "Restaurant admins can read their restaurants"
  on public.restaurants for select to authenticated
  using (public.is_restaurant_admin(id));

drop policy if exists "Restaurant admins can update their restaurants"
  on public.restaurants;
create policy "Restaurant admins can update their restaurants"
  on public.restaurants for update to authenticated
  using (public.is_restaurant_admin(id))
  with check (public.is_restaurant_admin(id));

drop policy if exists "Public can read published restaurant categories"
  on public.menu_categories;
create policy "Public can read published restaurant categories"
  on public.menu_categories for select
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_categories.restaurant_id
        and restaurants.is_published = true
    )
  );

drop policy if exists "Restaurant admins can read their menu categories"
  on public.menu_categories;
create policy "Restaurant admins can read their menu categories"
  on public.menu_categories for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can manage their menu categories"
  on public.menu_categories;
create policy "Restaurant admins can manage their menu categories"
  on public.menu_categories for all to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Public can read published restaurant menu"
  on public.menu_items;
create policy "Public can read published restaurant menu"
  on public.menu_items for select
  using (
    exists (
      select 1 from public.restaurants
      where restaurants.id = menu_items.restaurant_id
        and restaurants.is_published = true
    )
  );

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

drop policy if exists "Restaurant admins can read their menu items"
  on public.menu_items;
create policy "Restaurant admins can read their menu items"
  on public.menu_items for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can manage their menu items"
  on public.menu_items;
create policy "Restaurant admins can manage their menu items"
  on public.menu_items for all to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Guests can submit feedback for published restaurants"
  on public.feedback;

drop policy if exists "Restaurant admins can read private feedback"
  on public.feedback;
create policy "Restaurant admins can read private feedback"
  on public.feedback for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can resolve private feedback"
  on public.feedback;
create policy "Restaurant admins can resolve private feedback"
  on public.feedback for update to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Users can read their restaurant memberships"
  on public.restaurant_admins;
create policy "Users can read their restaurant memberships"
  on public.restaurant_admins for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Restaurant admins can read their guest links"
  on public.guest_links;
create policy "Restaurant admins can read their guest links"
  on public.guest_links for select to authenticated
  using (public.is_restaurant_admin(restaurant_id));

drop policy if exists "Restaurant admins can manage their guest links"
  on public.guest_links;
create policy "Restaurant admins can manage their guest links"
  on public.guest_links for all to authenticated
  using (public.is_restaurant_admin(restaurant_id))
  with check (public.is_restaurant_admin(restaurant_id));

grant select, update on public.restaurants to authenticated;
grant select, insert, update, delete on public.menu_categories to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select on public.feedback to authenticated;
grant update (resolved_at) on public.feedback to authenticated;
grant select on public.restaurant_admins to authenticated;
grant select, insert, update, delete on public.guest_links to authenticated;
grant select, insert, update, delete on public.tables to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant update (status, updated_at) on public.orders to authenticated;

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

insert into public.restaurants (
  id, slug, name, tagline, description, address, city, phone, hours,
  hero_image, initials, wifi_ssid, wifi_password, google_review_url, is_published
) values (
  '00000000-0000-4000-8000-000000000001',
  'juniper-and-rye',
  'Juniper & Rye',
  'A little slower. A lot more delicious.',
  'Season-led California cooking, natural wine, and the kind of evening you wish would last a little longer.',
  '4124 Piedmont Avenue',
  'Oakland, CA 94611',
  '(510) 555-0142',
  'Open today · 11:30 am – 10 pm',
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=88',
  'J&R',
  'Juniper Guest',
  'gatheraround',
  'https://www.google.com/maps/search/?api=1&query=Juniper%20%26%20Rye%20Oakland%20CA',
  true
) on conflict (slug) do nothing;

update public.restaurants
set wifi_ssid = 'Juniper Guest',
    wifi_password = 'gatheraround',
    google_review_url = 'https://www.google.com/maps/search/?api=1&query=Juniper%20%26%20Rye%20Oakland%20CA'
where slug = 'juniper-and-rye'
  and wifi_ssid = '';

insert into public.menu_categories (id, restaurant_id, name, sort_order) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'To start', 1),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'The main event', 2),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Something sweet', 3)
on conflict (restaurant_id, name) do nothing;

insert into public.menu_items (
  restaurant_id, category_id, name, description, price, image_url,
  dietary_tags, is_available, sort_order
)
select
  '00000000-0000-4000-8000-000000000001',
  category.id,
  item.name,
  item.description,
  item.price,
  item.image_url,
  item.dietary_tags,
  true,
  item.sort_order
from (values
  ('To start', 'Heirloom tomatoes', 'Whipped ricotta, basil oil, grilled sourdough', 16.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=82', array['Vegetarian'], 1),
  ('To start', 'Crispy artichokes', 'Lemon aioli, pecorino, garden herbs', 14.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82', array['Vegetarian', 'Gluten free'], 2),
  ('To start', 'Wood-fired carrots', 'Green harissa, toasted pistachio, labneh', 15.00, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=82', array['Vegetarian'], 3),
  ('The main event', 'Ricotta gnocchi', 'Wild mushrooms, sage brown butter, hazelnut', 28.00, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=900&q=82', array['Vegetarian'], 1),
  ('The main event', 'Roasted king salmon', 'Spring peas, crispy potatoes, dill crème fraîche', 34.00, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=82', array['Gluten free'], 2),
  ('The main event', 'Steak frites', 'Hanger steak, shoestring fries, green peppercorn', 38.00, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=82', array['Gluten free'], 3),
  ('Something sweet', 'Olive oil cake', 'Macerated strawberries, vanilla cream', 12.00, 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=82', array['Vegetarian'], 1),
  ('Something sweet', 'Dark chocolate tart', 'Flaky sea salt, crème fraîche', 13.00, 'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=900&q=82', array['Vegetarian'], 2)
) as item(category_name, name, description, price, image_url, dietary_tags, sort_order)
join public.menu_categories as category
  on category.restaurant_id = '00000000-0000-4000-8000-000000000001'
  and category.name = item.category_name
where not exists (
  select 1 from public.menu_items existing
  where existing.restaurant_id = '00000000-0000-4000-8000-000000000001'
    and existing.category_id = category.id
    and existing.name = item.name
);
