import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

const demoFeedback = [
  {
    id: "fb-1",
    rating: 5,
    comment: "Loved the ambience and fast table ordering! Google review submitted.",
    guest_name: "Aman Agrawal",
    phone: "+91 98271 22334",
    contact: "+91 98271 22334",
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
    phone: "+91 98271 33445",
    contact: "+91 98271 33445",
    table_label: "Table 2",
    review_prompted: true,
    resolved_at: null,
    created_at: new Date(Date.now() - 7200_000).toISOString(),
  },
];

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    // 1. Demo mode fallback
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      restaurantId.startsWith("00000000-0000-4000-8000-")
    ) {
      return NextResponse.json({
        entries: demoFeedback,
        total: demoFeedback.length,
        page: 0,
        pageSize: 50,
      });
    }

    const context = await getAdminContext();
    if (!context) {
      return NextResponse.json({
        entries: demoFeedback,
        total: demoFeedback.length,
        page: 0,
        pageSize: 50,
      });
    }

    if (!uuidPattern.test(restaurantId) || !canManageRestaurant(context, restaurantId)) {
      return NextResponse.json({ error: "You don't have access to this restaurant." }, { status: 403 });
    }

    const search = new URL(request.url).searchParams;
    const filter = search.get("filter") ?? "all";
    const page = Number(search.get("page") ?? "0");
    if (!["all", "unresolved", "high", "low"].includes(filter) || !Number.isInteger(page) || page < 0 || page > 10000) {
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
      console.warn("Could not load feedback list from Supabase:", error.message);
      return NextResponse.json({ entries: [], total: 0, page, pageSize });
    }
    return NextResponse.json({ entries: data ?? [], total: count ?? 0, page, pageSize });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not load feedback.";
    console.error("GET /api/admin/[restaurantId]/feedback error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY ||
      restaurantId.startsWith("00000000-0000-4000-8000-")
    ) {
      return NextResponse.json({ success: true });
    }

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
      return NextResponse.json({ error: error.message || "Could not update feedback status." }, { status: 400 });
    }
    if (!data) return NextResponse.json({ error: "Feedback entry not found." }, { status: 404 });
    return NextResponse.json({ feedback: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not update feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
