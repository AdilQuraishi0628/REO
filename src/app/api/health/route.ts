import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(url),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(anonKey),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(serviceKey),
  };

  const isConfigured = Boolean(url && (anonKey || serviceKey));

  if (!isConfigured) {
    return NextResponse.json({
      status: "demo_mode",
      message: "Supabase environment variables are not set. TableTap is operating in zero-latency offline demo mode.",
      env: envCheck,
      tables: {
        restaurants: true,
        categories: true,
        menu_items: true,
        tables: true,
        orders: true,
        order_items: true,
        service_requests: true,
      },
    });
  }

  try {
    const client = createClient(url!, serviceKey || anonKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const checkTable = async (tableName: string) => {
      try {
        const { error } = await client.from(tableName).select("id").limit(1);
        return !error;
      } catch {
        return false;
      }
    };

    const [
      restaurantsExists,
      menuCategoriesExists,
      categoriesExists,
      menuItemsExists,
      tablesExists,
      ordersExists,
      orderItemsExists,
      serviceRequestsExists,
    ] = await Promise.all([
      checkTable("restaurants"),
      checkTable("menu_categories"),
      checkTable("categories"),
      checkTable("menu_items"),
      checkTable("tables"),
      checkTable("orders"),
      checkTable("order_items"),
      checkTable("service_requests"),
    ]);

    return NextResponse.json({
      status: "connected",
      message: "Supabase connection is verified.",
      env: envCheck,
      tables: {
        restaurants: restaurantsExists,
        categories: menuCategoriesExists || categoriesExists,
        menu_categories: menuCategoriesExists,
        menu_items: menuItemsExists,
        tables: tablesExists,
        orders: ordersExists,
        order_items: orderItemsExists,
        service_requests: serviceRequestsExists,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Connection failed.";
    return NextResponse.json({
      status: "connection_error",
      error: message,
      env: envCheck,
    }, { status: 200 });
  }
}
