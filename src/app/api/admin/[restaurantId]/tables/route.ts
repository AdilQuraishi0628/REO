import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

function createUniqueCode() {
  return randomBytes(9).toString("base64url");
}

async function getAuthorizedContext(restaurantId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey || restaurantId.startsWith("00000000-0000-4000-8000-")) {
    return { isDemo: true };
  }

  const context = await getAdminContext();
  if (!context) {
    return { isDemo: true };
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return {
      response: NextResponse.json(
        { error: "You don't have access to this restaurant." },
        { status: 403 },
      ),
    };
  }
  return { context };
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await getAuthorizedContext(restaurantId);
  if (auth.response) return auth.response;

  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const siteOrigin = configuredOrigin
    ? new URL(configuredOrigin).origin
    : new URL(_request.url).origin;

  if (auth.isDemo) {
    const isJuniper = restaurantId.endsWith("0001");
    const isChai = restaurantId.endsWith("0002");
    const prefix = isJuniper ? "juniper" : isChai ? "chai" : "royal";
    const demoRows = [1, 2, 3, 4, 5].map((num) => ({
      id: `table-id-${prefix}-${num}`,
      restaurant_id: restaurantId,
      table_number: `Table ${num}`,
      unique_code: `demo-${prefix}-t${num}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    return NextResponse.json({ tables: demoRows, siteOrigin });
  }

  const { data, error } = await auth.context!.serviceClient
    .from("tables")
    .select("id, restaurant_id, table_number, unique_code, is_active, created_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .order("table_number", { ascending: true });
  if (error) {
    console.error("Could not load restaurant tables:", error.message);
    return NextResponse.json({ error: "Could not load restaurant tables." }, { status: 500 });
  }
  return NextResponse.json({ tables: data ?? [], siteOrigin });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await getAuthorizedContext(restaurantId);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid table details." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit valid table details." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  if (auth.isDemo) {
    if (input.action === "bulk") {
      return NextResponse.json({ tables: [], created: 20 }, { status: 201 });
    }
    return NextResponse.json({
      table: {
        id: `table-demo-${Date.now()}`,
        restaurant_id: restaurantId,
        table_number: String(input.tableNumber || "Table New"),
        unique_code: `demo-tab-${Date.now().toString(36)}`,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }, { status: 201 });
  }

  if (input.action === "bulk") {
    const { start, end } = input;
    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start ||
      end - start >= 200
    ) {
      return NextResponse.json(
        { error: "Choose a whole-number range containing no more than 200 tables." },
        { status: 400 },
      );
    }

    const prefix = typeof input.prefix === "string" ? input.prefix : "";
    const rows = Array.from({ length: end - start + 1 }, (_, index) => ({
      restaurant_id: restaurantId,
      table_number: `${prefix}${start + index}`,
      unique_code: createUniqueCode(),
    }));
    const { data, error } = await auth.context!.serviceClient
      .from("tables")
      .upsert(rows, { onConflict: "restaurant_id,table_number", ignoreDuplicates: true })
      .select("id, table_number, unique_code, is_active, created_at, updated_at");
    if (error) {
      console.error("Could not bulk create restaurant tables:", error.message);
      return NextResponse.json({ error: "Could not create the requested tables." }, { status: 500 });
    }
    return NextResponse.json({ tables: data ?? [], created: data?.length ?? 0 }, { status: 201 });
  }

  const tableNumber =
    typeof input.tableNumber === "string" ? input.tableNumber.trim() : "";
  if (!tableNumber || tableNumber.length > 80) {
    return NextResponse.json(
      { error: "Enter a table number between 1 and 80 characters." },
      { status: 400 },
    );
  }
  const { data, error } = await auth.context!.serviceClient
    .from("tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: tableNumber,
      unique_code: createUniqueCode(),
    })
    .select("id, restaurant_id, table_number, unique_code, is_active, created_at, updated_at")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That table number already exists for this restaurant." },
        { status: 409 },
      );
    }
    console.error("Could not create restaurant table:", error.message);
    return NextResponse.json({ error: "Could not create the table." }, { status: 500 });
  }
  return NextResponse.json({ table: data }, { status: 201 });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await getAuthorizedContext(restaurantId);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid table changes." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit valid table changes." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const id = typeof input.id === "string" ? input.id : "";
  const updates: { table_number?: string; is_active?: boolean; updated_at: string } = {
    updated_at: new Date().toISOString(),
  };
  if (typeof input.tableNumber === "string") {
    const tableNumber = input.tableNumber.trim();
    if (!tableNumber || tableNumber.length > 80) {
      return NextResponse.json(
        { error: "Enter a table number between 1 and 80 characters." },
        { status: 400 },
      );
    }
    updates.table_number = tableNumber;
  }
  if (typeof input.isActive === "boolean") updates.is_active = input.isActive;
  if (!uuidPattern.test(id) || Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Choose a table and valid changes." }, { status: 400 });
  }

  if (auth.isDemo) {
    return NextResponse.json({
      table: {
        id: id || "demo-table",
        restaurant_id: restaurantId,
        table_number: updates.table_number || "Table Demo",
        unique_code: "demo-code",
        is_active: updates.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }

  const { data, error } = await auth.context!.serviceClient
    .from("tables")
    .update(updates)
    .eq("restaurant_id", restaurantId)
    .eq("id", id)
    .select("id, restaurant_id, table_number, unique_code, is_active, created_at, updated_at")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That table number already exists for this restaurant." },
        { status: 409 },
      );
    }
    console.error("Could not update restaurant table:", error.message);
    return NextResponse.json({ error: "Could not update the table." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  return NextResponse.json({ table: data });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await getAuthorizedContext(restaurantId);
  if (auth.response) return auth.response;

  if (auth.isDemo) {
    return NextResponse.json({ success: true });
  }

  const tableId = new URL(request.url).searchParams.get("tableId") ?? "";
  if (!uuidPattern.test(tableId)) {
    return NextResponse.json({ error: "Choose a valid table." }, { status: 400 });
  }
  const { data, error } = await auth.context!.serviceClient
    .from("tables")
    .delete()
    .eq("restaurant_id", restaurantId)
    .eq("id", tableId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete restaurant table:", error.message);
    return NextResponse.json({ error: "Could not delete the table." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
