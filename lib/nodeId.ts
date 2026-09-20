/**
 * Node ID generation (§8 of phase-2-orders-and-checkout.md).
 *
 * Generated only after verified payment, in the format L8-NODE-XXXXXXXX,
 * from cryptographically secure randomness. Sequential IDs are not a
 * security mechanism -- this never increments a counter.
 */
import { randomBytes } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function generateNodeId(): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (const b of bytes) {
    suffix += ALPHABET[b % ALPHABET.length];
  }
  return `L8-NODE-${suffix}`;
}

export function isValidNodeId(id: string): boolean {
  return /^L8-NODE-[0-9A-Z]{8}$/.test(id);
}
