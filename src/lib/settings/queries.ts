import "server-only";
import { getAuthenticatorName } from "@better-auth/passkey";
import { desc, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { passkey } from "@/lib/db/auth-schema";
import { userServices } from "@/lib/db/schema";
import { getRecentTitles } from "@/lib/library/queries";
import { getTitle } from "@/lib/tmdb";

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

/** Cookie for the spoiler guard: "hide" keeps names of episodes you haven't watched out of sight. */
export const SPOILER_COOKIE = "spoilers";

/** True when episode titles of unwatched episodes should stay hidden. */
export const getSpoilerGuard = cache(async () => (await cookies()).get(SPOILER_COOKIE)?.value === "hide");

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

/**
 * Faces to pick a profile picture from: the main cast of what you watched lately, newest first, one per person.
 * ponytail: up to 12 titles (TMDB title calls are cached for days). Add a people search if someone misses theirs.
 */
export async function getAvatarFaces(userId: string, lang: string) {
  const titles = await getRecentTitles(userId, 12);
  const details = await Promise.all(titles.map((t) => getTitle(t.mediaType, String(t.tmdbId), lang).catch(() => null)));
  const seen = new Set<number>();
  const faces: { id: number; name: string; character: string; path: string; title: string }[] = [];
  for (const d of details) {
    for (const c of d?.credits.cast.slice(0, 6) ?? []) {
      if (!c.profile_path || seen.has(c.id) || faces.length >= 36) continue;
      seen.add(c.id);
      faces.push({
        id: c.id,
        name: c.name,
        character: c.character,
        path: c.profile_path,
        title: d!.title ?? d!.name ?? "",
      });
    }
  }
  return faces;
}
