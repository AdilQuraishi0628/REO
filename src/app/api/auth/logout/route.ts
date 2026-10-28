import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign-out failed:", error);
    return NextResponse.json(
      { error: "We couldn't sign you out. Please try again." },
      { status: 503 },
    );
  }
}
