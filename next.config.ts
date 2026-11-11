import type { NextConfig } from "next";

// Better Auth's login cookie (with the __Secure- prefix on https). Redirects below only check that it exists,
// so signed-out visitors go straight to sign in instead of seeing an empty page first. The pages still check the
// real session, so a stale cookie just lands on the page's own redirect.
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];
const WATCHLIST = "/u/me?tab=watchlist";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return [
      // "Watchlist" in the top bar: straight to it when signed in, sign in first (and come back) when not
      ...SESSION_COOKIES.map((key) => ({
        source: "/watchlist",
        has: [{ type: "cookie" as const, key }],
        destination: WATCHLIST,
        permanent: false,
      })),
      { source: "/watchlist", destination: `/login?next=${encodeURIComponent(WATCHLIST)}`, permanent: false },
      {
        source: "/u/me",
        missing: SESSION_COOKIES.map((key) => ({ type: "cookie" as const, key })),
        destination: `/login?next=${encodeURIComponent("/u/me")}`,
        permanent: false,
      },
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
