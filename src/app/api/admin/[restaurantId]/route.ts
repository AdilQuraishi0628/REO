import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";
import { demoRestaurants } from "@/lib/restaurant-data";
import type { Database } from "@/lib/database.types";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (restaurantId.startsWith("00000000-0000-4000-8000-")) {
      const demo =
        Object.values(demoRestaurants).find((entry) => entry.restaurant.id === restaurantId) ??
        demoRestaurants["juniper-and-rye"];
      return NextResponse.json({
        restaurant: {
          ...demo.restaurant,
          hero_image: demo.restaurant.heroImage,
          secondary_color: demo.restaurant.secondaryColor ?? "#C84B16",
          instagram_url: demo.restaurant.instagramUrl ?? "",
          enable_menu: demo.restaurant.enableMenu ?? true,
          enable_ordering: demo.restaurant.enableOrdering ?? true,
          enable_feedback: demo.restaurant.enableFeedback ?? true,
          enable_google_reviews: demo.restaurant.enableGoogleReviews ?? true,
          loyalty_type: demo.restaurant.loyaltyType ?? "stamps",
          loyalty_reward_description: demo.restaurant.loyaltyRewardDescription ?? "Complimentary treat or beverage",
          loyalty_points_per_amount: demo.restaurant.loyaltyPointsPerAmount ?? 10,
          loyalty_points_goal: demo.restaurant.loyaltyPointsGoal ?? 100,
          wifi_name: demo.restaurant.wifiName ?? demo.restaurant.wifiSsid,
          wifi_ssid: demo.restaurant.wifiName ?? demo.restaurant.wifiSsid,
          wifi_password: demo.restaurant.wifiPassword,
          enable_wifi: demo.restaurant.enableWifi ?? true,
          enable_call_waiter: demo.restaurant.enableCallWaiter ?? true,
          enable_request_bill: demo.restaurant.enableRequestBill ?? true,
          kitchen_pin: demo.restaurant.kitchenPin ?? "1234",
        },
        categories: demo.categories.map((c, i) => ({ id: c.id, name: c.name, icon: c.icon ?? null, image_url: c.imageUrl ?? null, sort_order: i })),
        items: demo.categories.flatMap((c) =>
          c.items.map((item, idx) => ({
            id: item.id,
            category_id: c.id,
            name: item.name,
            description: item.description,
            price: item.price,
            pricing_variants: item.pricingVariants ?? null,
            image_url: item.imageUrl || null,
            dietary_tags: item.dietaryTags,
            is_available: item.isAvailable,
            sort_order: idx,
          })),
        ),
        feedback: [
          {
            id: "fb-1",
            rating: 5,
            comment: "Loved the ambience and fast table ordering! Google review submitted.",
            guest_name: "Aman Agrawal",
            table_label: "Table 4",
            review_prompted: true,
            resolved_at: null,
            created_at: new Date(Date.now() - 3600_000).toISOString(),
          },
          {
            id: "fb-2",
            rating: 4,
            comment: "Great food quality. Prompt service via the digital bell.",
            guest_name: "Sneha Jain",
            table_label: "Table 2",
            review_prompted: true,
            resolved_at: null,
            created_at: new Date(Date.now() - 7200_000).toISOString(),
          },
        ],
        loyaltyMemberCount: 142,
        links: [
          { id: "lnk-1", kind: "qr", token: "demo-juniper-t4", table_label: "Table 4", created_at: new Date().toISOString() },
          { id: "lnk-2", kind: "qr", token: "demo-juniper-t1", table_label: "Table 1", created_at: new Date().toISOString() },
        ],
        totalScans: 384,
      });
    }
  }

  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  const supabase = context.serviceClient;
  try {
    const [restaurantResult, categoriesResult, itemsResult, feedbackResult, membersResult, linksResult, analyticsResult] =
      await Promise.all([
        supabase
          .from("restaurants")
          .select("id, slug, name, tagline, description, address, city, phone, hours, hero_image, logo_url, wifi_name, wifi_ssid, wifi_password, enable_call_waiter, enable_request_bill, enable_wifi, enable_menu, enable_ordering, enable_feedback, enable_google_reviews, google_review_url, instagram_url, primary_color, secondary_color, loyalty_enabled, loyalty_type, loyalty_reward_goal, loyalty_reward_description, loyalty_points_per_amount, loyalty_points_goal, kitchen_pin")
          .eq("id", restaurantId)
          .single(),
        supabase
          .from("menu_categories")
          .select("id, name, icon, image_url, sort_order")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select("id, category_id, name, description, price, pricing_variants, image_url, dietary_tags, is_available, sort_order")
          .eq("restaurant_id", restaurantId)
          .order("sort_order"),
        supabase
          .from("feedback")
          .select("id, rating, comment, guest_name, table_label, review_prompted, resolved_at, created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("loyalty_members")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId),
        supabase
          .from("guest_links")
          .select("id, kind, token, table_label, created_at")
          .eq("restaurant_id", restaurantId)
          .order("created_at", { ascending: false }),
        supabase.rpc("admin_analytics_summary", {
          p_restaurant_id: restaurantId,
          p_since: null,
        }),
      ]);

    if (restaurantResult.error || !restaurantResult.data) {
      return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
    }

    // Categories fallback if column or table differs
    let categories = categoriesResult.data ?? [];
    if (categoriesResult.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallbackCats = await (supabase as any)
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");
      if (!fallbackCats.error && fallbackCats.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        categories = fallbackCats.data.map((c: any) => ({ ...c, icon: null, image_url: null }));
      }
    }

    // Items fallback if pricing_variants differs
    let items = itemsResult.data ?? [];
    if (itemsResult.error) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fallbackItems = await (supabase as any)
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url, dietary_tags, is_available, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");
      if (!fallbackItems.error && fallbackItems.data) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items = fallbackItems.data.map((item: any) => ({ ...item, pricing_variants: null }));
      }
    }

    return NextResponse.json({
      restaurant: restaurantResult.data,
      categories,
      items,
      feedback: feedbackResult.data ?? [],
      loyaltyMemberCount: membersResult.count ?? 0,
      links: linksResult.data ?? [],
      totalScans: Number(analyticsResult.data?.[0]?.total_scans ?? 0),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not load restaurant.";
    console.error("GET /api/admin/[restaurantId] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (restaurantId.startsWith("00000000-0000-4000-8000-")) {
      return NextResponse.json({ success: true });
    }
  }

  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid settings." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit valid settings." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;

  // Handle demo mode updates
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (restaurantId.startsWith("00000000-0000-4000-8000-")) {
      const demoEntry =
        Object.values(demoRestaurants).find((entry) => entry.restaurant.id === restaurantId) ??
        demoRestaurants["juniper-and-rye"];
      if (demoEntry) {
        if (typeof input.name === "string" && input.name.trim()) demoEntry.restaurant.name = input.name.trim();
        if (typeof input.tagline === "string") demoEntry.restaurant.tagline = input.tagline.trim();
        if (typeof input.description === "string") demoEntry.restaurant.description = input.description.trim();
        if (typeof input.address === "string") demoEntry.restaurant.address = input.address.trim();
        if (typeof input.city === "string") demoEntry.restaurant.city = input.city.trim();
        if (typeof input.phone === "string") demoEntry.restaurant.phone = input.phone.trim();
        if (typeof input.heroImage === "string") demoEntry.restaurant.heroImage = input.heroImage.trim();
        if (typeof input.logoUrl === "string") demoEntry.restaurant.logoUrl = input.logoUrl.trim();
        if (typeof input.primaryColor === "string" && /^#[0-9a-f]{6}$/i.test(input.primaryColor)) demoEntry.restaurant.primaryColor = input.primaryColor;
        if (typeof input.secondaryColor === "string") demoEntry.restaurant.secondaryColor = input.secondaryColor;
        if (typeof input.googleReviewUrl === "string") demoEntry.restaurant.googleReviewUrl = input.googleReviewUrl.trim();
        if (typeof input.instagramUrl === "string") demoEntry.restaurant.instagramUrl = input.instagramUrl.trim();
        if (typeof input.wifiName === "string") demoEntry.restaurant.wifiName = input.wifiName.trim();
        if (typeof input.wifiPassword === "string") demoEntry.restaurant.wifiPassword = input.wifiPassword.trim();
        if (typeof input.enableWifi === "boolean") demoEntry.restaurant.enableWifi = input.enableWifi;
        if (typeof input.enableCallWaiter === "boolean") demoEntry.restaurant.enableCallWaiter = input.enableCallWaiter;
        if (typeof input.enableRequestBill === "boolean") demoEntry.restaurant.enableRequestBill = input.enableRequestBill;
        if (typeof input.enableMenu === "boolean") demoEntry.restaurant.enableMenu = input.enableMenu;
        if (typeof input.enableOrdering === "boolean") demoEntry.restaurant.enableOrdering = input.enableOrdering;
        if (typeof input.enableFeedback === "boolean") demoEntry.restaurant.enableFeedback = input.enableFeedback;
        if (typeof input.enableGoogleReviews === "boolean") demoEntry.restaurant.enableGoogleReviews = input.enableGoogleReviews;
        if (typeof input.loyaltyEnabled === "boolean") demoEntry.restaurant.loyaltyEnabled = input.loyaltyEnabled;
        if (input.loyaltyType === "stamps" || input.loyaltyType === "points") demoEntry.restaurant.loyaltyType = input.loyaltyType;
        if (typeof input.loyaltyRewardGoal === "number") demoEntry.restaurant.loyaltyRewardGoal = input.loyaltyRewardGoal;
        if (typeof input.loyaltyRewardDescription === "string") demoEntry.restaurant.loyaltyRewardDescription = input.loyaltyRewardDescription.trim();
        if (typeof input.loyaltyPointsPerAmount === "number") demoEntry.restaurant.loyaltyPointsPerAmount = input.loyaltyPointsPerAmount;
        if (typeof input.loyaltyPointsGoal === "number") demoEntry.restaurant.loyaltyPointsGoal = input.loyaltyPointsGoal;
      }
      return NextResponse.json({ success: true, restaurant: demoEntry.restaurant });
    }
  }

  const name = typeof input.name === "string" ? input.name.trim() : undefined;
  const tagline = typeof input.tagline === "string" ? input.tagline.trim() : undefined;
  const description = typeof input.description === "string" ? input.description.trim() : undefined;
  const address = typeof input.address === "string" ? input.address.trim() : undefined;
  const city = typeof input.city === "string" ? input.city.trim() : undefined;
  const phone = typeof input.phone === "string" ? input.phone.trim() : undefined;
  const heroImage = typeof input.heroImage === "string" ? input.heroImage.trim() : undefined;
  const logoUrl = typeof input.logoUrl === "string" ? input.logoUrl.trim() : undefined;
  const wifiName = typeof input.wifiName === "string" ? input.wifiName.trim() : (typeof input.wifiSsid === "string" ? input.wifiSsid.trim() : undefined);
  const wifiSsid = wifiName;
  const wifiPassword = typeof input.wifiPassword === "string" ? input.wifiPassword.trim() : undefined;
  const googleReviewUrl = typeof input.googleReviewUrl === "string" ? input.googleReviewUrl.trim() : undefined;
  const instagramUrl = typeof input.instagramUrl === "string" ? input.instagramUrl.trim() : undefined;
  const primaryColor = typeof input.primaryColor === "string" && /^#[0-9a-f]{6}$/i.test(input.primaryColor) ? input.primaryColor : undefined;
  const secondaryColor = typeof input.secondaryColor === "string" && /^#[0-9a-f]{6}$/i.test(input.secondaryColor) ? input.secondaryColor : undefined;

  const enableWifi = typeof input.enableWifi === "boolean" ? input.enableWifi : undefined;
  const enableCallWaiter = typeof input.enableCallWaiter === "boolean" ? input.enableCallWaiter : undefined;
  const enableRequestBill = typeof input.enableRequestBill === "boolean" ? input.enableRequestBill : undefined;
  const enableMenu = typeof input.enableMenu === "boolean" ? input.enableMenu : undefined;
  const enableOrdering = typeof input.enableOrdering === "boolean" ? input.enableOrdering : undefined;
  const enableFeedback = typeof input.enableFeedback === "boolean" ? input.enableFeedback : undefined;
  const enableGoogleReviews = typeof input.enableGoogleReviews === "boolean" ? input.enableGoogleReviews : undefined;

  const loyaltyEnabled = typeof input.loyaltyEnabled === "boolean" ? input.loyaltyEnabled : undefined;
  const loyaltyType = input.loyaltyType === "stamps" || input.loyaltyType === "points" ? input.loyaltyType : undefined;
  const loyaltyRewardGoal = typeof input.loyaltyRewardGoal === "number" && input.loyaltyRewardGoal >= 1 ? input.loyaltyRewardGoal : undefined;
  const loyaltyRewardDescription = typeof input.loyaltyRewardDescription === "string" ? input.loyaltyRewardDescription.trim() : undefined;
  const loyaltyPointsPerAmount = typeof input.loyaltyPointsPerAmount === "number" ? input.loyaltyPointsPerAmount : undefined;
  const loyaltyPointsGoal = typeof input.loyaltyPointsGoal === "number" ? input.loyaltyPointsGoal : undefined;
  const kitchenPin = typeof input.kitchenPin === "string" && input.kitchenPin.trim().length >= 4 ? input.kitchenPin.trim().slice(0, 8) : undefined;

  for (const value of [logoUrl, googleReviewUrl, instagramUrl, heroImage]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("URL protocol invalid");
    } catch {
      return NextResponse.json({ error: "Links must be valid web URLs." }, { status: 400 });
    }
  }

  const updatePayload: Database["public"]["Tables"]["restaurants"]["Update"] = {};
  if (name !== undefined) updatePayload.name = name;
  if (tagline !== undefined) updatePayload.tagline = tagline;
  if (description !== undefined) updatePayload.description = description;
  if (address !== undefined) updatePayload.address = address;
  if (city !== undefined) updatePayload.city = city;
  if (phone !== undefined) updatePayload.phone = phone;
  if (heroImage !== undefined) updatePayload.hero_image = heroImage;
  if (logoUrl !== undefined) updatePayload.logo_url = logoUrl || null;
  if (wifiName !== undefined) {
    updatePayload.wifi_name = wifiName || null;
    updatePayload.wifi_ssid = wifiSsid || "";
  }
  if (wifiPassword !== undefined) updatePayload.wifi_password = wifiPassword || null;
  if (googleReviewUrl !== undefined) updatePayload.google_review_url = googleReviewUrl || null;
  if (instagramUrl !== undefined) updatePayload.instagram_url = instagramUrl || null;
  if (primaryColor !== undefined) updatePayload.primary_color = primaryColor;
  if (secondaryColor !== undefined) updatePayload.secondary_color = secondaryColor;

  if (enableWifi !== undefined) updatePayload.enable_wifi = enableWifi;
  if (enableCallWaiter !== undefined) updatePayload.enable_call_waiter = enableCallWaiter;
  if (enableRequestBill !== undefined) updatePayload.enable_request_bill = enableRequestBill;
  if (enableMenu !== undefined) updatePayload.enable_menu = enableMenu;
  if (enableOrdering !== undefined) updatePayload.enable_ordering = enableOrdering;
  if (enableFeedback !== undefined) updatePayload.enable_feedback = enableFeedback;
  if (enableGoogleReviews !== undefined) updatePayload.enable_google_reviews = enableGoogleReviews;

  if (loyaltyEnabled !== undefined) updatePayload.loyalty_enabled = loyaltyEnabled;
  if (loyaltyType !== undefined) updatePayload.loyalty_type = loyaltyType;
  if (loyaltyRewardGoal !== undefined) updatePayload.loyalty_reward_goal = loyaltyRewardGoal;
  if (loyaltyRewardDescription !== undefined) updatePayload.loyalty_reward_description = loyaltyRewardDescription;
  if (loyaltyPointsPerAmount !== undefined) updatePayload.loyalty_points_per_amount = loyaltyPointsPerAmount;
  if (loyaltyPointsGoal !== undefined) updatePayload.loyalty_points_goal = loyaltyPointsGoal;
  if (kitchenPin !== undefined) (updatePayload as Record<string, unknown>).kitchen_pin = kitchenPin;

  const { error } = await context.serviceClient
    .from("restaurants")
    .update(updatePayload)
    .eq("id", restaurantId);

  if (error) {
    console.error("Could not update restaurant settings:", error.message);
    return NextResponse.json({ error: "Could not save restaurant settings." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
