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
  if (!context) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  const search = new URL(request.url).searchParams;
  const filter = search.get("filter") ?? "all";
  const page = Number(search.get("page") ?? "0");
  if (!["all", "unresolved", "high", "low"].includes(filter) ||
      !Number.isInteger(page) || page < 0 || page > 10000) {
    return NextResponse.json({ error: "Choose a valid feedback filter." }, { status: 400 });
  }

  let query = context.serviceClient
    .from("feedback")
    .select("id, rating, comment, guest_name, phone, contact, table_label, review_prompted, resolved_at, created_at", { count: "exact" })
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (filter === "unresolved") query = query.is("resolved_at", null);
  if (filter === "high") query = query.gte("rating", 4);
  if (filter === "low") query = query.lte("rating", 3);

  const pageSize = 50;
  const { data, count, error } = await query.range(page * pageSize, page * pageSize + pageSize - 1);
  if (error) {
    console.error("Could not load feedback list:", error.message);
    return NextResponse.json({ error: "Could not load guest feedback." }, { status: 500 });
  }
  return NextResponse.json({ entries: data ?? [], total: count ?? 0, page, pageSize });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { restaurantId } = await params;
  const context = await getAdminContext();
  if (!context) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
    return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Submit valid feedback status." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Submit valid feedback status." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const feedbackId = typeof input.feedbackId === "string" ? input.feedbackId : "";
  if (!uuidPattern.test(feedbackId) || typeof input.resolved !== "boolean") {
    return NextResponse.json({ error: "Choose a valid feedback status." }, { status: 400 });
  }

  const { data, error } = await context.serviceClient
    .from("feedback")
    .update({ resolved_at: input.resolved ? new Date().toISOString() : null })
    .eq("restaurant_id", restaurantId)
    .eq("id", feedbackId)
    .select("id, resolved_at")
    .maybeSingle();
  if (error) {
    console.error("Could not update feedback status:", error.message);
    return NextResponse.json({ error: "Could not update feedback status." }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Feedback entry not found." }, { status: 404 });
  return NextResponse.json({ feedback: data });
}
