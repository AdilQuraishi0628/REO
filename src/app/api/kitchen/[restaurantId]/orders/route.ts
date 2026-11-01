import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  getStaffSession,
  uuidPattern,
} from "@/lib/admin-auth";
import type { Database } from "@/lib/database.types";
import { demoOrdersStore, updateDemoOrderStatus } from "@/lib/orders-store";
import { createClient } from "@supabase/supabase-js";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

type OrderStatus = Database["public"]["Tables"]["orders"]["Row"]["status"];
type KitchenOrderItem = Database["public"]["Tables"]["order_items"]["Row"];

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

  // 2. Demo fallback
  if (!supabaseUrl || !serviceRoleKey) {
    return { isDemo: true };
  }

  // 3. Check Owner admin context
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
  return { serviceClient: context.serviceClient, context };
}

export async function GET(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await authorize(restaurantId);
  if (auth.response) return auth.response;

  const url = new URL(request.url);
  const requestedOrderId = url.searchParams.get("orderId");

  if (auth.isDemo) {
    const liveDemoOrders = demoOrdersStore.filter((o) => o.restaurant_id === restaurantId);
    if (liveDemoOrders.length > 0) {
      if (requestedOrderId) {
        const single = liveDemoOrders.find((o) => o.id === requestedOrderId);
        return NextResponse.json({ order: single ?? null });
      }
      return NextResponse.json({ orders: liveDemoOrders });
    }
    const isJuniper = restaurantId.endsWith("0001");
    const isChai = restaurantId.endsWith("0002");

    const demoOrders = isJuniper
      ? [
          {
            id: "demo-ord-1",
            restaurant_id: restaurantId,
            table_id: "demo-tab-4",
            table_number: "Table 4",
            customer_phone: "+919827100004",
            status: "pending",
            total_amount: 638,
            notes: "Please bring drinks first. Extra napkins.",
            created_at: new Date(Date.now() - 4 * 60_000).toISOString(),
            updated_at: new Date(Date.now() - 4 * 60_000).toISOString(),
            status_updated_at: new Date(Date.now() - 4 * 60_000).toISOString(),
            items: [
              {
                id: "item-1",
                order_id: "demo-ord-1",
                menu_item_id: "jr-m2",
                item_name: "Classic Burrata & Pesto Pizza",
                quantity: 1,
                unit_price: 449,
                total_price: 449,
                special_instructions: "Crispy crust please",
                created_at: new Date().toISOString(),
              },
              {
                id: "item-2",
                order_id: "demo-ord-1",
                menu_item_id: "jr-c1",
                item_name: "Classic Cold Brew",
                quantity: 1,
                unit_price: 189,
                total_price: 189,
                special_instructions: "No sugar",
                created_at: new Date().toISOString(),
              },
            ],
          },
          {
            id: "demo-ord-2",
            restaurant_id: restaurantId,
            table_id: "demo-tab-1",
            table_number: "Table 1",
            customer_phone: "+919827100001",
            status: "preparing",
            total_amount: 628,
            notes: null,
            created_at: new Date(Date.now() - 14 * 60_000).toISOString(),
            updated_at: new Date(Date.now() - 10 * 60_000).toISOString(),
            status_updated_at: new Date(Date.now() - 10 * 60_000).toISOString(),
            items: [
              {
                id: "item-3",
                order_id: "demo-ord-2",
                menu_item_id: "jr-s1",
                item_name: "Truffle Parmesan Fries",
                quantity: 1,
                unit_price: 229,
                total_price: 229,
                special_instructions: "Extra dip",
                created_at: new Date().toISOString(),
              },
              {
                id: "item-4",
                order_id: "demo-ord-2",
                menu_item_id: "jr-m3",
                item_name: "Herb Crusted Grilled Chicken",
                quantity: 1,
                unit_price: 399,
                total_price: 399,
                special_instructions: null,
                created_at: new Date().toISOString(),
              },
            ],
          },
        ]
      : isChai
        ? [
            {
              id: "demo-ord-chai-1",
              restaurant_id: restaurantId,
              table_id: "demo-chai-3",
              table_number: "Table 3",
              customer_phone: "+919755500003",
              status: "pending",
              total_amount: 327,
              notes: "Make chai extra kadak",
              created_at: new Date(Date.now() - 3 * 60_000).toISOString(),
              updated_at: new Date(Date.now() - 3 * 60_000).toISOString(),
              status_updated_at: new Date(Date.now() - 3 * 60_000).toISOString(),
              items: [
                {
                  id: "item-c1",
                  order_id: "demo-ord-chai-1",
                  menu_item_id: "cc-c1",
                  item_name: "Special Kulhad Adrak Elaichi Chai",
                  quantity: 2,
                  unit_price: 69,
                  total_price: 138,
                  special_instructions: "Extra ginger",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "item-c2",
                  order_id: "demo-ord-chai-1",
                  menu_item_id: "cc-s2",
                  item_name: "Kurkure Cheese Momos",
                  quantity: 1,
                  unit_price: 189,
                  total_price: 189,
                  special_instructions: "Spicy chutney on side",
                  created_at: new Date().toISOString(),
                },
              ],
            },
          ]
        : [
            {
              id: "demo-ord-royal-1",
              restaurant_id: restaurantId,
              table_id: "demo-royal-5",
              table_number: "Table 5",
              customer_phone: "+919425200005",
              status: "pending",
              total_amount: 868,
              notes: "Family dining. Serve starters promptly.",
              created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
              updated_at: new Date(Date.now() - 5 * 60_000).toISOString(),
              status_updated_at: new Date(Date.now() - 5 * 60_000).toISOString(),
              items: [
                {
                  id: "item-r1",
                  order_id: "demo-ord-royal-1",
                  menu_item_id: "rf-b1",
                  item_name: "Awadhi Dum Gosht Biryani",
                  quantity: 1,
                  unit_price: 469,
                  total_price: 469,
                  special_instructions: "With burani raita",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "item-r2",
                  order_id: "demo-ord-royal-1",
                  menu_item_id: "rf-c1",
                  item_name: "Murgh Tikka Butter Masala",
                  quantity: 1,
                  unit_price: 399,
                  total_price: 399,
                  special_instructions: null,
                  created_at: new Date().toISOString(),
                },
              ],
            },
          ];

    if (requestedOrderId) {
      const single = demoOrders.find((o) => o.id === requestedOrderId);
      return NextResponse.json({ order: single ?? null });
    }

    return NextResponse.json({ orders: demoOrders });
  }

  const client = auth.serviceClient!;

  if (requestedOrderId) {
    if (!uuidPattern.test(requestedOrderId)) {
      return NextResponse.json({ error: "Invalid order ID." }, { status: 400 });
    }
    let { data: order, error: orderErr } = await client
      .from("orders")
      .select("id, restaurant_id, table_id, table_number, customer_phone, status, total_amount, notes, created_at, updated_at, status_updated_at")
      .eq("restaurant_id", restaurantId)
      .eq("id", requestedOrderId)
      .maybeSingle();

    if (orderErr && (orderErr.message.includes("status_updated_at") || orderErr.code === "42703")) {
      const fallback = await client
        .from("orders")
        .select("id, restaurant_id, table_id, table_number, customer_phone, status, total_amount, notes, created_at, updated_at")
        .eq("restaurant_id", restaurantId)
        .eq("id", requestedOrderId)
        .maybeSingle();
      order = fallback.data
        ? ({ ...fallback.data, status_updated_at: fallback.data.updated_at || fallback.data.created_at } as unknown as typeof order)
        : null;
      orderErr = fallback.error;
    }

    if (orderErr) {
      console.error("Could not fetch single kitchen order:", orderErr.message);
      return NextResponse.json({ error: "Could not fetch order." }, { status: 500 });
    }
    if (!order) {
      return NextResponse.json({ order: null });
    }

    const { data: items } = await client
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

  let { data: orders, error: ordersError } = await client
    .from("orders")
    .select("id, restaurant_id, table_id, table_number, customer_phone, status, total_amount, notes, created_at, updated_at, status_updated_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersError && (ordersError.message.includes("status_updated_at") || ordersError.code === "42703")) {
    const fallback = await client
      .from("orders")
      .select("id, restaurant_id, table_id, table_number, customer_phone, status, total_amount, notes, created_at, updated_at")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100);
    orders = (fallback.data ?? []).map((o) => ({
      ...o,
      status_updated_at: o.updated_at || o.created_at,
    })) as unknown as typeof orders;
    ordersError = fallback.error;
  }

  if (ordersError) {
    console.error("Could not load kitchen orders:", ordersError.message);
    return NextResponse.json(
      { error: "Could not load orders. Check that the latest database schema is installed." },
      { status: 500 },
    );
  }

  const orderIds = (orders ?? []).map((order) => order.id);
  const { data: items, error: itemsError } = orderIds.length
    ? await client
        .from("order_items")
        .select("id, order_id, menu_item_id, item_name, quantity, unit_price, total_price, special_instructions, created_at")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (itemsError) {
    console.error("Could not load kitchen order items:", itemsError.message);
    return NextResponse.json({ error: "Could not load order items." }, { status: 500 });
  }

  const itemsByOrderId = new Map<string, KitchenOrderItem[]>();
  for (const item of items ?? []) {
    const group = itemsByOrderId.get(item.order_id) ?? [];
    group.push(item);
    itemsByOrderId.set(item.order_id, group);
  }

  return NextResponse.json({
    orders: (orders ?? []).map((order) => ({
      ...order,
      status_updated_at: order.status_updated_at || order.updated_at || order.created_at,
      items: itemsByOrderId.get(order.id) ?? [],
    })),
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const auth = await authorize(restaurantId);
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit a valid order update." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit a valid order update." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const orderId = typeof input.orderId === "string" ? input.orderId : "";
  const validStatuses: OrderStatus[] = [
    "pending",
    "preparing",
    "ready",
    "served",
    "cancelled",
  ];
  const nextStatus =
    typeof input.status === "string"
      ? validStatuses.find((status) => status === input.status) ?? null
      : null;
  const now = new Date().toISOString();
  if (auth.isDemo) {
    if (nextStatus) {
      updateDemoOrderStatus(orderId, nextStatus);
    }
    return NextResponse.json({
      order: {
        id: orderId,
        status: nextStatus || "preparing",
        updated_at: now,
        status_updated_at: now,
      },
    });
  }

  if (!uuidPattern.test(orderId) || !nextStatus) {
    return NextResponse.json({ error: "Choose a valid order status." }, { status: 400 });
  }

  const client = auth.serviceClient!;
  const { data: existingOrder, error: lookupError } = await client
    .from("orders")
    .select("id, status")
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .maybeSingle();
  if (lookupError) {
    console.error("Could not load kitchen order status:", lookupError.message);
    return NextResponse.json({ error: "Could not update this order." }, { status: 500 });
  }
  if (!existingOrder) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const allowedNextStatuses: Record<OrderStatus, OrderStatus[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["ready", "cancelled"],
    ready: ["served", "cancelled"],
    served: [],
    cancelled: [],
  };
  if (!allowedNextStatuses[existingOrder.status].includes(nextStatus)) {
    return NextResponse.json(
      { error: `An order cannot move from ${existingOrder.status} to ${nextStatus}.` },
      { status: 409 },
    );
  }

  let { data, error } = await client
    .from("orders")
    .update({
      status: nextStatus,
      updated_at: now,
      status_updated_at: now,
    })
    .eq("restaurant_id", restaurantId)
    .eq("id", orderId)
    .eq("status", existingOrder.status)
    .select("id, status, updated_at, status_updated_at")
    .maybeSingle();

  if (error && (error.message.includes("status_updated_at") || error.code === "42703")) {
    const fallback = await client
      .from("orders")
      .update({
        status: nextStatus,
        updated_at: now,
      })
      .eq("restaurant_id", restaurantId)
      .eq("id", orderId)
      .eq("status", existingOrder.status)
      .select("id, status, updated_at")
      .maybeSingle();
    data = fallback.data
      ? ({ ...fallback.data, status_updated_at: fallback.data.updated_at } as unknown as typeof data)
      : null;
    error = fallback.error;
  }

  if (error) {
    console.error("Could not update kitchen order:", error.message);
    return NextResponse.json({ error: "Could not update this order." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Another staff member already updated this order. Refresh and try again." },
      { status: 409 },
    );
  }
  return NextResponse.json({ order: data });
}
