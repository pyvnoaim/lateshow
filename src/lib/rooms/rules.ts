import { randomInt } from "node:crypto";

export const ROOM_HOURS = 12;

// Read aloud across a sofa: capitals, no 0/O, 1/I/L.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/**
 * A room code: 4 characters, about 920,000 combinations. Rooms live 12 hours and only hold a game, so guessing one
 * gets you into a stranger's movie vote at worst.
 */
export function newRoomCode() {
  return Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

/** A code as typed ("k3x9 ", "K3X9") in its stored form, or null when it can't be one. Pure. */
export function cleanCode(raw: string) {
  const code = raw.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{4}$/.test(code) ? code : null;
}

/** A guest's name: trimmed, 1 to 20 characters, or null. Pure. */
export function cleanGuestName(raw: string) {
  const name = raw.trim().replace(/\s+/g, " ");
  return name.length >= 1 && name.length <= 20 ? name : null;
}
