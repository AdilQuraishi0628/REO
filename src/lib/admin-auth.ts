import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export type AdminRestaurant = {
  id: string;
  slug: string;
  name: string;
};

export type AdminContext = {
  user: User;
  restaurantIds: string[];
  serviceClient: SupabaseClient<Database>;
};

export type StaffSession = {
  restaurantId: string;
  restaurantName: string;
  role: "kitchen";
  authenticatedAt: number;
};

export async function getSignedInUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const [user, url, serviceRoleKey] = [
    await getSignedInUser(),
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ];
  if (!user || !url || !serviceRoleKey) return null;

  try {
    const serviceClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await serviceClient
      .from("restaurant_admins")
      .select("restaurant_id")
      .eq("user_id", user.id);

    if (error) {
      console.error("Could not load admin restaurant access:", error.message);
      return null;
    }

    return {
      user,
      restaurantIds: (data ?? []).map((row) => row.restaurant_id),
      serviceClient,
    };
  } catch (err) {
    console.error("Error creating admin context:", err);
    return null;
  }
}

export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("tabletap_staff_session")?.value;
    if (!raw) return null;
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (parsed && typeof parsed.restaurantId === "string" && parsed.role === "kitchen") {
      return parsed as StaffSession;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearStaffSession() {
  try {
    const cookieStore = await cookies();
    cookieStore.set("tabletap_staff_session", "", {
      expires: new Date(0),
      maxAge: 0,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } catch {
    // In serverless contexts where cookies cannot be written
  }
}

export function canManageRestaurant(
  context: AdminContext,
  restaurantId: string,
) {
  return context.restaurantIds.includes(restaurantId);
}

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

