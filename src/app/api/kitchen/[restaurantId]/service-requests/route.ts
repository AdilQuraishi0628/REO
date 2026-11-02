import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  getStaffSession,
  uuidPattern,
} from "@/lib/admin-auth";
import {
  demoServiceRequestsStore,
  updateDemoServiceRequestStatus,
  type ServiceRequestStatus,
} from "@/lib/service-requests-store";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { broadcastToKitchen } from "@/lib/realtime-broadcast";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

async function authorize(restaurantId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // 1. Check if logged in as Kitchen Staff
  const staffSession = await getStaffSession();
  if (staffSession) {
    if (staffSession.restaurantId !== restaurantId) {
      return {
        response: NextResponse.json(
          { error: "Access denied. Your staff session is only valid for your assigned restaurant." },
          { status: 403 },
        ),
      };
    }
    if (!supabaseUrl || !serviceRoleKey) {
      return { isDemo: true, isStaff: true };
    }
    const serviceClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return { serviceClient, isStaff: true };
  }

  // 2. Check Owner admin context
  const context = await getAdminContext();
  if (context) {
    if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
      return {
        response: NextResponse.json(
          { error: "You don't have access to this restaurant." },
          { status: 403 },
        ),
      };
    }
    return { serviceClient: context.serviceClient, context };
  }

  // 3. Fallback for demo mode only when Supabase is unconfigured or explicit demo ID
  const isExplicitDemo =
    restaurantId.startsWith("00000000-0000-4000-8000-") ||
    restaurantId.startsWith("demo-");
  if (isExplicitDemo || !supabaseUrl || !serviceRoleKey) {
    return { isDemo: true };
  }

  return {
    response: NextResponse.json(
      { error: "Authentication required to access kitchen service requests." },
      { status: 401 },
    ),
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await authorize(restaurantId);
  if (auth.response) return auth.response;

  if (auth.isDemo) {
    const list = demoServiceRequestsStore.filter(
      (req) => req.restaurant_id === restaurantId && req.status !== "completed",
    );
    return NextResponse.json({ requests: list });
  }

  const client = auth.serviceClient!;
  const { data, error } = await client
    .from("service_requests")
    .select("id, restaurant_id, table_id, table_number, type, status, created_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .in("status", ["pending", "acknowledged"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load service requests:", error.message);
    return NextResponse.json({ error: "Could not load service requests." }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await authorize(restaurantId);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid request data." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit valid request data." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const requestId = typeof input.requestId === "string" ? input.requestId : "";
  const status = typeof input.status === "string" ? (input.status as ServiceRequestStatus) : null;

  if (!requestId || (status !== "acknowledged" && status !== "completed")) {
    return NextResponse.json(
      { error: "A valid requestId and status ('acknowledged' or 'completed') are required." },
      { status: 400 },
    );
  }

  if (auth.isDemo) {
    const updated = updateDemoServiceRequestStatus(restaurantId, requestId, status);
    if (!updated) {
      return NextResponse.json({ error: "Service request not found." }, { status: 404 });
    }
    return NextResponse.json({ request: updated });
  }

  if (!uuidPattern.test(requestId)) {
    return NextResponse.json({ error: "Invalid request ID." }, { status: 400 });
  }

  const client = auth.serviceClient!;
  const { data, error } = await client
    .from("service_requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("restaurant_id", restaurantId)
    .eq("id", requestId)
    .select("id, restaurant_id, table_id, table_number, type, status, created_at, updated_at")
    .maybeSingle();

  if (error) {
    console.error("Could not update service request:", error.message);
    return NextResponse.json({ error: "Could not update service request." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Service request not found." }, { status: 404 });
  }

  void broadcastToKitchen(restaurantId, "service_request_resolved", {
    serviceRequest: data,
  });

  return NextResponse.json({ request: data });
}
