import { createClient } from "@supabase/supabase-js";
import { generateTableToken } from "../src/lib/table-token";
import * as fs from "fs";
import { createHmac } from "node:crypto";

const env = fs.readFileSync(".env.local", "utf8");
let supabaseUrl = "";
let anonKey = "";
let serviceKey = "";
for (const line of env.split("\n")) {
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_URL=")) supabaseUrl = line.split("=")[1].trim();
  if (line.startsWith("NEXT_PUBLIC_SUPABASE_ANON_KEY=")) anonKey = line.split("=")[1].trim();
  if (line.startsWith("SUPABASE_SERVICE_ROLE_KEY=")) serviceKey = line.split("=")[1].trim();
}

const LIVE_BASE = "https://reo-tau.vercel.app";

async function main() {
  console.log("=== BEGIN SECURITY TEST SUITE ===");

  const serviceClient = createClient(supabaseUrl, serviceKey);

  // 1. Fetch real active venue and 2 real tables
  const { data: venues } = await serviceClient
    .from("restaurants")
    .select("id, name, slug")
    .eq("name", "QA-20261102-Bistro Grande 021145")
    .limit(1);

  if (!venues || venues.length === 0) {
    throw new Error("Target venue not found in DB.");
  }
  const venue = venues[0];

  const { data: tables } = await serviceClient
    .from("tables")
    .select("id, table_number, unique_code")
    .eq("restaurant_id", venue.id)
    .order("table_number");

  if (!tables || tables.length < 2) {
    throw new Error("Need at least 2 tables for security tests.");
  }

  const table1 = tables[0];
  const table2 = tables[1];
  console.log(`Testing against venue ${venue.name} (${venue.id})`);
  console.log(`Table 1: ${table1.table_number} (${table1.unique_code})`);
  console.log(`Table 2: ${table2.table_number} (${table2.unique_code})`);

  // Fetch one real item
  const { data: items } = await serviceClient
    .from("menu_items")
    .select("id, name, price")
    .eq("restaurant_id", venue.id)
    .limit(1);

  if (!items || items.length === 0) {
    throw new Error("No menu items found.");
  }
  const testItem = items[0];

  const validTable1Token = generateTableToken(table1.unique_code);

  const baseOrderPayload = {
    restaurantId: venue.id,
    tableId: table1.id,
    uniqueCode: table1.unique_code,
    tableLabel: table1.table_number,
    orderType: "dine_in",
    notes: "Security test order",
    phone: "9876543210",
    items: [{ menuItemId: testItem.id, quantity: 1, notes: "" }],
  };

  // ----------------------------------------------------
  // TEST 1: Missing tableToken
  // ----------------------------------------------------
  console.log("\n--- TEST 1: Order with MISSING table token ---");
  const resMissing = await fetch(`${LIVE_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baseOrderPayload, tableToken: "" }),
  });
  const bodyMissing = await resMissing.json();
  console.log(`Status: ${resMissing.status} (Expected: 403)`);
  console.log("Response:", bodyMissing);
  if (resMissing.status !== 403) throw new Error("Expected 403 on missing token");

  // ----------------------------------------------------
  // TEST 2: Invalid/tampered tableToken
  // ----------------------------------------------------
  console.log("\n--- TEST 2: Order with INVALID / TAMPERED token ---");
  const resInvalid = await fetch(`${LIVE_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baseOrderPayload, tableToken: "67240000.baddeadbeefbaddeadbeef12345678" }),
  });
  const bodyInvalid = await resInvalid.json();
  console.log(`Status: ${resInvalid.status} (Expected: 403)`);
  console.log("Response:", bodyInvalid);
  if (resInvalid.status !== 403) throw new Error("Expected 403 on invalid token");

  // ----------------------------------------------------
  // TEST 3: Expired tableToken (> 72 hours old)
  // ----------------------------------------------------
  console.log("\n--- TEST 3: Order with EXPIRED token (>72h old) ---");
  const expiredTs = (Math.floor(Date.now() / 1000) - (73 * 3600)).toString(16);
  const secret = serviceKey; // Server uses SUPABASE_SERVICE_ROLE_KEY or TABLE_SECRET_KEY
  const expiredPayload = `${table1.unique_code.trim().toLowerCase()}:${expiredTs}`;
  const expiredSig = createHmac("sha256", secret).update(expiredPayload).digest("hex").slice(0, 32);
  const expiredToken = `${expiredTs}.${expiredSig}`;

  const resExpired = await fetch(`${LIVE_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baseOrderPayload, tableToken: expiredToken }),
  });
  const bodyExpired = await resExpired.json();
  console.log(`Status: ${resExpired.status} (Expected: 403)`);
  console.log("Response:", bodyExpired);
  if (resExpired.status !== 403) throw new Error("Expected 403 on expired token");

  // ----------------------------------------------------
  // TEST 4: Replay Table 2 token for Table 1
  // ----------------------------------------------------
  console.log("\n--- TEST 4: Replay Table 2's token for Table 1 ---");
  const table2Token = generateTableToken(table2.unique_code);
  const resCrossTable = await fetch(`${LIVE_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...baseOrderPayload, tableToken: table2Token }),
  });
  const bodyCrossTable = await resCrossTable.json();
  console.log(`Status: ${resCrossTable.status} (Expected: 403)`);
  console.log("Response:", bodyCrossTable);
  if (resCrossTable.status !== 403) throw new Error("Expected 403 on foreign table token replay");

  // ----------------------------------------------------
  // TEST 5: Replay Table token on a different venue
  // ----------------------------------------------------
  console.log("\n--- TEST 5: Replay Table token for a different venue ---");
  const resCrossVenue = await fetch(`${LIVE_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...baseOrderPayload,
      restaurantId: "82287185-1e68-45b9-9feb-11cc0dfee28b", // QA-20261102-Bistro-870301
      tableToken: validTable1Token,
    }),
  });
  const bodyCrossVenue = await resCrossVenue.json();
  console.log(`Status: ${resCrossVenue.status} (Expected: 400 or 403)`);
  console.log("Response:", bodyCrossVenue);
  if (resCrossVenue.status >= 200 && resCrossVenue.status < 300) {
    throw new Error("Cross-venue replay should not succeed");
  }

  // ----------------------------------------------------
  // TEST 6: Order flood rate limit (>8 orders per 10 min for a table)
  // ----------------------------------------------------
  console.log("\n--- TEST 6: Order flood rate limit (table-level 8 order cap) ---");
  // We use a fresh test unique code to test the rate limit cleanly without disturbing table 1
  const floodCode = "sec-flood-test-" + Date.now().toString(36);
  // Demo prefix bypasses token verification so we test the rate limiter directly
  const floodPayload = {
    restaurantId: venue.id,
    uniqueCode: `demo-${floodCode}`,
    tableLabel: "Flood Table",
    orderType: "dine_in",
    notes: "Rate limit test",
    phone: "9876543210",
    items: [{ menuItemId: testItem.id, quantity: 1, notes: "" }],
  };

  let hitRateLimit = false;
  let finalStatus = 0;
  let rateLimitMessage = "";
  for (let i = 1; i <= 10; i++) {
    const res = await fetch(`${LIVE_BASE}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(floodPayload),
    });
    console.log(`  Order attempt #${i}: HTTP ${res.status}`);
    if (res.status === 429) {
      hitRateLimit = true;
      finalStatus = res.status;
      rateLimitMessage = (await res.json()).error;
      console.log(`  -> Successfully rate limited at attempt #${i}! Message: "${rateLimitMessage}"`);
      break;
    }
  }
  if (!hitRateLimit) throw new Error("Expected 429 Too Many Requests on order flood");

  // ----------------------------------------------------
  // TEST 7: Anonymous client read against Supabase RLS
  // ----------------------------------------------------
  console.log("\n--- TEST 7: Supabase Anon-Key RLS Read Audit ---");
  const anonClient = createClient(supabaseUrl, anonKey);

  // A. Orders table
  const { data: anonOrders, error: anonOrdersErr } = await anonClient
    .from("orders")
    .select("id, status, total_amount")
    .limit(5);
  console.log("Anon reading 'orders':", {
    rowsReturned: anonOrders ? anonOrders.length : 0,
    data: anonOrders,
    error: anonOrdersErr?.message || null,
  });

  // B. Loyalty Members table
  const { data: anonLoyalty, error: anonLoyaltyErr } = await anonClient
    .from("loyalty_members")
    .select("id, phone, stamps")
    .limit(5);
  console.log("Anon reading 'loyalty_members':", {
    rowsReturned: anonLoyalty ? anonLoyalty.length : 0,
    data: anonLoyalty,
    error: anonLoyaltyErr?.message || null,
  });

  // C. Feedback table
  const { data: anonFeedback, error: anonFeedbackErr } = await anonClient
    .from("feedback")
    .select("id, rating, comment")
    .limit(5);
  console.log("Anon reading 'feedback':", {
    rowsReturned: anonFeedback ? anonFeedback.length : 0,
    data: anonFeedback,
    error: anonFeedbackErr?.message || null,
  });

  // Verification assertions
  if (anonOrders && anonOrders.length > 0) {
    throw new Error(`SECURITY LEAK: Anon client read ${anonOrders.length} orders! RLS missing on orders.`);
  }
  if (anonLoyalty && anonLoyalty.length > 0) {
    throw new Error(`SECURITY LEAK: Anon client read ${anonLoyalty.length} loyalty members! RLS missing on loyalty_members.`);
  }
  if (anonFeedback && anonFeedback.length > 0) {
    throw new Error(`SECURITY LEAK: Anon client read ${anonFeedback.length} feedback entries! RLS missing on feedback.`);
  }

  console.log("\n✅ ALL 7 SECURITY TESTS PASSED PERFECTLY!");
  console.log("=== END SECURITY TEST SUITE ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in security suite:", err);
  process.exit(1);
});
