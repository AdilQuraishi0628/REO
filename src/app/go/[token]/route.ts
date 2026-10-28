import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    return NextResponse.json(
      { error: "This restaurant link is not configured yet." },
      { status: 503 },
    );
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("guest_links")
    .select("restaurant_id, table_label")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("Could not resolve guest link:", error.message);
    return NextResponse.json({ error: "Could not open this restaurant link." }, { status: 500 });
  }
  if (!data) return new Response("Guest link not found.", { status: 404 });

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("slug")
    .eq("id", data.restaurant_id)
    .eq("is_published", true)
    .maybeSingle();
  if (restaurantError) {
    console.error("Could not load guest link restaurant:", restaurantError.message);
    return NextResponse.json({ error: "Could not open this restaurant link." }, { status: 500 });
  }
  if (!restaurant) return new Response("Restaurant not found.", { status: 404 });

  const destination = new URL(`/${restaurant.slug}`, request.url);
  if (data.table_label) destination.searchParams.set("table", data.table_label);
  return NextResponse.redirect(destination);
}
