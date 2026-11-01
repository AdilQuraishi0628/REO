import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;
    const range = new URL(request.url).searchParams.get("range") ?? "7d";
    if (!["7d", "30d", "all"].includes(range)) {
      return NextResponse.json({ error: "Choose a valid analytics date range." }, { status: 400 });
    }

    // 1. Demo mode fallback
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      restaurantId.startsWith("00000000-0000-4000-8000-")
    ) {
      return NextResponse.json({
        range,
        totalScans: range === "30d" ? 1420 : 384,
        loyaltyMembers: 142,
        feedbackTotal: 24,
        averageRating: 4.8,
        reviewPrompts: 18,
      });
    }

    const context = await getAdminContext();
    if (!context) {
      return NextResponse.json({
        range,
        totalScans: 384,
        loyaltyMembers: 142,
        feedbackTotal: 24,
        averageRating: 4.8,
        reviewPrompts: 18,
      });
    }

    if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
      return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
    }

    const since =
      range === "all"
        ? null
        : new Date(Date.now() - (range === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString();

    // 2. Try RPC first
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (context.serviceClient as any).rpc("admin_analytics_summary", {
        p_restaurant_id: restaurantId,
        p_since: since,
      });
      if (!error && data?.[0]) {
        const summary = data[0];
        return NextResponse.json({
          range,
          totalScans: Number(summary?.total_scans ?? 0),
          loyaltyMembers: Number(summary?.loyalty_members ?? 0),
          feedbackTotal: Number(summary?.feedback_total ?? 0),
          averageRating: Number(summary?.average_rating ?? 0),
          reviewPrompts: Number(summary?.review_prompts ?? 0),
        });
      }
    } catch {
      // RPC may not exist, fallback to direct counts
    }

    // 3. Fallback direct table queries
    const [scansRes, membersRes, feedbackRes] = await Promise.all([
      context.serviceClient
        .from("restaurant_page_views")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
      context.serviceClient
        .from("loyalty_members")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId),
      context.serviceClient
        .from("feedback")
        .select("rating")
        .eq("restaurant_id", restaurantId),
    ]);

    const feedbackList = (feedbackRes.data ?? []) as { rating?: number }[];
    const avgRating = feedbackList.length
      ? Number((feedbackList.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbackList.length).toFixed(1))
      : 5.0;

    return NextResponse.json({
      range,
      totalScans: scansRes.count ?? 0,
      loyaltyMembers: membersRes.count ?? 0,
      feedbackTotal: feedbackList.length,
      averageRating: avgRating,
      reviewPrompts: feedbackList.filter((f) => (f.rating || 0) >= 4).length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Could not load analytics.";
    console.error("GET /api/admin/[restaurantId]/analytics error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
