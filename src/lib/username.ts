/** Usernames: lowercase letters, numbers and _, 3 to 20 long. Stored lowercase, so "Leon" and "leon" are one name. */
const PATTERN = /^[a-z0-9_]{3,20}$/;

// Paths and words that must never be someone's profile URL (/u/me forwards to your own profile).
const RESERVED = new Set([
  "me",
  "admin",
  "settings",
  "login",
  "lateshow",
  "support",
  "help",
  "api",
  "invite",
  "friends",
]);

/** The cleaned username, or the reason it can't be used. Pure, works in the browser and on the server. */
export function checkUsername(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim().replace(/^@/, "").toLowerCase();
  if (value.length < 3) return { ok: false, error: "At least 3 characters." };
  if (value.length > 20) return { ok: false, error: "20 characters at most." };
  if (!PATTERN.test(value)) return { ok: false, error: "Only letters, numbers and _." };
  if (RESERVED.has(value)) return { ok: false, error: "That one is taken." };
  return { ok: true, value };
}

/** The name everyone sees: your username, or the start of your email until you pick one. */
export const shownName = (u: { username?: string | null; email: string }) => u.username || u.email.split("@")[0];
