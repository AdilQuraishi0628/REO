alter table public.restaurants
  add column if not exists loyalty_enabled boolean not null default true,
  add column if not exists loyalty_reward_goal integer not null default 5
    check (loyalty_reward_goal between 2 and 20);

alter table public.loyalty_members
  drop constraint if exists loyalty_members_stamps_check,
  drop constraint if exists loyalty_members_reward_goal_check,
  add constraint loyalty_members_stamps_check
    check (stamps between 0 and reward_goal),
  add constraint loyalty_members_reward_goal_check
    check (reward_goal between 2 and 20);

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
