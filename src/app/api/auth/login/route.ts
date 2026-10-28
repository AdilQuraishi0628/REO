import { NextResponse } from "next/server";
import { clearSupabaseAuthCookies, createSupabaseServerClient } from "@/lib/supabase-server";
import { consumeRateLimit } from "@/lib/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "login", 10, 900);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many sign-in attempts. Please wait a few minutes and try again."
            : "Sign-in is temporarily unavailable. Please try again later.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  if (typeof input !== "object" || input === null) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  const email = "email" in input && typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = "password" in input && typeof input.password === "string" ? input.password : "";
  if (!emailPattern.test(email) || email.length > 254 || !password || password.length > 256) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error && /confirm|verified/i.test(error.message)) {
      return NextResponse.json(
        { error: "Verify your email from the link we sent before signing in." },
        { status: 403 },
      );
    }
    if (error || !data.user) {
      return NextResponse.json(
        { error: "We couldn't sign you in. Check your email and password." },
        { status: 401 },
      );
    }
    if (!data.user.email_confirmed_at) {
      await supabase.auth.signOut({ scope: "local" });
      await clearSupabaseAuthCookies();
      return NextResponse.json(
        { error: "Verify your email from the link we sent before signing in." },
        { status: 403 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign-in service failed:", error);
    return NextResponse.json(
      { error: "Sign-in is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
