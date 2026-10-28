import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { consumeRateLimit } from "@/lib/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "password-reset", 3, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many reset requests. Please wait before trying again."
            : "Password reset is temporarily unavailable.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const email =
    typeof input === "object" && input !== null && "email" in input && typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";
  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/reset-password`,
    });
    if (error) {
      console.error("Password reset email could not be sent:", error.message);
      return NextResponse.json(
        { error: "We couldn't send a reset link right now. Please try again later." },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json(
      { error: "Password reset is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
