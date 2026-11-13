import type { NextConfig } from "next";

// Better Auth's login cookie (with the __Secure- prefix on https). Redirects below only check that it exists,
// so signed-out visitors go straight to sign in instead of seeing an empty page first. The pages still check the
// real session, so a stale cookie just lands on the page's own redirect.
const SESSION_COOKIES = ["better-auth.session_token", "__Secure-better-auth.session_token"];

// One id per build. Next uses it for version skew (a navigation after a deploy reloads the page), and it's inlined into
// server and client code (lib/build.ts) so an open tab can tell a deploy happened (UpdateBar, /api/version).
const BUILD_ID = process.env.NEXT_DEPLOYMENT_ID ?? Date.now().toString(36);

const nextConfig: NextConfig = {
  deploymentId: BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // a self-contained server in .next/standalone, what the Docker image runs
  output: "standalone",
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
