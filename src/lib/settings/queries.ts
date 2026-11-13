import "server-only";
import { getAuthenticatorName } from "@better-auth/passkey";
import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { passkey } from "@/lib/db/auth-schema";
import { userServices } from "@/lib/db/schema";

/** TMDB provider ids of the services the signed in user pays for. Empty when signed out or none picked. */
export const getMyServiceIds = cache(async (): Promise<number[]> => {
  const session = await getSession();
  if (!session) return [];
  const rows = await db
    .select({ id: userServices.providerId })
    .from(userServices)
    .where(eq(userServices.userId, session.user.id));
  return rows.map((r) => r.id);
});

/** Your passkeys for Settings, named by what holds them ("iCloud Keychain", "Google Password Manager"). */
export async function getMyPasskeys() {
  const session = await getSession();
  if (!session) return [];
  const rows = await db
    .select()
    .from(passkey)
    .where(eq(passkey.userId, session.user.id))
    .orderBy(desc(passkey.createdAt));
  return rows.map((p) => ({
    id: p.id,
    name: p.name || getAuthenticatorName(p.aaguid) || "Passkey",
    createdAt: p.createdAt,
  }));
}
