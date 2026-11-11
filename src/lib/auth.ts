import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { emailOTP } from "better-auth/plugins/email-otp";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import * as schema from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";
import { CODE_MINUTES, sendCode } from "@/lib/mail";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = env("auth");

export const LOGIN_CODE_MINUTES = CODE_MINUTES;

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  // set only through our own action (setUsername), never from sign up
  user: {
    additionalFields: {
      username: { type: "string", required: false, input: false },
      shareActivity: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },
  plugins: [
    // Sign in with a 6 digit code by email: typed on the device you're signing in on (a link would sign in the
    // device that opens the mail). 10 minutes, 5 tries, stored hashed. New emails get an account on first sign-in.
    emailOTP({
      otpLength: 6,
      expiresIn: CODE_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      sendVerificationOTP: async ({ email, otp }) => sendCode(email, otp),
    }),
    // Face ID / Touch ID / Windows Hello after the first sign-in, tied to this site's domain.
    passkey({ rpName: "Lateshow", rpID: new URL(BETTER_AUTH_URL).hostname }),
    // "Continue on your phone": a QR with a token that signs the phone into your session. Made only by the server,
    // works once, gone after 2 minutes, stored hashed.
    oneTimeToken({ expiresIn: 2, storeToken: "hashed", disableClientRequest: true }),
    nextCookies(), // must stay last
  ],
});

/** The signed in user for the current request, or null. */
// `cache` dedupes per request: Home has several sections that each ask for the session.
export const getSession = cache(async () => {
  await connection(); // per request: Better Auth reads the clock, which Next must not prerender
  return auth.api.getSession({ headers: await headers() });
});
