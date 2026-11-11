const BASE = "http://lateshow.invalid";

/**
 * Where to go after signing in. Only paths on this site: "/u/me?tab=watchlist" yes, "https://evil.com", "//evil.com"
 * and tricks like "/\t/evil.com" (browsers drop tabs and newlines, which turns it into "//evil.com") no.
 * Control characters and backslashes are rejected outright, then the path is resolved against a fixed origin and must
 * stay on it, so a crafted sign-in link can't send you somewhere else.
 */
export function safeNext(raw: string | string[] | undefined): string {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  if (!value.startsWith("/") || value.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(value)) return "/";
  const url = new URL(value, BASE);
  if (url.origin !== BASE) return "/";
  return url.pathname + url.search + url.hash;
}
