import { NextResponse } from "next/server";
import { clearSupabaseAuthCookies, createSupabaseServerClient } from "@/lib/supabase-server";
import { consumeRateLimit } from "@/lib/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "signup", 5, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many account requests. Please try again later."
            : "Account creation is temporarily unavailable.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Check the details and try again." }, { status: 400 });
  }
  if (typeof input !== "object" || input === null) {
    return NextResponse.json({ error: "Check the details and try again." }, { status: 400 });
  }
  const email = "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = "password" in input && typeof input.password === "string" ? input.password : "";
  if (!emailPattern.test(email) || email.length > 254 || password.length < 12 || password.length > 256) {
    return NextResponse.json(
      { error: "Enter a valid email and a password with at least 12 characters." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        return NextResponse.json({ verified: false }, { status: 201 });
      }
      console.error("Supabase rejected account creation:", error.message);
      return NextResponse.json(
        { error: "We couldn't create your account. Check the details and try again." },
        { status: 400 },
      );
    }
    if (data.session) {
      await supabase.auth.signOut({ scope: "local" });
      await clearSupabaseAuthCookies();
      return NextResponse.json(
        { error: "Email verification is required. Ask the account administrator to enable email confirmations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ verified: false }, { status: 201 });
  } catch (error) {
    console.error("Account creation failed:", error);
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
