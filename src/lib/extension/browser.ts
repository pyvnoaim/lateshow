/**
 * Which browser a key belongs to, from its User-Agent ("Chrome on macOS"), so Settings › Extension can tell them apart.
 * Browsers built on Chrome (Brave, Helium, Arc) say Chrome, Zen says Firefox: their User-Agents are the same.
 */
export function browserName(ua: string | null | undefined): string | null {
  if (!ua) return null;
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : null;
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /CrOS/.test(ua)
        ? "ChromeOS"
        : /Mac OS X|Macintosh/.test(ua)
          ? "macOS"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux/.test(ua)
              ? "Linux"
              : null;
  if (!browser) return null;
  return os ? `${browser} on ${os}` : browser;
}
