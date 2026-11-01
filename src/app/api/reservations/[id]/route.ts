import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminContext, getStaffSession, uuidPattern } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import {
  demoReservationsStore,
  updateDemoReservationStatus,
  type ReservationStatus,
} from "@/lib/reservations-store";
import { broadcastToKitchen, broadcastToReservation } from "@/lib/realtime-broadcast";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDemo =
    process.env.DEMO_MODE === "true" ||
    ((!supabaseUrl || !serviceRoleKey) && id.startsWith("demo-res-"));

  if (id.startsWith("demo-res-")) {
    if (isDemo) {
      const found = demoReservationsStore.find((r) => r.id === id);
      if (!found) {
        return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
      }
      return NextResponse.json({ reservation: found });
    }
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid reservation ID." }, { status: 400 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server database configuration missing." }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("reservations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Could not fetch reservation:", error.message);
    return NextResponse.json({ error: "Could not fetch reservation." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  // Guests must read their own reservation through an API route that takes the id and returns only non-sensitive fields (no phone)
  const staffSession = await getStaffSession();
  const adminContext = await getAdminContext();
  const isStaffOrAdmin = Boolean(
    (staffSession && staffSession.restaurantId === data.restaurant_id) ||
    (adminContext && adminContext.restaurantIds.includes(data.restaurant_id))
  );

  const resRecord = data as Record<string, unknown>;
  const safeReservation = isStaffOrAdmin
    ? data
    : {
        id: data.id,
        reference_code: resRecord.reference_code || null,
        restaurant_id: data.restaurant_id,
        guest_name: data.guest_name,
        party_size: data.party_size,
        reservation_date: data.reservation_date,
        reservation_time: data.reservation_time,
        table_id: data.table_id,
        notes: data.notes,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

  return NextResponse.json({ reservation: safeReservation });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid update data." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid update data." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const validStatuses: ReservationStatus[] = [
    "pending",
    "confirmed",
    "seated",
    "completed",
    "cancelled",
    "no_show",
  ];

  const status =
    typeof input.status === "string" && validStatuses.includes(input.status as ReservationStatus)
      ? (input.status as ReservationStatus)
      : undefined;

  const tableId = typeof input.tableId === "string" ? input.tableId : undefined;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDemo =
    process.env.DEMO_MODE === "true" ||
    ((!supabaseUrl || !serviceRoleKey) && id.startsWith("demo-res-"));

  if (id.startsWith("demo-res-")) {
    if (isDemo) {
      if (status) {
        const updated = updateDemoReservationStatus(id, status, tableId);
        if (!updated) {
          return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
        }
        void broadcastToKitchen(updated.restaurant_id, "reservation_status_change", {
          reservation: updated,
        });
        void broadcastToReservation(updated.id, "reservation_status_change", {
          id: updated.id,
          status: updated.status,
          guestName: updated.guest_name,
          reservationDate: updated.reservation_date,
          reservationTime: updated.reservation_time,
          partySize: updated.party_size,
          tableId: updated.table_id,
        });
        return NextResponse.json({ reservation: updated });
      }
      return NextResponse.json({ error: "Provide a valid status." }, { status: 400 });
    }
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid reservation ID." }, { status: 400 });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server database configuration missing." }, { status: 500 });
  }

  // Check auth: either staff session or admin context
  const staffSession = await getStaffSession();
  const adminContext = await getAdminContext();
  if (!staffSession && !adminContext) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const updatePayload: Database["public"]["Tables"]["reservations"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (status) updatePayload.status = status;
  if (tableId !== undefined) updatePayload.table_id = tableId || null;

  const { data, error } = await supabase
    .from("reservations")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    console.error("Could not update reservation:", error.message);
    return NextResponse.json({ error: "Could not update reservation." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  void broadcastToKitchen(data.restaurant_id, "reservation_status_change", {
    reservation: data,
  });
  void broadcastToReservation(data.id, "reservation_status_change", {
    id: data.id,
    status: data.status,
    guestName: data.guest_name,
    reservationDate: data.reservation_date,
    reservationTime: data.reservation_time,
    partySize: data.party_size,
    tableId: data.table_id,
  });

  return NextResponse.json({ reservation: data });
}
