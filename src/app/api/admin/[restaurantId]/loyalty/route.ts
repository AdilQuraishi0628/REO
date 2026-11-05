import { NextResponse } from "next/server";
import {
  canManageRestaurant,
  getAdminContext,
  uuidPattern,
} from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{ restaurantId: string }>;
};

const demoMembers = [
  {
    id: "mem-1",
    full_name: "Rahul Sharma",
    email: "rahul@example.com",
    phone: "+91 98271 11223",
    stamps: 4,
    reward_goal: 5,
    created_at: new Date(Date.now() - 86400_000 * 3).toISOString(),
  },
  {
    id: "mem-2",
    full_name: "Pooja Verma",
    email: "pooja@example.com",
    phone: "+91 98271 44556",
    stamps: 2,
    reward_goal: 5,
    created_at: new Date(Date.now() - 86400_000 * 7).toISOString(),
  },
];

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    if (!uuidPattern.test(restaurantId)) {
      return NextResponse.json({ error: "Enter a valid restaurant ID." }, { status: 400 });
    }

    if (
      restaurantId.startsWith("00000000-0000-4000-8000-")
    ) {
      return NextResponse.json({ members: demoMembers, total: demoMembers.length, page: 0, pageSize: 50 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Loyalty service is not configured." }, { status: 503 });
    }

    const context = await getAdminContext();
    if (!context) {
      return NextResponse.json({ error: "Sign in to view loyalty members." }, { status: 401 });
    }

    if (!canManageRestaurant(context, restaurantId)) {
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
      console.error("Could not load loyalty members from Supabase:", error.message);
      return NextResponse.json({ error: "Could not load loyalty members." }, { status: 500 });
    }
    return NextResponse.json({ members: data ?? [], total: count ?? 0, page, pageSize });
  } catch (err: unknown) {
    console.error("GET /api/admin/[restaurantId]/loyalty error:", err);
    return NextResponse.json({ error: "Could not load loyalty members." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { restaurantId } = await params;

    if (!uuidPattern.test(restaurantId)) {
      return NextResponse.json({ error: "Enter a valid restaurant ID." }, { status: 400 });
    }

    if (
      restaurantId.startsWith("00000000-0000-4000-8000-")
    ) {
      return NextResponse.json({
        member: { id: "mem-demo", stamps: 5, reward_goal: 5 },
      });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Loyalty service is not configured." }, { status: 503 });
    }

    const context = await getAdminContext();
    if (!context) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
    if (!canManageRestaurant(context, restaurantId)) {
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
        ? ((body as Record<string, unknown>).memberId as string)
        : "";
    if (!uuidPattern.test(memberId)) {
      return NextResponse.json({ error: "Choose a valid loyalty member." }, { status: 400 });
    }

    // Try RPC first.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rpcData, error: rpcError } = await (context.serviceClient as any).rpc("admin_add_loyalty_stamp", {
      p_restaurant_id: restaurantId,
      p_member_id: memberId,
    });
    if (!rpcError && rpcData?.length) {
      return NextResponse.json({ member: rpcData[0] });
    }
    if (rpcError) {
      console.error("Could not award loyalty stamp through RPC:", rpcError.message);
    }

    const { data: currentMember, error: memberError } = await context.serviceClient
      .from("loyalty_members")
      .select("id, stamps, reward_goal")
      .eq("restaurant_id", restaurantId)
      .eq("id", memberId)
      .maybeSingle();

    if (memberError) {
      console.error("Could not load loyalty member for stamp award:", memberError.message);
      return NextResponse.json({ error: "Could not load this loyalty member." }, { status: 500 });
    }
    if (!currentMember) {
      return NextResponse.json({ error: "Member not found." }, { status: 404 });
    }

    const newStamps = (currentMember.stamps || 0) + 1;
    const { data: updatedMember, error: updateErr } = await context.serviceClient
      .from("loyalty_members")
      .update({ stamps: newStamps })
      .eq("restaurant_id", restaurantId)
      .eq("id", memberId)
      .select("id, stamps, reward_goal")
      .single();

    if (updateErr) {
      console.error("Could not update loyalty stamp:", updateErr.message);
      return NextResponse.json({ error: "Could not award a stamp to this member." }, { status: 500 });
    }

    return NextResponse.json({ member: updatedMember });
  } catch (err: unknown) {
    console.error("POST /api/admin/[restaurantId]/loyalty error:", err);
    return NextResponse.json({ error: "Could not award a loyalty stamp." }, { status: 500 });
  }
}
