import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { demoRestaurants } from "@/lib/restaurant-data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "staff-login", 12, 300);
  if (rate !== "allowed") {
    return NextResponse.json(
      { error: "Too many sign-in attempts. Please wait a few minutes." },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

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
      { error: "Please select a restaurant and enter the 4-digit staff PIN." },
      { status: 400 },
    );
  }

  let matchedRestaurant: { id: string; name: string; kitchen_pin: string } | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, kitchen_pin")
        .eq("id", restaurantId)
        .maybeSingle();
      if (data) {
        matchedRestaurant = data as { id: string; name: string; kitchen_pin: string };
      }
    } catch (e) {
      console.warn("Could not query kitchen_pin from database:", e);
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
        kitchen_pin: demo.restaurant.kitchenPin || "1234",
      };
    }
  }

  if (!matchedRestaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  const expectedPin = matchedRestaurant.kitchen_pin || "1234";
  if (pin !== expectedPin) {
    return NextResponse.json(
      { error: "Incorrect 4-digit Staff PIN. Please check with your restaurant manager." },
      { status: 401 },
    );
  }

  // Set secure HTTP-only cookie
  const cookieStore = await cookies();
  const sessionData = {
    restaurantId: matchedRestaurant.id,
    restaurantName: matchedRestaurant.name,
    role: "kitchen",
    authenticatedAt: Date.now(),
  };

  cookieStore.set("tabletap_staff_session", encodeURIComponent(JSON.stringify(sessionData)), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return NextResponse.json({
    success: true,
    redirectUrl: `/kitchen?restaurant=${matchedRestaurant.id}`,
    restaurantName: matchedRestaurant.name,
  });
}
