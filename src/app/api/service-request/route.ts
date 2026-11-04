import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { consumeRateLimit, consumeRateLimitKey } from "@/lib/rate-limit";
import { addDemoServiceRequest } from "@/lib/service-requests-store";
import { uuidPattern } from "@/lib/admin-auth";
import { broadcastToKitchen } from "@/lib/realtime-broadcast";
import { verifyTableToken } from "@/lib/table-token";
import { missingServiceRoleInProduction } from "@/lib/server-config";

type ServiceRequestBody = {
  restaurantId: string;
  tableId?: string | null;
  tableNumber?: string | null;
  tableLabel?: string | null;
  uniqueCode?: string | null;
  tableToken?: string | null;
  type: "call_waiter" | "request_bill";
};

export async function POST(request: Request) {
  const configurationError = missingServiceRoleInProduction("Service requests");
  if (configurationError) return NextResponse.json({ error: configurationError }, { status: 500 });
  const rate = await consumeRateLimit(request, "guest-service-request", 12, 300);
  if (rate !== "allowed") {
    return NextResponse.json(
      { error: "Please wait a moment before sending another request to staff." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid request format." }, { status: 400 });
  }

  const { restaurantId, tableId, tableNumber, tableLabel, uniqueCode, tableToken, type } = body as ServiceRequestBody;

  if (!restaurantId || !uuidPattern.test(restaurantId)) {
    return NextResponse.json({ error: "Invalid restaurant identification." }, { status: 400 });
  }

  if (type !== "call_waiter" && type !== "request_bill") {
    return NextResponse.json(
      { error: "Service request type must be 'call_waiter' or 'request_bill'." },
      { status: 400 },
    );
  }
  if (!tableId || !uniqueCode || !tableToken || !verifyTableToken(uniqueCode, tableToken)) {
    return NextResponse.json({ error: "Scan an active table QR code to request service." }, { status: 403 });
  }
  const tableRate = await consumeRateLimitKey(`table-service-request:${restaurantId}:${tableId}`, 12, 300);
  if (tableRate !== "allowed") return NextResponse.json({ error: "Please wait a moment before sending another request to staff." }, { status: tableRate === "limited" ? 429 : 503 });

  const resolvedTableNumber = (tableNumber || tableLabel || "your table").trim().slice(0, 80);
  const confirmationMessage =
    type === "call_waiter"
      ? `Waiter has been called for ${resolvedTableNumber}`
      : `Bill requested for ${resolvedTableNumber}`;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    // Demo mode: persist in demo store
    const demoReq = addDemoServiceRequest({
      restaurant_id: restaurantId,
      table_id: tableId ?? null,
      table_number: resolvedTableNumber,
      type,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      request: demoReq,
      message: confirmationMessage,
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify restaurant settings
  const { data: restaurant, error: restError } = await supabase
    .from("restaurants")
    .select("id, is_published, enable_call_waiter, enable_request_bill")
    .eq("id", restaurantId)
    .maybeSingle();

  if (restError || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  const { data: table, error: tableError } = await supabase
    .from("tables")
    .select("id, table_number")
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .eq("unique_code", uniqueCode)
    .eq("is_active", true)
    .maybeSingle();
  if (tableError || !table) return NextResponse.json({ error: "Table is not active for this restaurant." }, { status: 403 });

  if (type === "call_waiter" && restaurant.enable_call_waiter === false) {
    return NextResponse.json({ error: "Waiter calling is currently disabled by the venue." }, { status: 403 });
  }

  if (type === "request_bill" && restaurant.enable_request_bill === false) {
    return NextResponse.json({ error: "Bill requesting is currently disabled by the venue." }, { status: 403 });
  }

  const { data: requestRecord, error: insertError } = await supabase
    .from("service_requests")
    .insert({
      restaurant_id: restaurantId,
      table_id: table.id,
      table_number: table.table_number,
      type,
      status: "pending",
    })
    .select("id, restaurant_id, table_id, table_number, type, status, created_at, updated_at")
    .single();

  if (insertError) {
    console.error("Could not insert service request:", insertError.message);
    return NextResponse.json({ error: "Could not send your request. Please ask a staff member." }, { status: 500 });
  }

  void broadcastToKitchen(restaurantId, "service_request", {
    id: requestRecord.id,
    tableNumber: requestRecord.table_number,
    type: requestRecord.type,
    status: "pending",
    createdAt: requestRecord.created_at,
  });

  return NextResponse.json({
    success: true,
    request: requestRecord,
    message: confirmationMessage,
  });
}
