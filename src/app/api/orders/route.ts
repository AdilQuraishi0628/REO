import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizeIndianPhone } from "@/lib/indian-phone";
import type { Json, Database } from "@/lib/database.types";
import { addDemoOrder, demoOrdersStore } from "@/lib/orders-store";
import { demoRestaurants } from "@/lib/restaurant-data";
import { broadcastToKitchen } from "@/lib/realtime-broadcast";
import { generateOrderCode } from "@/lib/order-code";
import { verifyTableToken } from "@/lib/table-token";


const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const codePattern = /^[A-Za-z0-9_-]{3,64}$/;

type OrderItemInput = {
  menuItemId: string;
  quantity: number;
  specialInstructions: string | null;
};

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return undefined;
  const text = value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .trim();
  return text.length <= maxLength ? text || null : undefined;
}

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "guest-order", 30, 300);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Several orders were submitted from this connection. Please wait a moment."
            : "Ordering is temporarily unavailable. Please try again.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit a valid order." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit a valid order." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const restaurantId = typeof input.restaurantId === "string" ? input.restaurantId : "";
  const tableId = typeof input.tableId === "string" ? input.tableId : "";
  const uniqueCode = typeof input.uniqueCode === "string" ? input.uniqueCode : "";
  const tableToken = typeof input.tableToken === "string" ? input.tableToken.trim() : "";
  const rawOrderType = typeof input.orderType === "string" ? input.orderType.trim().toLowerCase() : "";
  const orderType: "dine_in" | "takeaway" = rawOrderType === "takeaway" ? "takeaway" : "dine_in";
  const rawTableLabel = typeof input.tableLabel === "string" ? input.tableLabel.trim() : "";
  const tableLabel = rawTableLabel || (orderType === "takeaway" ? "Takeaway" : null);
  const notes = optionalText(input.notes, 1000);
  const phoneInput = optionalText(input.phone, 24);
  const phone =
    phoneInput && phoneInput !== null ? normalizeIndianPhone(phoneInput) : null;
  const orderCode = generateOrderCode();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isDemo =
    !supabaseUrl ||
    !serviceRoleKey ||
    restaurantId.startsWith("00000000-0000-4000-8000-") ||
    uniqueCode.startsWith("demo-") ||
    uniqueCode.startsWith("table");

  // Security: Check whether orders are being placed remotely without a valid table QR token
  if (!isDemo && uniqueCode && !verifyTableToken(uniqueCode, tableToken)) {
    return NextResponse.json(
      { error: "Invalid or expired table QR session. Please scan your dining table QR stand to order." },
      { status: 403 },
    );
  }

  // Security: Per-table rate limiting (max 8 orders per 10 minutes per table)
  if (uniqueCode || tableId) {
    const tableRateKey = `table-order:${uniqueCode || tableId}`;
    const tableRate = await consumeRateLimit(request, tableRateKey, 8, 600);
    if (tableRate === "limited") {
      return NextResponse.json(
        { error: "Multiple orders were recently placed for this table. Please wait a moment before adding more items." },
        { status: 429 },
      );
    }
  }

  const isRestIdValid = isDemo ? Boolean(restaurantId) : uuidPattern.test(restaurantId);
  const isTableIdValid = !tableId || (isDemo ? true : uuidPattern.test(tableId));
  const isCodeValid = !uniqueCode || (isDemo ? true : codePattern.test(uniqueCode));

  if (
    !isRestIdValid ||
    !isTableIdValid ||
    !isCodeValid ||
    notes === undefined ||
    phoneInput === undefined ||
    (phoneInput !== null && phoneInput !== "" && !phone) ||
    !Array.isArray(input.items) ||
    input.items.length < 1 ||
    input.items.length > 30
  ) {
    return NextResponse.json(
      {
        error: phoneInput && !phone
          ? "Enter a valid Indian mobile number, or leave the phone field blank."
          : "Check the order details and try again.",
      },
      { status: 400 },
    );
  }

  // Security: Cap on open orders per table (max 5 pending/preparing orders per table)
  if (isDemo) {
    const activeDemoOrders = demoOrdersStore.filter(
      (o) =>
        o.restaurant_id === (restaurantId || "00000000-0000-4000-8000-000000000001") &&
        (o.table_id === tableId || (tableLabel && o.table_number === tableLabel)) &&
        (o.status === "pending" || o.status === "preparing"),
    );
    if (activeDemoOrders.length >= 5) {
      return NextResponse.json(
        { error: "This table already has active orders being prepared by the kitchen. Please wait for them to be served." },
        { status: 429 },
      );
    }
  }

  const items: OrderItemInput[] = [];
  for (const rawItem of input.items) {
    if (typeof rawItem !== "object" || rawItem === null || Array.isArray(rawItem)) {
      return NextResponse.json({ error: "One of the order items is invalid." }, { status: 400 });
    }
    const item = rawItem as Record<string, unknown>;
    const menuItemId = typeof item.menuItemId === "string" ? item.menuItemId : "";
    const quantity = item.quantity;
    const specialInstructions = optionalText(item.specialInstructions, 500);

    const isItemValid = isDemo
      ? Boolean(menuItemId && menuItemId.length >= 1 && menuItemId.length <= 64)
      : uuidPattern.test(menuItemId);

    if (
      !isItemValid ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20 ||
      specialInstructions === undefined
    ) {
      return NextResponse.json({ error: "One of the order items is invalid." }, { status: 400 });
    }
    items.push({ menuItemId, quantity, specialInstructions });
  }

  if (isDemo) {
    const demoRestaurant = Object.values(demoRestaurants).find(
      (r) => r.restaurant.id === restaurantId,
    );

    let total = 0;
    const orderItems = items.map((it, idx) => {
      let itemName = "Menu Item";
      let unitPrice = 250;
      if (demoRestaurant) {
        for (const cat of demoRestaurant.categories) {
          const found = cat.items.find((entry) => entry.id === it.menuItemId);
          if (found) {
            itemName = found.name;
            unitPrice = found.price;
            break;
          }
        }
      }
      const itemTotal = unitPrice * it.quantity;
      total += itemTotal;
      return {
        id: `item-${Date.now()}-${idx}`,
        order_id: "",
        menu_item_id: it.menuItemId,
        item_name: itemName,
        quantity: it.quantity,
        unit_price: unitPrice,
        total_price: itemTotal,
        special_instructions: it.specialInstructions,
        created_at: new Date().toISOString(),
      };
    });

    const newOrder = addDemoOrder({
      restaurant_id: restaurantId || "00000000-0000-4000-8000-000000000001",
      table_id: tableId || null,
      table_number: tableLabel,
      order_type: orderType,
      order_code: orderCode,
      customer_phone: phone,
      status: "pending",
      total_amount: total,
      notes,
      items: orderItems,
    });

    void broadcastToKitchen(restaurantId || "00000000-0000-4000-8000-000000000001", "new_order", {
      orderId: newOrder.id,
      tableNumber: newOrder.table_number,
      orderType: newOrder.order_type,
      orderCode: newOrder.order_code,
      status: newOrder.status,
      totalAmount: newOrder.total_amount,
    });

    return NextResponse.json({ order: newOrder }, { status: 201 });
  }

  const supabase = createClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Verify item prices and availability from menu_items
  const itemIds = items.map((i) => i.menuItemId).filter((id) => uuidPattern.test(id));
  const { data: menuItemsData } = await supabase
    .from("menu_items")
    .select("id, name, price, is_available")
    .in("id", itemIds)
    .eq("restaurant_id", restaurantId);

  const menuItemMap = new Map((menuItemsData ?? []).map((m) => [m.id, m]));
  for (const it of items) {
    const m = menuItemMap.get(it.menuItemId);
    if (!m || m.is_available === false) {
      return NextResponse.json(
        { error: "One of the selected dishes is no longer available. Please update your cart." },
        { status: 409 },
      );
    }
  }

  // Calculate order total strictly from server-side menu_items
  let calculatedTotal = 0;
  const enrichedItems = items.map((it) => {
    const m = menuItemMap.get(it.menuItemId);
    const price = m?.price ?? 0;
    const itemTotal = price * it.quantity;
    calculatedTotal += itemTotal;
    return {
      menu_item_id: it.menuItemId && uuidPattern.test(it.menuItemId) ? it.menuItemId : null,
      item_name: m?.name ?? "Menu Item",
      quantity: it.quantity,
      unit_price: price,
      total_price: itemTotal,
      special_instructions: it.specialInstructions,
    };
  });

  type RpcCaller = (fn: string, args: Record<string, unknown>) => Promise<{
    data: Database["public"]["Tables"]["orders"]["Row"][] | null;
    error: { code: string; message: string } | null;
  }>;
  const callRpc = supabase.rpc as unknown as RpcCaller;

  // Call place_guest_order RPC
  let { data, error } = await callRpc("place_guest_order", {
    p_restaurant_id: restaurantId,
    p_table_id: tableId && uuidPattern.test(tableId) ? tableId : null,
    p_unique_code: uniqueCode,
    p_customer_phone: phone,
    p_notes: notes,
    p_items: items as unknown as Json,
    p_order_type: orderType,
    p_order_code: orderCode,
  });

  if (error && (error.message.includes("p_order_code") || error.code === "42883")) {
    // Retry without p_order_code if migration not yet applied
    const retry = await callRpc("place_guest_order", {
      p_restaurant_id: restaurantId,
      p_table_id: tableId && uuidPattern.test(tableId) ? tableId : null,
      p_unique_code: uniqueCode,
      p_customer_phone: phone,
      p_notes: notes,
      p_items: items as unknown as Json,
      p_order_type: orderType,
    });
    if (!retry.error) {
      data = retry.data;
      error = null;
    }
  }

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json({ error: "Check the order details and try again." }, { status: 400 });
    }
    if (error.code === "P0002") {
      return NextResponse.json(
        { error: "This table or one of its menu items is no longer available." },
        { status: 409 },
      );
    }

    // Direct table insert fallback if RPC is not installed in database
    if (error.code === "42883" || error.message.includes("does not exist") || error.message.includes("rpc")) {
      try {
        const insertPayload: Record<string, unknown> = {
          restaurant_id: restaurantId,
          table_id: tableId && uuidPattern.test(tableId) ? tableId : null,
          table_number: tableLabel,
          order_type: orderType,
          order_code: orderCode,
          customer_phone: phone,
          status: "pending",
          total_amount: calculatedTotal,
          notes,
        };

        let directInsert = await supabase
          .from("orders")
          .insert(insertPayload as unknown as Database["public"]["Tables"]["orders"]["Insert"])
          .select("*")
          .single();

        if (directInsert.error && /order_code/i.test(directInsert.error.message)) {
          delete insertPayload.order_code;
          directInsert = await supabase
            .from("orders")
            .insert(insertPayload as unknown as Database["public"]["Tables"]["orders"]["Insert"])
            .select("*")
            .single();
        }

        if (directInsert.error && /order_type/i.test(directInsert.error.message)) {
          delete insertPayload.order_type;
          directInsert = await supabase
            .from("orders")
            .insert(insertPayload as unknown as Database["public"]["Tables"]["orders"]["Insert"])
            .select("*")
            .single();
        }

        if (directInsert.error && /table_number/i.test(directInsert.error.message) && !insertPayload.table_number) {
          insertPayload.table_number = orderType === "takeaway" ? "Takeaway" : "Dine-in";
          directInsert = await supabase
            .from("orders")
            .insert(insertPayload as unknown as Database["public"]["Tables"]["orders"]["Insert"])
            .select("*")
            .single();
        }

        if (!directInsert.error && directInsert.data) {
          const directOrder = directInsert.data;
          if (enrichedItems.length > 0) {
            await supabase.from("order_items").insert(
              enrichedItems.map((it) => ({
                order_id: directOrder.id,
                ...it,
              })),
            );
          }

          const orderRecord = directOrder as Record<string, unknown>;
          void broadcastToKitchen(restaurantId, "new_order", {
            orderId: directOrder.id,
            tableNumber: directOrder.table_number,
            orderType: orderRecord.order_type || orderType,
            orderCode: orderRecord.order_code || orderCode,
            status: directOrder.status,
            totalAmount: directOrder.total_amount,
          });

          return NextResponse.json({ order: directOrder }, { status: 201 });
        }
      } catch (fallbackErr) {
        console.error("Direct order insert failed:", fallbackErr);
      }
    }

    console.error("Could not place guest order:", error.message);
    return NextResponse.json(
      { error: "We couldn't send your order. Please try again." },
      { status: 400 },
    );
  }

  const order = data?.[0];
  if (!order) {
    console.error("Order submission returned no order record.");
    return NextResponse.json(
      { error: "We couldn't confirm your order. Please ask a staff member for help." },
      { status: 400 },
    );
  }

  const orderRec = order as Record<string, unknown>;
  void broadcastToKitchen(restaurantId, "new_order", {
    orderId: order.id,
    tableNumber: order.table_number,
    orderType: orderRec.order_type || orderType,
    orderCode: orderRec.order_code || orderCode,
    status: "pending",
    totalAmount: order.total_amount,
  });

  return NextResponse.json({ order }, { status: 201 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("orderId");
  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
  }

  if (orderId.startsWith("demo-")) {
    const demoOrder = demoOrdersStore.find((o) => o.id === orderId);
    if (!demoOrder) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    const safeDemoOrder = { ...demoOrder, customer_phone: null };
    return NextResponse.json({ order: safeDemoOrder });
  }

  if (!uuidPattern.test(orderId)) {
    return NextResponse.json({ error: "Invalid order ID format." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("id, restaurant_id, table_id, table_number, status, total_amount, notes, created_at, updated_at, status_updated_at")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr) {
    console.error("Could not fetch tracked order:", orderErr.message);
    return NextResponse.json({ error: "Could not fetch order." }, { status: 500 });
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("id, order_id, menu_item_id, item_name, quantity, unit_price, total_price, special_instructions, created_at")
    .eq("order_id", order.id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    order: {
      ...order,
      status_updated_at: order.status_updated_at || order.updated_at || order.created_at,
      items: items ?? [],
    },
  });
}
