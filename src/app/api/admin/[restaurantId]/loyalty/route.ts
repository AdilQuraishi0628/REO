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
  const page = Number(search.get("page") ?? "0");
  if (!Number.isInteger(page) || page < 0 || page > 10000) {
    return NextResponse.json({ error: "Choose a valid member page." }, { status: 400 });
  }
  const pageSize = 50;
  const phoneSearch = search.get("search")?.trim() ?? "";
  const searchDigits = phoneSearch.replace(/\D/g, "");
  if (phoneSearch.length > 32 || (phoneSearch && (!searchDigits || searchDigits.length > 15))) {
    return NextResponse.json({ error: "Enter a valid phone number to search." }, { status: 400 });
  }

  let query = context.serviceClient
    .from("loyalty_members")
    .select("id, full_name, email, phone, stamps, reward_goal, created_at", { count: "exact" })
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (searchDigits) query = query.ilike("phone", `%${searchDigits}%`);

  const { data, count, error } = await query.range(page * pageSize, page * pageSize + pageSize - 1);

  if (error) {
    console.error("Could not load loyalty members:", error.message);
    return NextResponse.json({ error: "Could not load loyalty members." }, { status: 500 });
  }
  return NextResponse.json({ members: data ?? [], total: count ?? 0, page, pageSize });
}

export async function POST(request: Request, { params }: RouteContext) {
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
    return NextResponse.json({ error: "Choose a valid loyalty member." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Choose a valid loyalty member." }, { status: 400 });
  }
  const memberId =
    typeof (body as Record<string, unknown>).memberId === "string"
      ? (body as Record<string, unknown>).memberId as string
      : "";
  if (!uuidPattern.test(memberId)) {
    return NextResponse.json({ error: "Choose a valid loyalty member." }, { status: 400 });
  }

  const { data, error } = await context.serviceClient.rpc("admin_add_loyalty_stamp", {
    p_restaurant_id: restaurantId,
    p_member_id: memberId,
  });
  if (error) {
    console.error("Could not award loyalty stamp:", error.message);
    return NextResponse.json(
      { error: "Could not add a stamp. Run the latest database schema first." },
      { status: 500 },
    );
  }
  if (!data?.length) {
    return NextResponse.json(
      { error: "Member not found or already at the reward goal." },
      { status: 409 },
    );
  }
  return NextResponse.json({ member: data[0] });
}
