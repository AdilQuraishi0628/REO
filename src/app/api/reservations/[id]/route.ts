import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminContext, getStaffSession, uuidPattern } from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import {
  demoReservationsStore,
  updateDemoReservationStatus,
  type ReservationStatus,
} from "@/lib/reservations-store";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  if (id.startsWith("demo-res-")) {
    const found = demoReservationsStore.find((r) => r.id === id);
    if (!found) {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }
    return NextResponse.json({ reservation: found });
  }

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid reservation ID." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    const found = demoReservationsStore.find((r) => r.id === id);
    return NextResponse.json({ reservation: found ?? null });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase
    .from("reservations")
    .select("id, restaurant_id, guest_name, phone, party_size, reservation_date, reservation_time, table_id, notes, status, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Could not fetch reservation:", error.message);
    return NextResponse.json({ error: "Could not fetch reservation." }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
  }

  return NextResponse.json({ reservation: data });
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

  if (id.startsWith("demo-res-")) {
    if (status) {
      const updated = updateDemoReservationStatus(id, status, tableId);
      if (!updated) {
        return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
      }
      return NextResponse.json({ reservation: updated });
    }
    return NextResponse.json({ error: "Provide a valid status." }, { status: 400 });
  }

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Invalid reservation ID." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    if (status) {
      const updated = updateDemoReservationStatus(id, status, tableId);
      return NextResponse.json({ reservation: updated });
    }
    return NextResponse.json({ error: "Provide a valid status." }, { status: 400 });
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

  return NextResponse.json({ reservation: data });
}
