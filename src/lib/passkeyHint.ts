/**
 * Browser-only hints about passkeys on this device: it made one (sign-in shows "Welcome back" and one button), or
 * you said "Not now" (don't ask again here). Conveniences, never trusted for anything.
 */
export const HAS_PASSKEY = "lateshow:passkey";
export const NO_PASSKEY = "lateshow:passkey-no";

export function remember(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // private mode: we just ask again next time
  }
}

export function recall(key: string) {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}
