import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";

/** A link that signs another device (the phone scanning the QR) into your session once, then opens `next`. */
export async function handoffUrl(next: string) {
  const { token } = await auth.api.generateOneTimeToken({ headers: await headers() });
  const url = new URL("/api/handoff", env("auth").BETTER_AUTH_URL);
  url.searchParams.set("t", token);
  url.searchParams.set("next", next);
  return url.toString();
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
