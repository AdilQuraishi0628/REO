export type DemoOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  created_at: string;
};

export type DemoOrder = {
  id: string;
  restaurant_id: string;
  table_id: string;
  table_number: string;
  customer_phone: string | null;
  status: "pending" | "preparing" | "ready" | "served" | "delivered" | "cancelled";
  total_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: DemoOrderItem[];
};

const globalForOrders = globalThis as unknown as {
  demoOrders?: DemoOrder[];
};

export const demoOrdersStore: DemoOrder[] = globalForOrders.demoOrders ?? [
  {
    id: "demo-ord-1",
    restaurant_id: "00000000-0000-4000-8000-000000000001",
    table_id: "00000000-0000-4000-8000-000000000004",
    table_number: "Table 4",
    customer_phone: "+919827100004",
    status: "pending",
    total_amount: 638,
    notes: "Please bring drinks first. Extra napkins.",
    created_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60_000).toISOString(),
    items: [
      {
        id: "item-1",
        order_id: "demo-ord-1",
        menu_item_id: "dish-2",
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
        menu_item_id: "dish-1",
        item_name: "Classic Cold Brew",
        quantity: 1,
        unit_price: 189,
        total_price: 189,
        special_instructions: "No sugar",
        created_at: new Date().toISOString(),
      },
    ],
  },
];

globalForOrders.demoOrders = demoOrdersStore;

export function addDemoOrder(order: Omit<DemoOrder, "id" | "created_at" | "updated_at">): DemoOrder {
  const newOrder: DemoOrder = {
    ...order,
    id: `demo-ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  demoOrdersStore.unshift(newOrder);
  return newOrder;
}

export function updateDemoOrderStatus(
  orderId: string,
  status: DemoOrder["status"],
): DemoOrder | null {
  const order = demoOrdersStore.find((o) => o.id === orderId);
  if (!order) return null;
  order.status = status;
  order.updated_at = new Date().toISOString();
  return order;
}
