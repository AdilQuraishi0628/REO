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
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) {
    return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  }
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  const range = new URL(request.url).searchParams.get("range") ?? "7d";
  if (!["7d", "30d", "all"].includes(range)) {
    return NextResponse.json({ error: "Choose a valid analytics date range." }, { status: 400 });
  }
  const since = range === "all"
    ? null
    : new Date(Date.now() - (range === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await context.serviceClient.rpc("admin_analytics_summary", {
    p_restaurant_id: restaurantId,
    p_since: since,
  });
  if (error) {
    console.error("Could not load analytics summary:", error.message);
    return NextResponse.json(
      { error: "Could not load analytics. Run the latest database schema first." },
      { status: 500 },
    );
  }

  const summary = data?.[0];
  return NextResponse.json({
    range,
    totalScans: Number(summary?.total_scans ?? 0),
    loyaltyMembers: Number(summary?.loyalty_members ?? 0),
    feedbackTotal: Number(summary?.feedback_total ?? 0),
    averageRating: Number(summary?.average_rating ?? 0),
    reviewPrompts: Number(summary?.review_prompts ?? 0),
  });
}
