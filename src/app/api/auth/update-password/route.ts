import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }
  const cookieStore = await cookies();
  if (cookieStore.get("tabletap-password-reset")?.value !== "1") {
    return NextResponse.json(
      { error: "Request a password reset link before choosing a new password." },
      { status: 403 },
    );
  }
  const rate = await consumeRateLimit(request, "password-update", 5, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many password changes. Please try again later."
            : "Password update is temporarily unavailable.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a valid new password." }, { status: 400 });
  }
  const password =
    typeof input === "object" && input !== null && "password" in input &&
    typeof input.password === "string"
      ? input.password
      : "";
  if (password.length < 12 || password.length > 256) {
    return NextResponse.json(
      { error: "Use a password with at least 12 characters." },
      { status: 400 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data: currentUser, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser.user) {
      return NextResponse.json(
        { error: "Your password reset link has expired. Request a new one and try again." },
        { status: 401 },
      );
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return NextResponse.json(
        { error: "This reset link may have expired. Request a new one and try again." },
        { status: 400 },
      );
    }
    cookieStore.delete("tabletap-password-reset");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password update failed:", error);
    return NextResponse.json(
      { error: "We couldn't update your password. Please try again." },
      { status: 503 },
    );
  }
}
