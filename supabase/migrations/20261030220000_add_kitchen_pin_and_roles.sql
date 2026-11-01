-- Add kitchen staff PIN and staff role support
alter table public.restaurants
  add column if not exists kitchen_pin text not null default '1234';

-- Ensure restaurant_admins table has an optional role column ('owner' vs 'staff')
alter table public.restaurant_admins
  add column if not exists role text not null default 'owner'
  check (role in ('owner', 'kitchen', 'staff'));
