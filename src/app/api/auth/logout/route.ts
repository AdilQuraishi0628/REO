import { NextResponse } from "next/server";
import { clearSupabaseAuthCookies, createSupabaseServerClient } from "@/lib/supabase-server";
import { clearStaffSession } from "@/lib/admin-auth";

export async function POST() {
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const supabase = await createSupabaseServerClient();
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("Supabase sign out warning:", e);
      }
      await clearSupabaseAuthCookies();
    }
    await clearStaffSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign-out failed:", error);
    await clearStaffSession();
    return NextResponse.json({ success: true });
  }
}
