import { randomInt } from "node:crypto";

const SAFE_CHARS = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

/**
 * Generates a collision-safe, readable reservation reference code, e.g. "RES-8K2M9".
 * Omits ambiguous characters (0, O, 1, I).
 */
export function generateReservationReferenceCode(prefix = "RES"): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += SAFE_CHARS[randomInt(0, SAFE_CHARS.length)];
  }
  return `${prefix}-${code}`;
}
