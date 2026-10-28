import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

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
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  const supabase = context.serviceClient;
  const [restaurantResult, categoriesResult, itemsResult, feedbackResult, membersResult, linksResult, analyticsResult] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("id, slug, name, description, hero_image, logo_url, wifi_ssid, wifi_password, google_review_url, primary_color")
        .eq("id", restaurantId)
        .single(),
      supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select("id, category_id, name, description, price, image_url, is_available, sort_order")
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

  const errors = [
    restaurantResult.error,
    categoriesResult.error,
    itemsResult.error,
    feedbackResult.error,
    membersResult.error,
    linksResult.error,
    analyticsResult.error,
  ].filter(Boolean);
  if (errors.length) {
    console.error("Could not load admin dashboard:", errors.map((error) => error?.message));
    return NextResponse.json(
      { error: "Could not load the restaurant dashboard. Check that the latest database schema is installed." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    restaurant: restaurantResult.data,
    categories: categoriesResult.data ?? [],
    items: itemsResult.data ?? [],
    feedback: feedbackResult.data ?? [],
    loyaltyMemberCount: membersResult.count ?? 0,
    links: linksResult.data ?? [],
    totalScans: Number(analyticsResult.data?.[0]?.total_scans ?? 0),
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
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
  const fields = ["name", "logoUrl", "wifiSsid", "wifiPassword", "googleReviewUrl", "primaryColor"] as const;
  if (fields.some((field) => typeof input[field] !== "string")) {
    return NextResponse.json({ error: "Complete all restaurant settings." }, { status: 400 });
  }

  const name = (input.name as string).trim();
  const logoUrl = (input.logoUrl as string).trim();
  const wifiSsid = (input.wifiSsid as string).trim();
  const wifiPassword = (input.wifiPassword as string).trim();
  const googleReviewUrl = (input.googleReviewUrl as string).trim();
  const primaryColor = (input.primaryColor as string).trim();

  if (
    !name ||
    name.length > 120 ||
    logoUrl.length > 2048 ||
    wifiSsid.length > 128 ||
    wifiPassword.length > 256 ||
    googleReviewUrl.length > 2048 ||
    !/^#[0-9a-f]{6}$/i.test(primaryColor)
  ) {
    return NextResponse.json({ error: "Check the name, URLs, and color value." }, { status: 400 });
  }
  for (const value of [logoUrl, googleReviewUrl]) {
    if (!value) continue;
    try {
      if (new URL(value).protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      return NextResponse.json({ error: "Image and review links must be valid HTTPS URLs." }, { status: 400 });
    }
  }

  const { error } = await context.serviceClient
    .from("restaurants")
    .update({
      name,
      logo_url: logoUrl || null,
      wifi_ssid: wifiSsid,
      wifi_password: wifiPassword,
      google_review_url: googleReviewUrl || null,
      primary_color: primaryColor,
    })
    .eq("id", restaurantId);

  if (error) {
    console.error("Could not update restaurant settings:", error.message);
    return NextResponse.json({ error: "Could not save restaurant settings." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
