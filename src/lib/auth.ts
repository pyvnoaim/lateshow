import "server-only";
import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
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
import { takeSendSlot } from "@/lib/sendLimit";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = env("auth");

export const LOGIN_CODE_MINUTES = CODE_MINUTES;

const SEND_PATH = "/email-otp/send-verification-otp";
const sendLog = new Map<string, number[]>();
// Better Auth swallows errors from sendVerificationOTP and answers success, so a failed mail is noted here
// and turned into an error after the route, or the sign-in screen would wait for a mail that never comes.
const failedSends = new Set<string>();
const emailOf = (body: unknown) =>
  String((body as { email?: unknown } | undefined)?.email ?? "")
    .trim()
    .toLowerCase();

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  baseURL: BETTER_AUTH_URL,
  // Behind Cloudflare + Nginx Proxy Manager X-Forwarded-For has several hops, which Better Auth won't guess from.
  // Without this every visitor shares one rate limit bucket (3 code requests a minute for the whole site).
  // ponytail: trusts cf-connecting-ip, fine while the origin is only reached through Cloudflare.
  advanced: { ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] } },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  // set only through our own action (setUsername), never from sign up
  user: {
    additionalFields: {
      username: { type: "string", required: false, input: false },
      shareActivity: { type: "boolean", required: false, defaultValue: true, input: false },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === SEND_PATH && !takeSendSlot(sendLog, emailOf(ctx.body), Date.now()))
        throw new APIError("TOO_MANY_REQUESTS", { message: "Too many codes for this address" });
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === SEND_PATH && failedSends.delete(emailOf(ctx.body)))
        throw new APIError("BAD_GATEWAY", { message: "The sign-in email didn't go out" });
    }),
  },
  plugins: [
    // Sign in with a 6 digit code by email: typed on the device you're signing in on (a link would sign in the
    // device that opens the mail). 10 minutes, 5 tries, stored hashed. New emails get an account on first sign-in.
    emailOTP({
      otpLength: 6,
      expiresIn: CODE_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 6 }, // per IP: a few typos must not lock out the right code
      // only sign-in codes exist here: other types would send a "sign-in" mail that works nowhere
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "sign-in") return;
        await sendCode(email, otp).catch((e: unknown) => {
          failedSends.add(email.toLowerCase());
          throw e; // still logged by Better Auth
        });
      },
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
