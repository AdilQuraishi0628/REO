import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
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

export async function getSignedInUser() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email_confirmed_at) return null;
  return data.user;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const [user, url, serviceRoleKey] = [
    await getSignedInUser(),
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ];
  if (!user || !url || !serviceRoleKey) return null;

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
}

export function canManageRestaurant(
  context: AdminContext,
  restaurantId: string,
) {
  return context.restaurantIds.includes(restaurantId);
}

export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
