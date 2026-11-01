import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid page-view event." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid page-view event." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const restaurantId =
    typeof input.restaurantId === "string" ? input.restaurantId : "";
  const tableLabel =
    input.tableLabel === undefined || input.tableLabel === null
      ? null
      : typeof input.tableLabel === "string"
        ? input.tableLabel.trim()
        : undefined;
  const tableId =
    input.tableId === undefined || input.tableId === null
      ? null
      : typeof input.tableId === "string"
        ? input.tableId
        : undefined;

  if (
    !uuidPattern.test(restaurantId) ||
    tableLabel === undefined ||
    (tableLabel !== null && tableLabel.length > 80) ||
    tableId === undefined ||
    (tableId !== null && !uuidPattern.test(tableId))
  ) {
    if (!uuidPattern.test(restaurantId)) {
      return NextResponse.json({ success: true, tracked: false, demo: true }, { status: 200 });
    }
    return NextResponse.json({ error: "Invalid page-view event." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json({ success: true, tracked: false, demo: true }, { status: 200 });
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("is_published", true)
    .maybeSingle();

  if (restaurantError) {
    console.error("Could not validate page-view restaurant:", restaurantError.message);
    return NextResponse.json({ error: "Could not track this page view." }, { status: 500 });
  }
  if (!restaurant) return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });

  let verifiedTableLabel = tableLabel;
  if (tableId) {
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .maybeSingle();
    if (tableError) {
      console.error("Could not validate page-view table:", tableError.message);
      return NextResponse.json({ error: "Could not track this page view." }, { status: 500 });
    }
    if (!table) return NextResponse.json({ error: "Table not found." }, { status: 404 });
    verifiedTableLabel = table.table_number;
  }

  const { error } = await supabase.from("restaurant_page_views").insert({
    restaurant_id: restaurantId,
    table_id: tableId,
    table_label: verifiedTableLabel,
  });
  if (error) {
    console.error("Could not record page view:", error.message);
    return NextResponse.json({ error: "Could not track this page view." }, { status: 500 });
  }
  return new Response(null, { status: 204 });
}
