import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    // If email is not confirmed, auto-confirm it using service role key and retry
    if (error || (data?.user && !data.user.email_confirmed_at)) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && serviceRoleKey) {
        try {
          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: usersData } = await adminClient.auth.admin.listUsers();
          const targetUser = usersData?.users.find((u) => u.email?.toLowerCase() === email);
          if (targetUser && !targetUser.email_confirmed_at) {
            await adminClient.auth.admin.updateUserById(targetUser.id, { email_confirm: true });
            const retry = await supabase.auth.signInWithPassword({ email, password });
            data = retry.data;
            error = retry.error;
          }
        } catch (confirmError) {
          console.warn("Auto-confirmation during sign-in failed:", confirmError);
        }
      }
    }

    if (error || !data?.user) {
      return NextResponse.json(
        { error: "We couldn't sign you in. Check your email and password." },
        { status: 401 },
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
