-- Migration: 20261102020000_reservations_concurrency_and_short_codes.sql
-- Description: Collision-safe reference codes, database-level double-booking protection,
--              advisory lock slot reservation function, and table uniqueness constraint.

-- ============================================================================
-- 1. Reference Code Column and Unique Index
-- ============================================================================
alter table public.reservations
  add column if not exists reference_code text;

create unique index if not exists idx_reservations_reference_code
  on public.reservations (reference_code)
  where reference_code is not null;

-- ============================================================================
-- 2. Physical Table Double-Booking Prevention Index
-- ============================================================================
-- Ensures a specific table can never be double-booked for the same date and time
create unique index if not exists idx_reservations_no_double_book_table
  on public.reservations (restaurant_id, table_id, reservation_date, reservation_time)
  where table_id is not null and status in ('pending', 'confirmed', 'seated');

-- ============================================================================
-- 3. Concurrency-Safe Table Reservation Booking Function
-- ============================================================================
-- Uses transaction-scoped advisory locks to serialize bookings on the same slot
create or replace function public.book_table_reservation(
  p_restaurant_id uuid,
  p_guest_name text,
  p_phone text,
  p_party_size integer,
  p_reservation_date date,
  p_reservation_time time,
  p_notes text,
  p_reference_code text,
  p_table_id uuid default null
)
returns table (
  id uuid,
  restaurant_id uuid,
  guest_name text,
  phone text,
  party_size integer,
  reservation_date date,
  reservation_time time,
  table_id uuid,
  notes text,
  status text,
  reference_code text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  restaurant_record public.restaurants%rowtype;
  active_table_count integer := 0;
  existing_slot_bookings integer := 0;
  max_capacity_per_slot integer := 8;
  initial_status text := 'pending';
  lock_key bigint;
  new_res_id uuid;
begin
  -- Validate restaurant exists, published and reservations enabled
  select * into restaurant_record
  from public.restaurants
  where restaurants.id = p_restaurant_id;

  if not found or restaurant_record.is_published = false or restaurant_record.enable_reservations = false then
    raise exception 'reservations_unavailable' using errcode = 'P0002';
  end if;

  -- Compute deterministic 64-bit advisory lock key for restaurant + date + slot
  -- hashtext produces 32-bit integer, we combine restaurant hash and date/time hash
  lock_key := (('x' || substr(md5(p_restaurant_id::text || ':' || p_reservation_date::text || ':' || p_reservation_time::text), 1, 16))::bit(64)::bigint);
  perform pg_advisory_xact_lock(lock_key);

  -- Determine maximum capacity per slot
  select count(*) into active_table_count
  from public.tables
  where tables.restaurant_id = p_restaurant_id
    and tables.is_active = true;

  if active_table_count > 0 then
    max_capacity_per_slot := active_table_count;
  else
    max_capacity_per_slot := 8;
  end if;

  -- Count existing active bookings for this slot
  select count(*) into existing_slot_bookings
  from public.reservations
  where reservations.restaurant_id = p_restaurant_id
    and reservations.reservation_date = p_reservation_date
    and reservations.reservation_time = p_reservation_time
    and reservations.status in ('pending', 'confirmed', 'seated');

  if existing_slot_bookings >= max_capacity_per_slot then
    raise exception 'slot_already_booked' using errcode = '23P01';
  end if;

  -- If a specific table was requested, check for table collision
  if p_table_id is not null then
    if exists (
      select 1 from public.reservations
      where reservations.restaurant_id = p_restaurant_id
        and reservations.table_id = p_table_id
        and reservations.reservation_date = p_reservation_date
        and reservations.reservation_time = p_reservation_time
        and reservations.status in ('pending', 'confirmed', 'seated')
    ) then
      raise exception 'slot_already_booked' using errcode = '23P01';
    end if;
  end if;

  if restaurant_record.reservation_auto_confirm = true then
    initial_status := 'confirmed';
  else
    initial_status := 'pending';
  end if;

  insert into public.reservations (
    restaurant_id, guest_name, phone, party_size,
    reservation_date, reservation_time, table_id, notes,
    status, reference_code, created_at, updated_at
  )
  values (
    p_restaurant_id, btrim(p_guest_name), btrim(p_phone), p_party_size,
    p_reservation_date, p_reservation_time, p_table_id, nullif(btrim(p_notes), ''),
    initial_status, p_reference_code, now(), now()
  )
  returning reservations.id into new_res_id;

  return query
  select
    r.id, r.restaurant_id, r.guest_name, r.phone, r.party_size,
    r.reservation_date, r.reservation_time, r.table_id, r.notes,
    r.status, r.reference_code, r.created_at, r.updated_at
  from public.reservations r
  where r.id = new_res_id;
end;
$$;

grant execute on function public.book_table_reservation(
  uuid, text, text, integer, date, time, text, text, uuid
) to anon, authenticated, service_role;

