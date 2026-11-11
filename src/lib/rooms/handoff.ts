import "server-only";
import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { session, user, verification } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { env } from "@/lib/env";

/**
 * "Continue on your phone": a link that, after you confirm on the phone, signs it into your session once.
 * It opens the /handoff page (a confirm step), never signs anyone in by just being opened.
 */
export async function handoffUrl(next: string) {
  const { token } = await auth.api.generateOneTimeToken({ headers: await headers() });
  const url = new URL("/handoff", env("auth").BETTER_AUTH_URL);
  url.searchParams.set("t", token);
  url.searchParams.set("next", next);
  return url.toString();
}

/**
 * Whose account a handoff token would sign in to, without using it up (so the phone can ask "Continue as @name?").
 * Mirrors Better Auth's one-time token storage: the token is kept as a SHA-256 hash, the row holds the session token.
 */
export async function handoffOwner(token: string) {
  if (!token || token.length > 200) return null;
  const hashed = createHash("sha256").update(token).digest("base64url");
  const [row] = await db
    .select({ username: user.username })
    .from(verification)
    .innerJoin(session, eq(session.token, verification.value))
    .innerJoin(user, eq(user.id, session.userId))
    .where(and(eq(verification.identifier, `one-time-token:${hashed}`), gt(verification.expiresAt, new Date())))
    .limit(1);
  return row?.username ?? null;
}

/** Uses a handoff token: sets the session cookie on this device. False when it's used up, expired or made up. */
export async function redeemHandoff(token: string) {
  try {
    await auth.api.verifyOneTimeToken({ body: { token }, headers: await headers() });
    return true;
  } catch {
    return false;
  }
}
