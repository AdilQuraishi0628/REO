import { scrypt, randomBytes, timingSafeEqual, randomInt } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

/**
 * Hashes a staff PIN using Node.js scrypt with a unique 16-byte random salt per restaurant.
 * Stored format: `scrypt:<saltHex>:<derivedKeyHex>`
 */
export async function hashStaffPin(pin: string): Promise<string> {
  const cleanPin = pin.trim();
  if (cleanPin.length < 4 || cleanPin.length > 8) {
    throw new Error("PIN must be between 4 and 8 digits.");
  }
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(cleanPin, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a candidate PIN against a stored hash using constant-time comparison.
 * If legacy plaintext PIN is passed as fallback, compares in constant time.
 * Never throws timing leaks.
 */
export async function verifyStaffPin(
  candidatePin: string,
  storedHash?: string | null,
  legacyPlaintext?: string | null,
): Promise<boolean> {
  const cleanCandidate = (candidatePin || "").trim();
  if (!cleanCandidate) return false;

  // 1. If scrypt hash is stored
  if (storedHash && storedHash.startsWith("scrypt:")) {
    const parts = storedHash.split(":");
    if (parts.length !== 3) return false;
    const [, salt, expectedKeyHex] = parts;
    const expectedBuf = Buffer.from(expectedKeyHex, "hex");
    if (expectedBuf.length !== 64) return false;

    try {
      const candidateKey = (await scryptAsync(cleanCandidate, salt, 64)) as Buffer;
      if (candidateKey.length !== expectedBuf.length) return false;
      return timingSafeEqual(candidateKey, expectedBuf);
    } catch {
      return false;
    }
  }

  // 2. Backward compatibility fallback before migration runs (if only legacy plaintext exists)
  if (legacyPlaintext && legacyPlaintext.trim()) {
    const expectedBuf = Buffer.from(legacyPlaintext.trim());
    const candidateBuf = Buffer.from(cleanCandidate);
    if (expectedBuf.length !== candidateBuf.length) return false;
    return timingSafeEqual(candidateBuf, expectedBuf);
  }

  return false;
}

/**
 * Generates a collision-resistant, cryptographically secure 6-digit random PIN.
 */
export function generateRandomStaffPin(): string {
  return randomInt(100000, 999999).toString();
}
