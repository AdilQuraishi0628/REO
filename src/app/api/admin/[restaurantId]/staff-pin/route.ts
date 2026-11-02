import { NextResponse } from "next/server";
import { getAdminContext, canManageRestaurant, uuidPattern } from "@/lib/admin-auth";
import { hashStaffPin, generateRandomStaffPin } from "@/lib/staff-pin";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  const { data: restaurant, error } = await context.serviceClient
    .from("restaurants")
    .select("staff_pin_hash, kitchen_pin")
    .eq("id", restaurantId)
    .maybeSingle();

  if (error || !restaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  const row = (restaurant as unknown) as Record<string, unknown>;
  const hasPin = Boolean(row.staff_pin_hash || row.kitchen_pin);

  return NextResponse.json({ hasPin });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Optional body; if empty, we generate a random PIN
  }

  const input = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  let targetPin = typeof input.pin === "string" ? input.pin.trim() : "";

  if (targetPin) {
    if (!/^\d{4,8}$/.test(targetPin)) {
      return NextResponse.json(
        { error: "Staff PIN must be between 4 and 8 digits (numeric only)." },
        { status: 400 },
      );
    }
  } else {
    targetPin = generateRandomStaffPin();
  }

  const hashedPin = await hashStaffPin(targetPin);

  // Update staff_pin_hash in DB, with fallback if column is not yet migrated
  const updatePayload: Record<string, unknown> = {
    staff_pin_hash: hashedPin,
  };

  let { error } = await context.serviceClient
    .from("restaurants")
    .update(updatePayload as never)
    .eq("id", restaurantId);

  // Graceful fallback if staff_pin_hash column is pending migration
  if (error && /staff_pin_hash/i.test(error.message)) {
    const fallbackUpdate: Record<string, unknown> = {
      kitchen_pin: hashedPin,
    };
    const retry = await context.serviceClient
      .from("restaurants")
      .update(fallbackUpdate as never)
      .eq("id", restaurantId);
    error = retry.error;
  }

  if (error) {
    console.error("Could not set staff PIN:", error.message);
    return NextResponse.json({ error: "Could not set staff PIN." }, { status: 500 });
  }

  // Return the plaintext PIN once so the admin owner can record it
  return NextResponse.json({
    success: true,
    pin: targetPin,
    message: "Staff PIN updated. It is stored securely as a cryptographic hash and will not be displayed again.",
  });
}
