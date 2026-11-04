import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { demoRestaurants } from "@/lib/restaurant-data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createClient } from "@supabase/supabase-js";
import { verifyStaffPin } from "@/lib/staff-pin";
import { signStaffSessionPayload } from "@/lib/admin-auth";
import { missingServiceRoleInProduction } from "@/lib/server-config";

// In-memory lockout cache to safeguard against rapid brute-force attacks across all environments
type PinAttemptTracker = {
  failedAttempts: number;
  lockedUntil: number;
};
const pinAttemptStore = new Map<string, PinAttemptTracker>();

export async function POST(request: Request) {
  const configurationError = missingServiceRoleInProduction("Kitchen sign-in");
  if (configurationError) return NextResponse.json({ error: configurationError }, { status: 500 });
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

  const clientIp =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "client";
  const trackerKey = `${restaurantId}:${clientIp}`;
  const now = Date.now();
  const tracker = pinAttemptStore.get(trackerKey);

  // Check lockout against PIN brute-force
  if (tracker && tracker.lockedUntil > now) {
    const remainingMinutes = Math.ceil((tracker.lockedUntil - now) / 60000);
    return NextResponse.json(
      {
        error: `Account locked due to 5 consecutive failed PIN attempts. Please wait ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} or contact the owner.`,
      },
      { status: 429 },
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
    pin_reset_required?: boolean;
  } | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const initialQuery = await supabase
        .from("restaurants")
        .select("id, name, staff_pin_hash, pin_reset_required")
        .eq("id", restaurantId)
        .maybeSingle();

      const data = initialQuery.data;

      if (data) {
        const row = data as Record<string, unknown>;
        matchedRestaurant = {
          id: row.id as string,
          name: row.name as string,
          staff_pin_hash: (row.staff_pin_hash as string) || null,
          pin_reset_required: row.pin_reset_required === true,
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
        pin_reset_required: false,
      };
    }
  }

  if (!matchedRestaurant) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  // If no PIN has been set for this restaurant, block staff login
  if (matchedRestaurant.pin_reset_required) {
    return NextResponse.json({ error: "Ask the owner to set a staff PIN in Admin → Staff PIN." }, { status: 403 });
  }
  const hasConfiguredPin = Boolean(matchedRestaurant.staff_pin_hash);
  if (!hasConfiguredPin) {
    return NextResponse.json(
      { error: "Ask the owner to set a staff PIN in Admin → Staff PIN." },
      { status: 403 },
    );
  }

  // Verify PIN using scrypt with random salt in constant time
  const isValid = await verifyStaffPin(
    pin,
    matchedRestaurant.staff_pin_hash,
    null,
  );

  if (!isValid) {
    const cur = tracker && tracker.lockedUntil <= now ? tracker : { failedAttempts: 0, lockedUntil: 0 };
    cur.failedAttempts += 1;
    if (cur.failedAttempts >= 5) {
      cur.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
      pinAttemptStore.set(trackerKey, cur);
      return NextResponse.json(
        {
          error: "Account locked out for 15 minutes due to 5 consecutive failed PIN attempts. Please wait or contact the owner.",
        },
        { status: 429 },
      );
    }
    pinAttemptStore.set(trackerKey, cur);
    const attemptsLeft = 5 - cur.failedAttempts;
    return NextResponse.json(
      { error: `Incorrect staff PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining before temporary lockout.` },
      { status: 401 },
    );
  }

  // Clear failed attempt tracking on successful authentication
  pinAttemptStore.delete(trackerKey);

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
