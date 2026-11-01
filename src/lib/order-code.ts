import { randomInt } from "crypto";

const ORDER_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude I, O

/**
 * Generates a collision-safe readable short order code, e.g. #A1042.
 */
export function generateOrderCode(): string {
  const letter = ORDER_CODE_LETTERS[randomInt(0, ORDER_CODE_LETTERS.length)];
  const num = randomInt(1000, 9999);
  return `#${letter}${num}`;
}
