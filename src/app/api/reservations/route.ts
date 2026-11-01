import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizeIndianPhone } from "@/lib/indian-phone";
import type { Database } from "@/lib/database.types";
import {
  demoReservationsStore,
  addDemoReservation,
} from "@/lib/reservations-store";
import { broadcastToKitchen, broadcastToReservation } from "@/lib/realtime-broadcast";
import { generateReservationReferenceCode } from "@/lib/reservation-code";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function generateTimeSlots(opening: string, closing: string, intervalMinutes = 60): string[] {
  const slots: string[] = [];
  const [openH, openM] = opening.split(":").map(Number);
  const [closeH, closeM] = closing.split(":").map(Number);

  let currentMinutes = openH * 60 + (openM || 0);
  const endMinutes = closeH * 60 + (closeM || 0);

  while (currentMinutes + intervalMinutes <= endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    slots.push(timeStr);
    currentMinutes += intervalMinutes;
  }
  return slots;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const restaurantId = url.searchParams.get("restaurantId");
  const dateStr = url.searchParams.get("date");

  if (!restaurantId || !dateStr || !datePattern.test(dateStr)) {
    return NextResponse.json(
      { error: "Provide a valid restaurantId and date (YYYY-MM-DD)." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDemo =
    process.env.DEMO_MODE === "true" ||
    ((!supabaseUrl || !serviceRoleKey) && restaurantId.startsWith("00000000-0000-4000-8000-"));

  if (isDemo) {
    const defaultSlots = generateTimeSlots("11:00", "23:00", 60);
    const existing = demoReservationsStore.filter(
      (r) =>
        r.restaurant_id === restaurantId &&
        r.reservation_date === dateStr &&
        ["pending", "confirmed", "seated"].includes(r.status),
    );

    const slotCounts = new Map<string, number>();
    for (const r of existing) {
      const slotTime = r.reservation_time.slice(0, 5);
      slotCounts.set(slotTime, (slotCounts.get(slotTime) ?? 0) + 1);
    }

    const slots = defaultSlots.map((time) => {
      const count = slotCounts.get(time) ?? 0;
      return {
        time,
        available: count < 6, // 6 concurrent bookings per slot in demo
        remainingCapacity: Math.max(0, 6 - count),
      };
    });

    return NextResponse.json({
      slots,
      settings: {
        enableReservations: true,
        openingTime: "11:00",
        closingTime: "23:00",
        slotDuration: 60,
        maxPartySize: 12,
        maxDaysAdvance: 30,
        autoConfirm: false,
      },
    });
  }

  if (!uuidPattern.test(restaurantId)) {
    return NextResponse.json({ error: "Invalid restaurant ID." }, { status: 400 });
  }

  const supabase = createClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Fetch restaurant settings
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, is_published, enable_reservations, reservation_opening_time, reservation_closing_time, reservation_slot_duration, reservation_max_party_size, reservation_max_days_advance, reservation_auto_confirm")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restErr || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  if (!restaurant.is_published || restaurant.enable_reservations === false) {
    return NextResponse.json({
      slots: [],
      settings: { enableReservations: false },
      message: "Online reservations are currently paused for this restaurant.",
    });
  }

  // 2. Fetch total active tables for capacity baseline
  const { count: tableCount } = await supabase
    .from("tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  const capacityPerSlot = Math.max(4, tableCount ?? 8);

  // 3. Fetch existing reservations for the requested date
  const { data: existingReservations } = await supabase
    .from("reservations")
    .select("reservation_time, status")
    .eq("restaurant_id", restaurantId)
    .eq("reservation_date", dateStr)
    .in("status", ["pending", "confirmed", "seated"]);

  const openingTime = (restaurant.reservation_opening_time as string) || "11:00:00";
  const closingTime = (restaurant.reservation_closing_time as string) || "23:00:00";
  const slotDuration = Number(restaurant.reservation_slot_duration) || 60;

  const allSlots = generateTimeSlots(openingTime.slice(0, 5), closingTime.slice(0, 5), slotDuration);

  const bookedCounts = new Map<string, number>();
  for (const res of existingReservations ?? []) {
    const timeKey = (res.reservation_time as string).slice(0, 5);
    bookedCounts.set(timeKey, (bookedCounts.get(timeKey) ?? 0) + 1);
  }

  const slots = allSlots.map((time) => {
    const count = bookedCounts.get(time) ?? 0;
    return {
      time,
      available: count < capacityPerSlot,
      remainingCapacity: Math.max(0, capacityPerSlot - count),
    };
  });

  return NextResponse.json({
    slots,
    settings: {
      enableReservations: restaurant.enable_reservations,
      openingTime: openingTime.slice(0, 5),
      closingTime: closingTime.slice(0, 5),
      slotDuration,
      maxPartySize: restaurant.reservation_max_party_size || 12,
      maxDaysAdvance: restaurant.reservation_max_days_advance || 30,
      autoConfirm: restaurant.reservation_auto_confirm || false,
    },
  });
}

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "guest-reservation", 20, 300);
  if (rate !== "allowed") {
    return NextResponse.json(
      { error: "Too many reservation requests. Please wait a few minutes." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid reservation data." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid reservation data." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const restaurantId = typeof input.restaurantId === "string" ? input.restaurantId.trim() : "";
  const guestName = typeof input.guestName === "string" ? input.guestName.trim() : "";
  const rawPhone = typeof input.phone === "string" ? input.phone.trim() : "";
  const phone = normalizeIndianPhone(rawPhone);
  const partySize = Number(input.partySize);
  const reservationDate = typeof input.reservationDate === "string" ? input.reservationDate.trim() : "";
  const rawTime = typeof input.reservationTime === "string" ? input.reservationTime.trim() : "";
  const reservationTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime;
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim() : null;

  if (!restaurantId || !guestName || !phone || !partySize || !reservationDate || !reservationTime) {
    return NextResponse.json(
      { error: "Please fill in all required fields (Name, Phone, Party Size, Date, Time)." },
      { status: 400 },
    );
  }

  if (guestName.length < 2 || guestName.length > 120) {
    return NextResponse.json({ error: "Guest name must be between 2 and 120 characters." }, { status: 400 });
  }

  if (partySize < 1 || partySize > 40) {
    return NextResponse.json({ error: "Party size must be between 1 and 40 guests." }, { status: 400 });
  }

  if (!datePattern.test(reservationDate) || !timePattern.test(reservationTime)) {
    return NextResponse.json({ error: "Invalid date or time format." }, { status: 400 });
  }

  // Validate phone format
  if (phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }

  // Validate not in the past
  const todayStr = new Date().toISOString().split("T")[0];
  if (reservationDate < todayStr) {
    return NextResponse.json({ error: "Reservation date cannot be in the past." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDemo =
    process.env.DEMO_MODE === "true" ||
    ((!supabaseUrl || !serviceRoleKey) && restaurantId.startsWith("00000000-0000-4000-8000-"));

  if (isDemo) {
    // Check demo capacity
    const slotTimeKey = reservationTime.slice(0, 5);
    const existingCount = demoReservationsStore.filter(
      (r) =>
        r.restaurant_id === restaurantId &&
        r.reservation_date === reservationDate &&
        r.reservation_time.startsWith(slotTimeKey) &&
        ["pending", "confirmed", "seated"].includes(r.status),
    ).length;

    if (existingCount >= 6) {
      return NextResponse.json(
        { error: "That slot was just taken. Please select another time or table." },
        { status: 409 },
      );
    }

    const refCode = generateReservationReferenceCode();
    const created = addDemoReservation({
      restaurant_id: restaurantId,
      guest_name: guestName,
      phone,
      party_size: partySize,
      reservation_date: reservationDate,
      reservation_time: reservationTime.slice(0, 5),
      table_id: null,
      notes,
      status: "confirmed", // auto-confirm in demo mode
      reference_code: refCode,
    });

    void broadcastToKitchen(restaurantId, "new_reservation", {
      reservation: created,
    });
    void broadcastToReservation(created.id, "reservation_status_change", {
      id: created.id,
      status: created.status,
      guestName: created.guest_name,
      reservationDate: created.reservation_date,
      reservationTime: created.reservation_time,
      partySize: created.party_size,
    });

    return NextResponse.json({ reservation: created }, { status: 201 });
  }

  if (!uuidPattern.test(restaurantId)) {
    return NextResponse.json({ error: "Invalid restaurant ID." }, { status: 400 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server database configuration missing." }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify restaurant settings
  const { data: restaurant, error: restErr } = await supabase
    .from("restaurants")
    .select("id, is_published, enable_reservations, reservation_opening_time, reservation_closing_time, reservation_slot_duration, reservation_max_party_size, reservation_max_days_advance, reservation_auto_confirm")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restErr || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  if (!restaurant.is_published || restaurant.enable_reservations === false) {
    return NextResponse.json(
      { error: "Online table reservations are currently paused for this restaurant." },
      { status: 400 },
    );
  }

  // Validate opening hours
  const openingTime = restaurant.reservation_opening_time || "11:00:00";
  const closingTime = restaurant.reservation_closing_time || "23:00:00";
  if (reservationTime < openingTime || reservationTime > closingTime) {
    return NextResponse.json(
      { error: `Reservations are only available between ${openingTime.slice(0, 5)} and ${closingTime.slice(0, 5)}.` },
      { status: 400 },
    );
  }

  // Validate slot duration
  const slotDuration = (restaurant as Record<string, unknown>).reservation_slot_duration as number || 60;
  const [openH, openM] = openingTime.split(":").map(Number);
  const [resH, resM] = reservationTime.split(":").map(Number);
  const diffMinutes = (resH * 60 + (resM || 0)) - (openH * 60 + (openM || 0));
  if (diffMinutes < 0 || diffMinutes % slotDuration !== 0) {
    return NextResponse.json(
      { error: `Reservations must align with the ${slotDuration}-minute slot interval.` },
      { status: 400 },
    );
  }

  // Validate party size against restaurant policy
  const maxParty = restaurant.reservation_max_party_size || 12;
  if (partySize > maxParty) {
    return NextResponse.json(
      { error: `Online bookings accept up to ${maxParty} guests. For larger parties, please call the restaurant directly.` },
      { status: 400 },
    );
  }

  // Validate date advance window
  const maxDays = restaurant.reservation_max_days_advance || 30;
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxDays);
  const maxDateStr = maxDate.toISOString().split("T")[0];
  if (reservationDate > maxDateStr) {
    return NextResponse.json(
      { error: `Reservations can only be made up to ${maxDays} days in advance.` },
      { status: 400 },
    );
  }

  const refCode = generateReservationReferenceCode();

  // Call Postgres RPC with advisory lock for atomic double-booking protection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rpcResult, error: rpcErr } = await (supabase.rpc as any)(
    "book_table_reservation",
    {
      p_restaurant_id: restaurantId,
      p_guest_name: guestName,
      p_phone: phone,
      p_party_size: partySize,
      p_reservation_date: reservationDate,
      p_reservation_time: reservationTime,
      p_notes: notes,
      p_reference_code: refCode,
      p_table_id: null,
    },
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reservation: any = null;

  if (rpcErr) {
    if (rpcErr.code === "23P01" || /slot_already_booked|table_already_booked/i.test(rpcErr.message)) {
      return NextResponse.json(
        { error: "That slot was just taken. Please select another time or table." },
        { status: 409 },
      );
    }

    // Graceful fallback before book_table_reservation RPC migration is applied
    const { count: tableCount } = await supabase
      .from("tables")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true);

    const capacityPerSlot = Math.max(4, tableCount ?? 8);
    const { count: existingBookingsCount } = await supabase
      .from("reservations")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .eq("reservation_date", reservationDate)
      .eq("reservation_time", reservationTime)
      .in("status", ["pending", "confirmed", "seated"]);

    if ((existingBookingsCount ?? 0) >= capacityPerSlot) {
      return NextResponse.json(
        { error: "That slot was just taken. Please select another time or table." },
        { status: 409 },
      );
    }

    const initialStatus = restaurant.reservation_auto_confirm ? "confirmed" : "pending";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertPayload: any = {
      restaurant_id: restaurantId,
      guest_name: guestName,
      phone,
      party_size: partySize,
      reservation_date: reservationDate,
      reservation_time: reservationTime,
      notes,
      status: initialStatus,
      reference_code: refCode,
    };

    let insertRes = await supabase.from("reservations").insert(insertPayload).select().single();
    if (insertRes.error && /reference_code/i.test(insertRes.error.message)) {
      delete insertPayload.reference_code;
      insertRes = await supabase.from("reservations").insert(insertPayload).select().single();
    }
    if (insertRes.error || !insertRes.data) {
      console.error("Could not create reservation:", insertRes.error?.message);
      return NextResponse.json(
        { error: "We could not confirm your reservation request. Please try again." },
        { status: 500 },
      );
    }
    reservation = insertRes.data;
  } else {
    reservation = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  }

  void broadcastToKitchen(restaurantId, "new_reservation", {
    reservation,
  });
  void broadcastToReservation(reservation.id, "reservation_status_change", {
    id: reservation.id,
    status: reservation.status,
    guestName: reservation.guest_name,
    reservationDate: reservation.reservation_date,
    reservationTime: reservation.reservation_time,
    partySize: reservation.party_size,
    referenceCode: reservation.reference_code,
  });

  return NextResponse.json({ reservation }, { status: 201 });
}
