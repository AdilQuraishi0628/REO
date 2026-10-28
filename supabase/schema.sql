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
  wifi_ssid text not null default '',
  wifi_password text not null default '',
  google_review_url text,
  logo_url text,
  primary_color text not null default '#536543',
  is_published boolean not null default false,
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 4),
  created_at timestamptz not null default now()
);

alter table public.restaurants
  add column if not exists wifi_ssid text not null default '',
  add column if not exists wifi_password text not null default '',
  add column if not exists google_review_url text,
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#536543',
  add column if not exists onboarding_step smallint not null default 0
    check (onboarding_step between 0 and 4);

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
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (restaurant_id, name),
  unique (restaurant_id, id)
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null,
  description text not null default '',
  price numeric(8, 2) not null check (price >= 0),
  image_url text,
  dietary_tags text[] not null default '{}',
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (restaurant_id, category_id)
    references public.menu_categories(restaurant_id, id)
    on delete cascade
);

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
  stamps integer not null default 0 check (stamps between 0 and 5),
  reward_goal integer not null default 5 check (reward_goal = 5),
  created_at timestamptz not null default now()
);

alter table public.loyalty_members
  alter column email drop not null,
  add column if not exists phone text check (phone is null or phone ~ '^\+91[6-9][0-9]{9}$'),
  add column if not exists table_id uuid references public.tables(id) on delete set null;

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
