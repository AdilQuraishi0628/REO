import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  getStaffSession,
  uuidPattern,
} from "@/lib/admin-auth";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { demoReservationsStore } from "@/lib/reservations-store";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

async function authorize(restaurantId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const staffSession = await getStaffSession();
  if (staffSession) {
    if (staffSession.restaurantId !== restaurantId) {
      return {
        response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
      };
    }
    if (!supabaseUrl || !serviceRoleKey) {
      if (process.env.DEMO_MODE === "true") return { isDemo: true, isStaff: true };
      return {
        response: NextResponse.json({ error: "Database configuration error." }, { status: 500 }),
      };
    }
    const serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { serviceClient, isStaff: true };
  }

  if (!supabaseUrl || !serviceRoleKey) {
    if (process.env.DEMO_MODE === "true") return { isDemo: true };
    return {
      response: NextResponse.json({ error: "Database configuration error." }, { status: 500 }),
    };
  }

  const context = await getAdminContext();
  if (!context) {
    if (process.env.DEMO_MODE === "true") return { isDemo: true };
    return {
      response: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }),
    };
  }

  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return {
      response: NextResponse.json({ error: "Access denied." }, { status: 403 }),
    };
  }
  return { serviceClient: context.serviceClient, context };
}

export async function GET(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await authorize(restaurantId);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const tab = url.searchParams.get("tab") || "today"; // today | upcoming | past
  const statusFilter = url.searchParams.get("status");

  const todayStr = new Date().toISOString().split("T")[0];

  if (auth.isDemo) {
    let list = demoReservationsStore.filter((r) => r.restaurant_id === restaurantId);

    if (tab === "today") {
      list = list.filter((r) => r.reservation_date === todayStr);
    } else if (tab === "upcoming") {
      list = list.filter((r) => r.reservation_date > todayStr);
    } else if (tab === "past") {
      list = list.filter((r) => r.reservation_date < todayStr);
    }

    if (statusFilter && statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }

    return NextResponse.json({
      reservations: list,
      pendingCount: demoReservationsStore.filter(
        (r) => r.restaurant_id === restaurantId && r.status === "pending",
      ).length,
    });
  }

  const client = auth.serviceClient!;

  // 1. Fetch tables map for table_number lookup
  const { data: tables } = await client
    .from("tables")
    .select("id, table_number")
    .eq("restaurant_id", restaurantId);

  const tableMap = new Map<string, string>();
  for (const t of tables ?? []) {
    tableMap.set(t.id, t.table_number);
  }

  // 2. Query reservations
  let query = client
    .from("reservations")
    .select("id, restaurant_id, guest_name, phone, party_size, reservation_date, reservation_time, table_id, notes, status, created_at, updated_at")
    .eq("restaurant_id", restaurantId);

  if (tab === "today") {
    query = query.eq("reservation_date", todayStr).order("reservation_time", { ascending: true });
  } else if (tab === "upcoming") {
    query = query
      .gt("reservation_date", todayStr)
      .order("reservation_date", { ascending: true })
      .order("reservation_time", { ascending: true });
  } else if (tab === "past") {
    query = query
      .lt("reservation_date", todayStr)
      .order("reservation_date", { ascending: false })
      .order("reservation_time", { ascending: false });
  }

  if (statusFilter && statusFilter !== "all") {
    query = query.eq(
      "status",
      statusFilter as Database["public"]["Tables"]["reservations"]["Row"]["status"]
    );
  }

  const { data: reservations, error } = await query;
  if (error) {
    console.error("Could not fetch admin reservations:", error.message);
    return NextResponse.json({ error: "Could not load reservations." }, { status: 500 });
  }

  // Count pending for badge
  const { count: pendingCount } = await client
    .from("reservations")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending");

  const enriched = (reservations ?? []).map((r) => ({
    ...r,
    table_number: r.table_id ? tableMap.get(r.table_id) || "Assigned" : null,
  }));

  return NextResponse.json({
    reservations: enriched,
    pendingCount: pendingCount ?? 0,
    tables: tables ?? [],
  });
}
