import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { demoRestaurants, type MenuCategory } from "@/lib/restaurant-data";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  if (!restaurantId) {
    return NextResponse.json({ error: "Missing restaurantId" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const isDemo =
    !supabaseUrl ||
    !serviceRoleKey ||
    restaurantId.startsWith("00000000-0000-4000-8000-") ||
    Boolean(demoRestaurants[restaurantId]) ||
    Object.values(demoRestaurants).some((entry) => entry.restaurant.id === restaurantId);

  if (isDemo) {
    const entry =
      Object.values(demoRestaurants).find((e) => e.restaurant.id === restaurantId) ??
      demoRestaurants[restaurantId] ??
      demoRestaurants["juniper-and-rye"];
    return NextResponse.json({
      restaurant: entry.restaurant,
      categories: entry.categories,
    });
  }

  if (!uuidPattern.test(restaurantId)) {
    return NextResponse.json({ error: "Invalid restaurant ID" }, { status: 400 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: restaurantRow, error: restError } = await supabase
      .from("restaurants")
      .select("*")
      .eq("id", restaurantId)
      .single();

    if (restError || !restaurantRow) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    // Try menu_categories
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { data: catRows, error: catError } = await (supabase as any)
      .from("menu_categories")
      .select("id, name, icon, image_url, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    if (catError && (catError.code === "42P01" || catError.message.includes("relation"))) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallback = await (supabase as any)
        .from("categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");
      if (!fallback.error) {
        catRows = fallback.data ?? [];
        catError = null;
      }
    }

    const { data: itemRows } = await supabase
      .from("menu_items")
      .select("id, category_id, name, description, price, pricing_variants, image_url, dietary_tags, is_available, sort_order")
      .eq("restaurant_id", restaurantId)
      .order("sort_order");

    const categories: MenuCategory[] = (catRows ?? []).map((cat: {
      id: string;
      name: string;
      icon?: string | null;
      image_url?: string | null;
    }) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon ?? undefined,
      imageUrl: cat.image_url ?? undefined,
      items: (itemRows ?? [])
        .filter((item) => item.category_id === cat.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          price: Number(item.price),
          pricingVariants: (item.pricing_variants as { name: string; price: number }[]) ?? undefined,
          imageUrl: item.image_url ?? "",
          dietaryTags: item.dietary_tags ?? [],
          isAvailable: item.is_available,
        })),
    }));

    return NextResponse.json({
      restaurant: {
        id: restaurantRow.id,
        slug: restaurantRow.slug,
        name: restaurantRow.name,
        tagline: restaurantRow.tagline,
        description: restaurantRow.description,
        address: restaurantRow.address,
        city: restaurantRow.city || "Raipur, Chhattisgarh",
        phone: restaurantRow.phone,
        hours: restaurantRow.hours,
        heroImage: restaurantRow.hero_image,
        initials: restaurantRow.initials,
        wifiName: restaurantRow.wifi_name ?? restaurantRow.wifi_ssid ?? "",
        wifiSsid: restaurantRow.wifi_name ?? restaurantRow.wifi_ssid ?? "",
        wifiPassword: restaurantRow.wifi_password ?? "",
        enableWifi: restaurantRow.enable_wifi ?? true,
        enableCallWaiter: restaurantRow.enable_call_waiter ?? true,
        enableRequestBill: restaurantRow.enable_request_bill ?? true,
        enableMenu: restaurantRow.enable_menu ?? true,
        enableOrdering: restaurantRow.enable_ordering ?? true,
        enableFeedback: restaurantRow.enable_feedback ?? true,
        enableGoogleReviews: restaurantRow.enable_google_reviews ?? true,
        googleReviewUrl: restaurantRow.google_review_url || "",
        logoUrl: restaurantRow.logo_url ?? "",
        primaryColor: restaurantRow.primary_color ?? "#722F37",
        secondaryColor: restaurantRow.secondary_color ?? "#B7A89A",
        instagramUrl: restaurantRow.instagram_url ?? "",
        loyaltyEnabled: restaurantRow.loyalty_enabled ?? true,
        loyaltyType: (restaurantRow.loyalty_type as "stamps" | "points") || "stamps",
        loyaltyRewardGoal: restaurantRow.loyalty_reward_goal ?? 5,
        kitchenPin: ((restaurantRow as Record<string, unknown>).kitchen_pin as string) ?? "1234",
        enableReservations: (restaurantRow as Record<string, unknown>).enable_reservations !== false,
      },
      categories,
    });
  } catch (error) {
    console.error("Failed to fetch guest menu:", error);
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}
