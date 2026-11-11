/**
 * Where to go after signing in. Only paths on this site: "/u/me?tab=watchlist" yes, "https://evil.com" and
 * "//evil.com" (protocol-relative) no, so a crafted sign-in link can't send you somewhere else.
 */
export function safeNext(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
