import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function check() {
  console.log("Connecting to:", url);
  const supabase = createClient(url!, key!);

  // 1. Check orders table columns
  const { data: orders, error: oErr } = await supabase.from("orders").select("*").limit(1);
  console.log("Orders select:", { error: oErr?.message, sampleKeys: orders ? Object.keys(orders[0] || {}) : null });

  // 2. Check order_items table columns
  const { data: items, error: iErr } = await supabase.from("order_items").select("*").limit(1);
  console.log("Order items select:", { error: iErr?.message, sampleKeys: items ? Object.keys(items[0] || {}) : null });

  // 3. Test calling place_guest_order RPC with dummy uuid
  const dummyRestId = "00000000-0000-4000-8000-000000000001";
  const { data: rpcRes, error: rpcErr } = await supabase.rpc("place_guest_order", {
    p_restaurant_id: dummyRestId,
    p_table_id: null,
    p_unique_code: "test",
    p_customer_phone: "9876543210",
    p_notes: "test",
    p_items: [{ menuItemId: "00000000-0000-4000-8000-000000000011", quantity: 1, specialInstructions: null }],
    p_order_type: "dine_in",
    p_order_code: "#T1001"
  });
  console.log("RPC place_guest_order:", { error: rpcErr?.message, code: rpcErr?.code, data: rpcRes });
}

check().catch(console.error);
