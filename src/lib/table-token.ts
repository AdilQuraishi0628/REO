import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET =
  process.env.TABLE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.JWT_SECRET ||
  "tabletap-table-session-secret-key-raipur-2026";

/**
 * Creates a cryptographically signed token for a dining table QR code.
 * Format: `<timestampHex>.<hmacSignature>`
 */
export function generateTableToken(tableCode: string): string {
  const ts = Math.floor(Date.now() / 1000).toString(16);
  const payload = `${tableCode.trim().toLowerCase()}:${ts}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);
  return `${ts}.${sig}`;
}

/**
 * Verifies a table token for a given table code.
 * Demo table codes (starting with "demo-" or "table") always pass verification
 * to keep public test links working.
 */
export function verifyTableToken(tableCode: string, token?: string | null): boolean {
  const cleanCode = (tableCode || "").trim().toLowerCase();
  if (!cleanCode) return false;

  // Keep demo URLs working smoothly without requiring active signed tokens
  if (cleanCode.startsWith("demo-") || cleanCode.startsWith("table")) {
    return true;
  }

  if (!token || typeof token !== "string") return false;

  const parts = token.trim().split(".");
  if (parts.length !== 2) return false;
  const [ts, sig] = parts;
  if (!ts || !sig || sig.length !== 32) return false;

  // Max validity: 72 hours for printed table stand QRs
  const tokenTime = parseInt(ts, 16);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(tokenTime) || now - tokenTime > 72 * 3600 || tokenTime > now + 3600) {
    return false;
  }

  const payload = `${cleanCode}:${ts}`;
  const expectedSig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
