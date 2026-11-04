/* Run only against staging first: npx tsx scripts/convert-staff-pins.ts --dry-run */
import { createClient } from "@supabase/supabase-js";
import { hashStaffPin } from "../src/lib/staff-pin";

const dryRun = process.argv.includes("--dry-run");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data, error } = await service
    .from("restaurants")
    .select("id, kitchen_pin, staff_pin_hash, pin_reset_required");
  if (error) throw new Error(`Could not load restaurants: ${error.message}`);

  let converted = 0;
  let resetRequired = 0;
  let unchanged = 0;
  for (const row of data ?? []) {
    const legacy = typeof row.kitchen_pin === "string" ? row.kitchen_pin.trim() : "";
    if (row.staff_pin_hash?.startsWith("scrypt:")) { unchanged++; continue; }
    if (legacy && legacy !== "1234" && !legacy.startsWith("scrypt:")) {
      converted++;
      if (!dryRun) {
        const { error: updateError } = await service.from("restaurants")
          .update({ staff_pin_hash: await hashStaffPin(legacy), pin_reset_required: false })
          .eq("id", row.id);
        if (updateError) throw new Error(`Could not convert a staff PIN: ${updateError.message}`);
      }
    } else {
      resetRequired++;
      if (!dryRun) {
        const { error: updateError } = await service.from("restaurants")
          .update({ pin_reset_required: true })
          .eq("id", row.id);
        if (updateError) throw new Error(`Could not mark PIN reset required: ${updateError.message}`);
      }
    }
  }
  console.log(JSON.stringify({ dryRun, converted, resetRequired, unchanged }));
}

void main();
