import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSignedInUser } from "@/lib/admin-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { clearSupabaseAuthCookies } from "@/lib/supabase-server";

export async function DELETE(request: Request) {
  const user = await getSignedInUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in again to delete your account." }, { status: 401 });
  }

  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  const rate = await consumeRateLimit(request, "account-delete", 3, 3600);
  if (rate !== "allowed") {
    return NextResponse.json(
      {
        error:
          rate === "limited"
            ? "Too many account deletion attempts. Please try again later."
            : "Account deletion is temporarily unavailable.",
      },
      { status: rate === "limited" ? 429 : 503 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Confirm the deletion and enter your password." }, { status: 400 });
  }
  const password =
    typeof input === "object" && input !== null && "password" in input &&
    typeof input.password === "string"
      ? input.password
      : "";
  const confirmation =
    typeof input === "object" && input !== null && "confirmation" in input &&
    typeof input.confirmation === "string"
      ? input.confirmation
      : "";
  if (!password || password.length > 256 || confirmation !== "DELETE") {
    return NextResponse.json(
      { error: "Enter your password and type DELETE to confirm." },
      { status: 400 },
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceRoleKey) {
    return NextResponse.json({ error: "Account deletion is not configured." }, { status: 503 });
  }

  const verifier = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: passwordError } = await verifier.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (passwordError) {
    return NextResponse.json({ error: "The password you entered is incorrect." }, { status: 403 });
  }

  const service = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: memberships, error: membershipError } = await service
    .from("restaurant_admins")
    .select("restaurant_id")
    .eq("user_id", user.id);
  if (membershipError) {
    console.error("Could not prepare account deletion:", membershipError.message);
    return NextResponse.json({ error: "We couldn't safely delete the account. Please try again." }, { status: 503 });
  }

  const orphanRestaurantIds: string[] = [];
  for (const membership of memberships ?? []) {
    const { count, error } = await service
      .from("restaurant_admins")
      .select("user_id", { count: "exact", head: true })
      .eq("restaurant_id", membership.restaurant_id)
      .neq("user_id", user.id);
    if (error) {
      console.error("Could not verify restaurant ownership for account deletion:", error.message);
      return NextResponse.json(
        { error: "We couldn't safely verify restaurant access. Please try again." },
        { status: 503 },
      );
    }
    if (count === 0) orphanRestaurantIds.push(membership.restaurant_id);
  }

  const { error: deleteUserError } = await service.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error("Could not delete authenticated user:", deleteUserError.message);
    return NextResponse.json({ error: "We couldn't delete your account. Please try again." }, { status: 503 });
  }

  if (orphanRestaurantIds.length) {
    const { error } = await service
      .from("restaurants")
      .delete()
      .in("id", orphanRestaurantIds);
    if (error) {
      console.error("Account was deleted, but cleanup of sole-admin restaurants failed:", error.message);
      return NextResponse.json(
        { error: "Your account was deleted, but some restaurant data needs administrator cleanup." },
        { status: 500 },
      );
    }
  }

  await clearSupabaseAuthCookies();
  return NextResponse.json({ success: true });
}
