import type { NextConfig } from "next";

// Better Auth's login cookie (with the __Secure- prefix on https). Redirects below only check that it exists,
// so signed-out visitors go straight to sign in instead of seeing an empty page first. The pages still check the
// real session, so a stale cookie just lands on the page's own redirect.
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      // signed out: straight to sign in (and back), no page that can only say "sign in"
      ...["/u/me", "/settings", "/watchlist"].map((source) => ({
        source,
        missing: SESSION_COOKIES.map((key) => ({ type: "cookie" as const, key })),
        destination: `/login?next=${encodeURIComponent(source)}`,
        permanent: false,
      })),
    ];
  },
  partialPrefetching: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" }],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
