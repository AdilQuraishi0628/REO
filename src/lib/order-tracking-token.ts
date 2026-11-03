import { createHmac, timingSafeEqual } from "node:crypto";

function secret() {
  const value = process.env.ORDER_TRACKING_SIGNING_SECRET || process.env.TABLE_TOKEN_SIGNING_SECRET;
  if (!value || value.length < 32) throw new Error("ORDER_TRACKING_SIGNING_SECRET must be set to at least 32 characters.");
  return value;
}

export function generateOrderTrackingToken(orderId: string): string {
  const expires = Math.floor(Date.now() / 1000) + 12 * 3600;
  const payload = `${orderId}:${expires}`;
  return `${expires.toString(16)}.${createHmac("sha256", secret()).update(payload).digest("hex")}`;
}

export function verifyOrderTrackingToken(orderId: string, token: string | null): boolean {
  if (!token) return false;
  const [expiresHex, signature] = token.split(".");
  const expires = Number.parseInt(expiresHex, 16);
  if (!expires || expires < Date.now() / 1000 || !/^[a-f0-9]{64}$/.test(signature || "")) return false;
  try {
    const expected = createHmac("sha256", secret()).update(`${orderId}:${expires}`).digest("hex");
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch { return false; }
}
