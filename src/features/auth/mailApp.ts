// Webmail for the common providers, so "Check your inbox" can open the right one. Anything else: no button.
const APPS: [RegExp, string, string][] = [
  [/^(gmail|googlemail)\.com$/, "Gmail", "https://mail.google.com/mail/u/0/#inbox"],
  [/^(outlook|hotmail|live|msn)\.[a-z.]+$/, "Outlook", "https://outlook.live.com/mail/"],
  [/^(icloud|me|mac)\.com$/, "iCloud Mail", "https://www.icloud.com/mail"],
  [/^(yahoo|ymail)\.[a-z.]+$/, "Yahoo Mail", "https://mail.yahoo.com/"],
  [/^gmx\.[a-z.]+$/, "GMX", "https://www.gmx.net/"],
  [/^web\.de$/, "WEB.DE", "https://web.de/"],
  [/^proton(mail)?\.(me|com)$/, "Proton Mail", "https://mail.proton.me/"],
];

/** The webmail to open for an address, or null when we don't know it. Pure. */
export function mailApp(email: string): { name: string; url: string } | null {
  const domain = email.split("@").pop()?.trim().toLowerCase() ?? "";
  const hit = APPS.find(([pattern]) => pattern.test(domain));
  return hit ? { name: hit[1], url: hit[2] } : null;
}
