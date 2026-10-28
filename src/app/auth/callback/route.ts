import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function safeDestination(value: string | null) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value) ||
    value.startsWith("/auth/callback")
  ) {
    return "/admin";
  }
  return value;
}

export async function GET(request: NextRequest) {
  const destination = safeDestination(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (
      tokenHash &&
      (type === "signup" || type === "recovery" || type === "invite" || type === "email")
    ) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });
      if (error) throw error;
    } else {
      throw new Error("Verification link is incomplete.");
    }
    if (destination.split("?")[0] === "/auth/reset-password") {
      const cookieStore = await cookies();
      cookieStore.set("tabletap-password-reset", "1", {
        httpOnly: true,
        maxAge: 600,
        path: "/api/auth/update-password",
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
      });
    }
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    console.error("Auth callback failed:", error);
    const returnTo = destination === "/auth/reset-password"
      ? "/admin/login?error=reset"
      : "/admin/login?error=verification";
    return NextResponse.redirect(new URL(returnTo, request.url));
  }
}
