import { randomInt } from "node:crypto";

export const INVITE_DAYS = 7;
export const INVITE_USES = 5;

// No 0/o, 1/l/i: codes get read aloud and typed from screenshots.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** A fresh invite code: 10 characters, about 49 bits, so links can't be guessed. */
export function newInviteCode(length = 10) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** A friendship is stored once per pair, smaller id first. Pure. */
export function pair(x: string, y: string) {
  return x < y ? { a: x, b: y } : { a: y, b: x };
}

export type InviteState = "ok" | "expired" | "used" | "own";

/** Whether this person can accept this invite right now. Pure. */
export function inviteState(
  inv: { userId: string; expiresAt: Date; usesLeft: number },
  viewerId: string | null,
  now: Date,
): InviteState {
  if (viewerId === inv.userId) return "own";
  if (inv.expiresAt <= now) return "expired";
  if (inv.usesLeft <= 0) return "used";
  return "ok";
}
