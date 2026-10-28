import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "verification-email", 3, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many verification requests. Please try again later."
            : "Verification email is temporarily unavailable.",
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
    typeof input === "object" && input !== null && "email" in input &&
    typeof input.email === "string"
      ? input.email.trim().toLowerCase()
      : "";
  if (!emailPattern.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      console.error("Verification email request failed:", error.message);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verification email request failed:", error);
    return NextResponse.json(
      { error: "Verification email is temporarily unavailable." },
      { status: 503 },
    );
  }
}
