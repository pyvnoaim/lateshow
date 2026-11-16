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
import { refundSendSlot, takeSendSlot } from "@/lib/sendLimit";

const { BETTER_AUTH_SECRET, BETTER_AUTH_URL } = env("auth");

export const LOGIN_CODE_MINUTES = CODE_MINUTES;

const SEND_PATH = "/email-otp/send-verification-otp";
const CHANGE_PATH = "/email-otp/request-email-change";
const sendLog = new Map<string, number[]>();
// Better Auth swallows errors from sendVerificationOTP and answers success, so a failed mail is noted here
// and turned into an error after the route, or the sign-in screen would wait for a mail that never comes.
// ponytail: keyed by address, not by request, so two overlapping sends to one address can swap their outcome.
// Rare (both limits apply). Also relies on Better Auth awaiting the send: never set advanced.backgroundTasks.
const failedSends = new Set<string>();
const newEmail = (body: unknown) => {
  const e = (body as { newEmail?: unknown } | undefined)?.newEmail;
  return typeof e === "string" ? e.toLowerCase() : null;
};
/** The address exactly as Better Auth keys it (lowercased, not trimmed), only for a real sign-in code request. */
function signInEmail(body: unknown) {
  const b = body as { email?: unknown; type?: unknown } | undefined;
  return b?.type === "sign-in" && typeof b.email === "string" ? b.email.toLowerCase() : null;
}

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
      // the change-email code goes to an address you type, so it shares the per-address limit of sign-in codes
      const email =
        ctx.path === SEND_PATH ? signInEmail(ctx.body) : ctx.path === CHANGE_PATH ? newEmail(ctx.body) : null;
      if (email && !takeSendSlot(sendLog, email, Date.now()))
        throw new APIError("TOO_MANY_REQUESTS", { message: "Too many codes for this address" });
    }),
    after: createAuthMiddleware(async (ctx) => {
      const email = ctx.path === SEND_PATH ? signInEmail(ctx.body) : null;
      if (email && failedSends.delete(email))
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
      // Settings › Email: a code to the new address proves it's yours, then it's the one codes go to.
      // ponytail: your current address isn't asked (verifyCurrentEmail), a signed-in session is enough here
      changeEmail: { enabled: true },
      // sign-in and change-email codes only: other types would send a mail that works nowhere
      sendVerificationOTP: async ({ email, otp, type }, ctx) => {
        if (type === "change-email") return sendCode(email, otp, "change-email");
        if (type !== "sign-in") return;
        await sendCode(email, otp).catch(async (e: unknown) => {
          // note the failure first, so a failing delete can't turn it into a silent success
          failedSends.add(email.toLowerCase());
          // the slot comes back only because the code dies with the mail: no free codes (and guesses) in an outage.
          // Better Auth keeps one code per address (a new send deletes the old), so this only removes this one.
          const deleted = await ctx?.context.internalAdapter
            .deleteVerificationByIdentifier(`sign-in-otp-${email.toLowerCase()}`)
            .then(() => true)
            .catch(() => false);
          if (deleted) refundSendSlot(sendLog, email);
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
