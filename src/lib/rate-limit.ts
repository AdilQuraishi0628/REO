import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

export type RateLimitResult = "allowed" | "limited" | "unavailable";

export async function consumeRateLimit(
  request: Request,
  bucket: string,
  maxAttempts: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return "unavailable";

  const forwardedIp =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const addressHash = createHash("sha256").update(forwardedIp).digest("hex");
  const key = `${bucket}:${addressHash}`;
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key: key,
    p_max_attempts: maxAttempts,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("Rate limit check failed:", error.message);
    return "unavailable";
  }
  return data ? "allowed" : "limited";
}
