import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
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
  role: "kitchen" | "staff";
  authenticatedAt: number;
  expiresAt?: number;
};
const developmentStaffSessionSecret = randomBytes(32).toString("hex");

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

function getStaffSessionSigningSecret(): string {
  const secret = process.env.STAFF_SESSION_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV !== "production") return developmentStaffSessionSecret;
    throw new Error("STAFF_SESSION_SIGNING_SECRET must be set to at least 32 characters.");
  }
  return secret;
}

export function signStaffSessionPayload(payload: StaffSession): string {
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf-8").toString("base64url");
  const secret = getStaffSessionSigningSecret();
  const signature = createHmac("sha256", secret).update(b64).digest("hex");
  return `${b64}.${signature}`;
}

export function verifySignedStaffSessionToken(token: string): StaffSession | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [b64, signature] = parts;
  let secret: string;
  try { secret = getStaffSessionSigningSecret(); } catch { return null; }
  const expectedSig = createHmac("sha256", secret).update(b64).digest("hex");
  const expectedBuf = Buffer.from(expectedSig);
  const candidateBuf = Buffer.from(signature);
  if (expectedBuf.length !== candidateBuf.length) return null;
  if (!timingSafeEqual(candidateBuf, expectedBuf)) return null;

  try {
    const rawJson = Buffer.from(b64, "base64url").toString("utf-8");
    const parsed = JSON.parse(rawJson);
    if (!parsed.expiresAt || !Number.isFinite(parsed.expiresAt) || Date.now() > parsed.expiresAt || parsed.expiresAt - parsed.authenticatedAt > 12 * 3600 * 1000) {
      return null;
    }
    if (parsed && typeof parsed.restaurantId === "string" && (parsed.role === "kitchen" || parsed.role === "staff")) {
      return parsed as StaffSession;
    }
  } catch {
    return null;
  }
  return null;
}

export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("tabletap_staff_session")?.value;
    if (!raw) return null;
    return verifySignedStaffSessionToken(raw);
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

