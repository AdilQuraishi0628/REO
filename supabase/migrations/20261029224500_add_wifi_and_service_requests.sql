-- 1. Add WiFi & Service feature flags to restaurants table
alter table public.restaurants
  add column if not exists wifi_name text,
  add column if not exists enable_call_waiter boolean not null default true,
  add column if not exists enable_request_bill boolean not null default true,
  add column if not exists enable_wifi boolean not null default true;

-- Update wifi_name from wifi_ssid if wifi_name is null
update public.restaurants
set wifi_name = wifi_ssid
where (wifi_name is null or wifi_name = '') and wifi_ssid is not null and wifi_ssid != '';

-- 2. Create service_requests table
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  table_number text not null,
  type text not null check (type in ('call_waiter', 'request_bill')),
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for performance
create index if not exists idx_service_requests_restaurant_status
  on public.service_requests(restaurant_id, status, created_at desc);

-- Enable RLS
alter table public.service_requests enable row level security;

-- Policies:
-- 1. Anyone (guests at tables) can insert a service request for a valid published restaurant
create policy "Guests can create service requests"
  on public.service_requests
  for insert
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = service_requests.restaurant_id
        and r.is_published = true
    )
  );

-- 2. Staff and owners can view and manage service requests for their restaurant
create policy "Staff can manage service requests"
  on public.service_requests
  for all
  using (
    exists (
      select 1 from public.restaurant_owners ro
      where ro.restaurant_id = service_requests.restaurant_id
        and ro.user_id = auth.uid()
    )
  );

-- Add to supabase_realtime publication for instant live updates on kitchen display
alter publication supabase_realtime add table public.service_requests;
