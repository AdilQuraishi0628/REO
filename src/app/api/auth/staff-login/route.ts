import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { demoRestaurants } from "@/lib/restaurant-data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";
import { verifyStaffPin } from "@/lib/staff-pin";
import { signStaffSessionPayload } from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login format." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const restaurantId = typeof input.restaurantId === "string" ? input.restaurantId.trim() : "";
  const pin = typeof input.pin === "string" ? input.pin.trim() : "";

  if (!restaurantId || !pin) {
    return NextResponse.json(
      { error: "Please select a restaurant and enter the staff PIN." },
      { status: 400 },
    );
  }

  // Rate-limit staff login: 5 attempts per 10 minutes per IP + restaurant
  const rateKey = `staff-login:${restaurantId}`;
  const rate = await consumeRateLimit(request, rateKey, 5, 600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many failed login attempts. This restaurant's staff portal is locked out for 10 minutes. Please try again later or ask the owner."
            : "Staff login is temporarily unavailable. Please try again.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let matchedRestaurant: {
    id: string;
    name: string;
    staff_pin_hash?: string | null;
    kitchen_pin?: string | null;
  } | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      // Query both staff_pin_hash and legacy kitchen_pin for graceful backward compatibility
      const initialQuery = await supabase
        .from("restaurants")
        .select("id, name, staff_pin_hash, kitchen_pin")
        .eq("id", restaurantId)
        .maybeSingle();

      let data = initialQuery.data;
      const error = initialQuery.error;

      if (error && (error.code === "42703" || error.message?.includes("staff_pin_hash"))) {
        // Migration not yet applied to live DB; fallback to legacy kitchen_pin column
        const fallback = await supabase
          .from("restaurants")
          .select("id, name, kitchen_pin")
          .eq("id", restaurantId)
          .maybeSingle();
        data = fallback.data ? ({ ...fallback.data, staff_pin_hash: null } as unknown as typeof data) : null;
      }

      if (data) {
        const row = data as Record<string, unknown>;
        matchedRestaurant = {
          id: row.id as string,
          name: row.name as string,
          staff_pin_hash: (row.staff_pin_hash as string) || null,
          kitchen_pin: (row.kitchen_pin as string) || null,
        };
      }
    } catch (e) {
      console.warn("Could not query restaurant staff PIN:", e);
    }
  }

  if (!matchedRestaurant) {
    const demo = Object.values(demoRestaurants).find(
      (d) => d.restaurant.id === restaurantId || d.restaurant.slug === restaurantId,
    );
    if (demo) {
      matchedRestaurant = {
        id: demo.restaurant.id,
        name: demo.restaurant.name,
        staff_pin_hash: null,
        kitchen_pin: (demo.restaurant as Record<string, unknown>).kitchenPin as string || null,
      };
    }
  }

  if (!matchedRestaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  // If no PIN has been set for this restaurant, block staff login
  const hasConfiguredPin = Boolean(matchedRestaurant.staff_pin_hash || matchedRestaurant.kitchen_pin);
  if (!hasConfiguredPin) {
    return NextResponse.json(
      { error: "Ask the owner to set a staff PIN in Admin." },
      { status: 403 },
    );
  }

  // Verify PIN using scrypt with random salt in constant time
  const isValid = await verifyStaffPin(
    pin,
    matchedRestaurant.staff_pin_hash,
    matchedRestaurant.kitchen_pin,
  );

  if (!isValid) {
    return NextResponse.json(
      { error: "Incorrect staff PIN. Ask the owner to set a staff PIN in Admin." },
      { status: 401 },
    );
  }

  // Issue cryptographically signed httpOnly session cookie with 12-hour expiry
  const sessionPayload = {
    restaurantId: matchedRestaurant.id,
    restaurantName: matchedRestaurant.name,
    role: "kitchen" as const,
    authenticatedAt: Date.now(),
    expiresAt: Date.now() + 12 * 3600 * 1000,
  };

  const signedToken = signStaffSessionPayload(sessionPayload);
  const cookieStore = await cookies();

  cookieStore.set("tabletap_staff_session", signedToken, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 3600, // 12 hours
  });

  return NextResponse.json({
    success: true,
    redirectUrl: `/kitchen?restaurant=${matchedRestaurant.id}`,
    restaurantName: matchedRestaurant.name,
  });
}
