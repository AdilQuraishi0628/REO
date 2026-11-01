import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  appleWalletConfigured,
  createGoogleWalletSaveUrl,
  LOYALTY_REWARD_GOAL,
  type LoyaltyMember,
} from "@/lib/loyalty";
import { normalizeIndianPhone } from "@/lib/indian-phone";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "loyalty-enrollment", 5, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many loyalty sign-ups from this connection. Please try again later."
            : "Loyalty sign-up is temporarily unavailable.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please submit valid form data." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Please submit valid form data." }, { status: 400 });
  }

  const submission = body as Record<string, unknown>;
  const restaurantId =
    typeof submission.restaurantId === "string" ? submission.restaurantId : "";
  const fullName =
    typeof submission.fullName === "string" ? submission.fullName.trim() : "";
  const phoneInput =
    typeof submission.phone === "string" ? submission.phone : "";
  const phone = normalizeIndianPhone(phoneInput);
  const email =
    typeof submission.email === "string" ? submission.email.trim().toLowerCase() : "";
  const tableId =
    submission.tableId === undefined || submission.tableId === null
      ? null
      : typeof submission.tableId === "string"
        ? submission.tableId
        : undefined;

  if (
    !uuidPattern.test(restaurantId) ||
    !fullName ||
    fullName.length > 100 ||
    tableId === undefined ||
    (tableId !== null && !uuidPattern.test(tableId))
  ) {
    return NextResponse.json(
      { error: "Enter your name to join the loyalty program." },
      { status: 400 },
    );
  }
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid Indian mobile number, such as 98765 43210 or +91 98765 43210." },
      { status: 400 },
    );
  }
  if (email !== "" && (!emailPattern.test(email) || email.length > 254)) {
    return NextResponse.json(
      { error: "Enter a valid email address or leave it blank." },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    if (restaurantId.startsWith("00000000-0000-4000-8000-")) {
      return NextResponse.json(
        {
          member: {
            id: `demo-member-${Date.now()}`,
            fullName,
            stamps: 1,
            rewardGoal: 5,
          },
          appleWalletUrl: null,
          googleWalletUrl: null,
        },
        { status: 201 },
      );
    }
    return NextResponse.json(
      { error: "Loyalty enrollment is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, loyalty_enabled, loyalty_reward_goal")
    .eq("id", restaurantId)
    .eq("is_published", true)
    .maybeSingle();

  if (restaurantError) {
    console.error("Could not validate loyalty restaurant:", restaurantError.message);
    return NextResponse.json(
      { error: "We couldn't start your loyalty card. Please try again." },
      { status: 500 },
    );
  }
  if (!restaurant) {
    return NextResponse.json({ error: "This restaurant is not available." }, { status: 404 });
  }
  if (!restaurant.loyalty_enabled) {
    return NextResponse.json({ error: "This restaurant's loyalty program is currently unavailable." }, { status: 410 });
  }

  if (tableId) {
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .maybeSingle();
    if (tableError) {
      console.error("Could not validate loyalty table:", tableError.message);
      return NextResponse.json(
        { error: "We couldn't verify this table. Please try again." },
        { status: 500 },
      );
    }
    if (!table) {
      return NextResponse.json({ error: "This table is not available." }, { status: 404 });
    }
  }

  const id = crypto.randomUUID();
  const member: LoyaltyMember = {
    id,
    restaurant_id: restaurant.id,
    full_name: fullName,
    email: email || null,
    phone,
    stamps: 0,
    reward_goal: restaurant.loyalty_reward_goal ?? LOYALTY_REWARD_GOAL,
  };

  let googleWalletUrl: string | null;
  try {
    googleWalletUrl = await createGoogleWalletSaveUrl({
      member,
      restaurantName: restaurant.name,
    });
  } catch (error) {
    console.error("Could not prepare Google Wallet pass:", error);
    return NextResponse.json(
      { error: "We couldn't prepare your digital card. Please try again later." },
      { status: 503 },
    );
  }

  const insertPayload: Record<string, unknown> = {
    id,
    restaurant_id: restaurant.id,
    table_id: tableId,
    email: email || null,
    phone,
    stamps: 0,
    reward_goal: restaurant.loyalty_reward_goal ?? LOYALTY_REWARD_GOAL,
  };
  if (fullName) {
    insertPayload.full_name = fullName;
  }

  let { error: insertError } = await supabase.from("loyalty_members").insert(insertPayload);
  if (insertError && /full_name/i.test(insertError.message)) {
    delete insertPayload.full_name;
    const retry = await supabase.from("loyalty_members").insert(insertPayload);
    insertError = retry.error;
  }

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "A loyalty card already exists for this phone number at this restaurant." },
        { status: 409 },
      );
    }
    console.error("Could not save loyalty enrollment:", insertError.message);
    return NextResponse.json(
      { error: "We couldn't save your loyalty card. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      member: {
        id: member.id,
        fullName: member.full_name,
        stamps: member.stamps,
        rewardGoal: member.reward_goal,
      },
      appleWalletUrl: appleWalletConfigured()
        ? `/api/loyalty/pass/apple?memberId=${encodeURIComponent(member.id)}`
        : null,
      googleWalletUrl,
    },
    { status: 201 },
  );
}
