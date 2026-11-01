import { NextResponse } from "next/server";
import { demoRestaurants } from "@/lib/restaurant-data";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && anonKey) {
    try {
      const supabase = createClient(supabaseUrl, anonKey);
      const { data, error } = await supabase
        .from("restaurants")
        .select("id, name, slug, address, city")
        .eq("is_published", true)
        .order("name");
      if (!error && data && data.length > 0) {
        return NextResponse.json({ restaurants: data });
      }
    } catch (e) {
      console.warn("Could not load restaurants from supabase:", e);
    }
  }

  // Fallback / demo restaurants list
  const list = Object.values(demoRestaurants).map((d) => ({
    id: d.restaurant.id,
    name: d.restaurant.name,
    slug: d.restaurant.slug,
    address: d.restaurant.address,
    city: d.restaurant.city,
  }));
  return NextResponse.json({ restaurants: list });
}
