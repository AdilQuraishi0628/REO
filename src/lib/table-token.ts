import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Development-only process-local key avoids ever shipping a predictable fallback.
const developmentSecret = randomBytes(32).toString("hex");

function getSecret(): string {
  const secret = process.env.TABLE_TOKEN_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV !== "production") return developmentSecret;
    throw new Error("TABLE_TOKEN_SIGNING_SECRET must be set to at least 32 characters.");
  }
  return secret;
}

/**
 * Creates a cryptographically signed token for a dining table QR code.
 * Format: `<timestampHex>.<hmacSignature>`
 */
export function generateTableToken(tableCode: string): string {
  const ts = Math.floor(Date.now() / 1000).toString(16);
  const payload = `${tableCode.trim().toLowerCase()}:${ts}`;
  const sig = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 32);
  return `${ts}.${sig}`;
}

/**
 * Verifies a table token for a given table code.
 * Tokens are bound to a table code and never accept the code itself as a credential.
 */
export function verifyTableToken(tableCode: string, token?: string | null): boolean {
  const cleanCode = (tableCode || "").trim().toLowerCase();
  if (!cleanCode) return false;

  if (process.env.TABLE_TOKEN_DEMO_BYPASS === "true" && process.env.NODE_ENV !== "production") {
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
  let expectedSig: string;
  try { expectedSig = createHmac("sha256", getSecret()).update(payload).digest("hex").slice(0, 32); } catch { return false; }

  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
