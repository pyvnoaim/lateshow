export type PasskeyLabel = "Touch ID" | "Face ID" | "your passkey";

/**
 * What this device calls its passkey prompt: Touch ID on a Mac, Face ID on iPhone and iPad, the generic name
 * elsewhere. iPadOS Safari says "Macintosh", so a touchscreen is what tells an iPad from a Mac. Pure.
 * ponytail: guesses from the device family. Touch ID iPads and Macs without a Touch ID key get the wrong name,
 * the browser's own prompt still shows the right one.
 */
export function passkeyLabel(userAgent: string, maxTouchPoints: number): PasskeyLabel {
  if (/iPhone|iPad/.test(userAgent)) return "Face ID";
  if (/Macintosh/.test(userAgent)) return maxTouchPoints > 1 ? "Face ID" : "Touch ID";
  return "your passkey";
}
