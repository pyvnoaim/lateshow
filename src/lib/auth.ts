import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import * as schema from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { env, isProduction } from "@/lib/env";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = env("auth");

export const LOGIN_LINK_MINUTES = 15;

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  plugins: [
    magicLink({ expiresIn: LOGIN_LINK_MINUTES * 60, storeToken: "hashed", sendMagicLink: sendLoginLink }),
    nextCookies(), // must stay last
  ],
});

/** The signed in user for the current request, or null. */
// `cache` dedupes per request: Home has several sections that each ask for the session.
export const getSession = cache(async () => {
  await connection(); // per request: Better Auth reads the clock, which Next must not prerender
  return auth.api.getSession({ headers: await headers() });
});

// ponytail: dev prints the link in the terminal. Real email (Resend) comes with deploying, before the first real account.
async function sendLoginLink({ email, url }: { email: string; url: string }) {
  if (isProduction) throw new Error("Login emails aren't set up yet (Resend).");
  console.log(`\n  Sign in link for ${email}\n  ${url}\n`);
}
