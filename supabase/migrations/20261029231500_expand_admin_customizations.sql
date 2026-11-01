-- Migration: Expand Restaurant Customization Options, Feature Toggles, Loyalty Models, and Menu Options
-- Run timestamp: 2026-10-29 23:15:00

-- 1. Restaurants table enhancements
alter table public.restaurants
  add column if not exists secondary_color text not null default '#C84B16',
  add column if not exists instagram_url text,
  add column if not exists enable_menu boolean not null default true,
  add column if not exists enable_ordering boolean not null default true,
  add column if not exists enable_feedback boolean not null default true,
  add column if not exists enable_google_reviews boolean not null default true,
  add column if not exists loyalty_type text not null default 'stamps',
  add column if not exists loyalty_reward_description text not null default 'Complimentary treat or beverage',
  add column if not exists loyalty_points_per_amount integer not null default 10,
  add column if not exists loyalty_points_goal integer not null default 100;

-- 2. Menu categories enhancements (icons / images)
alter table public.menu_categories
  add column if not exists icon text,
  add column if not exists image_url text;

-- 3. Menu items enhancements (pricing variants for Regular / Large etc.)
alter table public.menu_items
  add column if not exists pricing_variants jsonb;
