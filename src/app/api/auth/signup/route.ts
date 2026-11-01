import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clearSupabaseAuthCookies, createSupabaseServerClient } from "@/lib/supabase-server";
import { consumeRateLimit } from "@/lib/rate-limit";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const rate = await consumeRateLimit(request, "signup", 10, 3600);
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      // Directly create pre-confirmed user so they can immediately launch without email delays
      const { data: adminData, error: adminError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (adminError) {
        if (/already registered|already exists/i.test(adminError.message)) {
          // If already registered, try signing in with the provided password
          const supabase = await createSupabaseServerClient();
          const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInError) {
            return NextResponse.json({ verified: true, success: true }, { status: 200 });
          }
          return NextResponse.json(
            { error: "An account with this email already exists. Please sign in." },
            { status: 400 },
          );
        }
        console.error("Supabase admin creation failed:", adminError.message);
        return NextResponse.json(
          { error: adminError.message || "We couldn't create your account. Please check the details." },
          { status: 400 },
        );
      }

      // Establish session cookies on the response for immediate access to onboarding
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signInWithPassword({ email, password });

      return NextResponse.json({ verified: true, success: true }, { status: 201 });
    }

    // Fallback if service role key is not configured
    const supabase = await createSupabaseServerClient();
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
    });
    if (error) {
      if (/already registered|already exists/i.test(error.message)) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { error: "We couldn't create your account. Check the details and try again." },
        { status: 400 },
      );
    }
    return NextResponse.json({ verified: Boolean(data.session), success: true }, { status: 201 });
  } catch (error) {
    console.error("Account creation failed:", error);
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
