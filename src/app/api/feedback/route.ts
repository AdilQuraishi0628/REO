import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { normalizeIndianPhone } from "@/lib/indian-phone";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    return undefined;
  }

  return normalized || null;
}

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "guest-feedback", 5, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "We received several feedback submissions from this connection. Please try again later."
            : "Feedback is temporarily unavailable. Please try again later.",
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
  const rating = submission.rating;
  const comment = optionalText(submission.comment, 2000);
  const guestName = optionalText(submission.guestName, 100);
  const contact = optionalText(submission.contact, 254);
  const phoneInput = optionalText(submission.phone, 24);
  const phone =
    phoneInput && phoneInput !== null ? normalizeIndianPhone(phoneInput) : null;
  const tableLabel = optionalText(submission.tableLabel, 80);
  const tableId =
    submission.tableId === undefined || submission.tableId === null
      ? null
      : typeof submission.tableId === "string"
        ? submission.tableId
        : undefined;

  if (
    !uuidPattern.test(restaurantId) ||
    typeof rating !== "number" ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    comment === undefined ||
    guestName === undefined ||
    contact === undefined
    || phoneInput === undefined
    || (phoneInput !== null && phoneInput !== "" && !phone)
    || tableLabel === undefined
    || tableId === undefined
    || (tableId !== null && !uuidPattern.test(tableId))
  ) {
    return NextResponse.json(
      {
        error: phoneInput && !phone
          ? "Enter a valid Indian mobile number, or leave the phone field blank."
          : "Please check your rating and make sure each field is within its limit.",
      },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    if (restaurantId.startsWith("00000000-0000-4000-8000-")) {
      return NextResponse.json({ success: true }, { status: 201 });
    }
    return NextResponse.json(
      { error: "Feedback storage is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .eq("is_published", true)
    .maybeSingle();
  if (restaurantError) {
    console.error("Could not validate feedback restaurant:", restaurantError.message);
    return NextResponse.json(
      { error: "We couldn't verify this restaurant. Please try again." },
      { status: 500 },
    );
  }
  if (!restaurant) {
    return NextResponse.json({ error: "This restaurant is not available." }, { status: 404 });
  }

  let verifiedTableLabel = tableLabel;
  if (tableId) {
    const { data: table, error: tableError } = await supabase
      .from("tables")
      .select("id, table_number")
      .eq("id", tableId)
      .eq("restaurant_id", restaurantId)
      .eq("is_active", true)
      .maybeSingle();
    if (tableError) {
      console.error("Could not validate feedback table:", tableError.message);
      return NextResponse.json(
        { error: "We couldn't verify this table. Please try again." },
        { status: 500 },
      );
    }
    if (!table) {
      return NextResponse.json({ error: "This table is not available." }, { status: 404 });
    }
    verifiedTableLabel = table.table_number;
  }

  const { error } = await supabase.from("feedback").insert({
    restaurant_id: restaurantId,
    table_id: tableId,
    rating,
    comment,
    guest_name: guestName,
    contact,
    phone,
    table_label: verifiedTableLabel,
    review_prompted: rating >= 4,
  });

  if (error) {
    console.error("Could not save guest feedback:", error.message);
    return NextResponse.json(
      { error: "We couldn't save your feedback just now. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
