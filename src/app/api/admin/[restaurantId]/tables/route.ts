import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

type TableRow = {
  id: string;
  restaurant_id: string;
  table_number: string;
  unique_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

// In-memory store for demo mode table management & automated testing
const demoTablesStore = new Map<string, TableRow[]>();

function getDemoTables(restaurantId: string): TableRow[] {
  // If venue ends with 0099 or contains 'empty' or 'zero', start with zero tables
  if (
    restaurantId.endsWith("0099") ||
    restaurantId.includes("empty") ||
    restaurantId.includes("zero")
  ) {
    if (!demoTablesStore.has(restaurantId)) {
      demoTablesStore.set(restaurantId, []);
    }
    return demoTablesStore.get(restaurantId)!;
  }

  if (!demoTablesStore.has(restaurantId)) {
    const isJuniper = restaurantId.endsWith("0001");
    const isChai = restaurantId.endsWith("0002");
    const prefix = isJuniper ? "juniper" : isChai ? "chai" : "royal";
    const initialRows: TableRow[] = [1, 2, 3, 4, 5].map((num) => ({
      id: `table-id-${prefix}-${num}`,
      restaurant_id: restaurantId,
      table_number: `Table ${num}`,
      unique_code: `demo-${prefix}-t${num}`,
      is_active: true,
      created_at: new Date(Date.now() - (6 - num) * 60000).toISOString(),
      updated_at: new Date().toISOString(),
    }));
    demoTablesStore.set(restaurantId, initialRows);
  }
  return demoTablesStore.get(restaurantId)!;
}

function createUniqueCode() {
  return randomBytes(9).toString("base64url");
}

async function getAuthorizedContext(restaurantId: string) {
  if (!restaurantId || restaurantId.trim() === "") {
    return {
      response: NextResponse.json(
        { error: "A valid restaurant identifier is required." },
        { status: 400 },
      ),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
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
    const url = new URL(_request.url);
    if (url.searchParams.get("reset") === "true") {
      demoTablesStore.delete(restaurantId);
    }
    const tables = getDemoTables(restaurantId);
    return NextResponse.json({ tables, siteOrigin });
  }

  const { data, error } = await auth.context!.serviceClient
    .from("tables")
    .select("id, restaurant_id, table_number, unique_code, is_active, created_at, updated_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true })
    .order("table_number", { ascending: true });

  if (error) {
    const diagnostic = {
      supabaseCode: error.code || "UNKNOWN",
      message: error.message,
      details: error.details,
      hint: error.hint,
      status: 500,
      venueId: restaurantId,
      userId: auth.context?.user?.id || "unauthenticated",
    };
    console.error("[Tables API GET Error]", diagnostic);
    Sentry.captureException(new Error(`Could not load restaurant tables: ${error.message}`), {
      extra: diagnostic,
      tags: { venueId: restaurantId, userId: auth.context?.user?.id, supabaseCode: error.code },
    });
    return NextResponse.json(
      { error: "Unable to load restaurant tables from the database." },
      { status: 500 },
    );
  }

  // A venue with zero tables is normal and returns an empty array with 200 OK
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

  // BULK GENERATION
  if (input.action === "bulk") {
    const { start, end } = input;
    if (typeof start !== "number" || typeof end !== "number" || !Number.isInteger(start) || !Number.isInteger(end)) {
      return NextResponse.json(
        { error: "Start and end table numbers must be whole integers." },
        { status: 400 },
      );
    }
    if (start < 1) {
      return NextResponse.json(
        { error: "Start table number must be at least 1." },
        { status: 400 },
      );
    }
    if (start > end) {
      return NextResponse.json(
        { error: "Start number cannot be greater than end number." },
        { status: 400 },
      );
    }
    const count = end - start + 1;
    if (count > 100) {
      return NextResponse.json(
        { error: "Cannot generate more than 100 tables at once." },
        { status: 400 },
      );
    }

    const prefix = typeof input.prefix === "string" ? input.prefix : "Table ";

    if (auth.isDemo) {
      const demoList = getDemoTables(restaurantId);
      const createdRows: TableRow[] = [];
      for (let n = start; n <= end; n++) {
        const name = `${prefix}${n}`;
        if (!demoList.some((t) => t.table_number.toLowerCase() === name.toLowerCase())) {
          const row: TableRow = {
            id: `table-demo-${Date.now()}-${n}`,
            restaurant_id: restaurantId,
            table_number: name,
            unique_code: `demo-tab-${n}-${Date.now().toString(36)}`,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          demoList.push(row);
          createdRows.push(row);
        }
      }
      return NextResponse.json({ tables: createdRows, created: createdRows.length }, { status: 201 });
    }

    const rows = Array.from({ length: count }, (_, index) => ({
      restaurant_id: restaurantId,
      table_number: `${prefix}${start + index}`,
      unique_code: createUniqueCode(),
    }));

    const { data, error } = await auth.context!.serviceClient
      .from("tables")
      .upsert(rows, { onConflict: "restaurant_id,table_number", ignoreDuplicates: true })
      .select("id, table_number, unique_code, is_active, created_at, updated_at");

    if (error) {
      const diagnostic = {
        supabaseCode: error.code || "UNKNOWN",
        message: error.message,
        details: error.details,
        status: 500,
        venueId: restaurantId,
        userId: auth.context?.user?.id,
      };
      console.error("[Tables API Bulk POST Error]", diagnostic);
      Sentry.captureException(new Error(`Could not bulk create tables: ${error.message}`), {
        extra: diagnostic,
        tags: { venueId: restaurantId, userId: auth.context?.user?.id },
      });
      return NextResponse.json({ error: "Could not create the requested tables." }, { status: 500 });
    }
    return NextResponse.json({ tables: data ?? [], created: data?.length ?? 0 }, { status: 201 });
  }

  // SINGLE TABLE CREATION
  const rawTableNumber = typeof input.tableNumber === "string" ? input.tableNumber.trim() : "";
  if (!rawTableNumber) {
    return NextResponse.json(
      { error: "Table name cannot be empty." },
      { status: 400 },
    );
  }
  if (rawTableNumber.length > 80) {
    return NextResponse.json(
      { error: "Table name cannot exceed 80 characters." },
      { status: 400 },
    );
  }

  if (auth.isDemo) {
    const demoList = getDemoTables(restaurantId);
    const exists = demoList.some(
      (t) => t.table_number.toLowerCase() === rawTableNumber.toLowerCase(),
    );
    if (exists) {
      return NextResponse.json(
        { error: "That table number already exists for this restaurant." },
        { status: 409 },
      );
    }
    const newTable: TableRow = {
      id: `table-demo-${Date.now()}`,
      restaurant_id: restaurantId,
      table_number: rawTableNumber,
      unique_code: `demo-tab-${Date.now().toString(36)}`,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    demoList.push(newTable);
    return NextResponse.json({ table: newTable }, { status: 201 });
  }

  // Check duplicate before inserting in production DB
  const { data: existing } = await auth.context!.serviceClient
    .from("tables")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .ilike("table_number", rawTableNumber)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "That table number already exists for this restaurant." },
      { status: 409 },
    );
  }

  const { data, error } = await auth.context!.serviceClient
    .from("tables")
    .insert({
      restaurant_id: restaurantId,
      table_number: rawTableNumber,
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
    const diagnostic = {
      supabaseCode: error.code || "UNKNOWN",
      message: error.message,
      details: error.details,
      status: 500,
      venueId: restaurantId,
      userId: auth.context?.user?.id,
    };
    console.error("[Tables API Single POST Error]", diagnostic);
    Sentry.captureException(new Error(`Could not create table: ${error.message}`), {
      extra: diagnostic,
      tags: { venueId: restaurantId, userId: auth.context?.user?.id },
    });
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
    if (!tableNumber) {
      return NextResponse.json({ error: "Table name cannot be empty." }, { status: 400 });
    }
    if (tableNumber.length > 80) {
      return NextResponse.json({ error: "Table name cannot exceed 80 characters." }, { status: 400 });
    }
    updates.table_number = tableNumber;
  }
  if (typeof input.isActive === "boolean") updates.is_active = input.isActive;
  if (!id || Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Choose a table and valid changes." }, { status: 400 });
  }

  if (auth.isDemo) {
    const demoList = getDemoTables(restaurantId);
    const table = demoList.find((t) => t.id === id);
    if (!table) return NextResponse.json({ error: "Table not found." }, { status: 404 });
    if (updates.table_number !== undefined) table.table_number = updates.table_number;
    if (updates.is_active !== undefined) table.is_active = updates.is_active;
    table.updated_at = updates.updated_at;
    return NextResponse.json({ table });
  }

  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Choose a valid table." }, { status: 400 });
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
    console.error("[Tables API PATCH Error]", error);
    return NextResponse.json({ error: "Could not update the table." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  return NextResponse.json({ table: data });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await getAuthorizedContext(restaurantId);
  if (auth.response) return auth.response;

  const tableId = new URL(request.url).searchParams.get("tableId") ?? "";
  if (!tableId) {
    return NextResponse.json({ error: "Choose a valid table." }, { status: 400 });
  }

  if (auth.isDemo) {
    const demoList = getDemoTables(restaurantId);
    const idx = demoList.findIndex((t) => t.id === tableId);
    if (idx !== -1) {
      demoList.splice(idx, 1);
    }
    return NextResponse.json({ success: true });
  }

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
    console.error("[Tables API DELETE Error]", error);
    return NextResponse.json({ error: "Could not delete the table." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Table not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
