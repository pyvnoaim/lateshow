import "server-only";
import { and, count, desc, eq, gt, gte, inArray, or } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { friendship, invite, plays, watched, watchlist } from "@/lib/db/schema";
import { groupByTitle } from "./activity";
import { pair } from "./rules";

export async function getFriendCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(friendship)
    .where(or(eq(friendship.a, userId), eq(friendship.b, userId)));
  return row?.n ?? 0;
}

/** When these two became friends, or null when they aren't. */
export async function getFriendship(x: string, y: string) {
  const { a, b } = pair(x, y);
  const [row] = await db
    .select({ since: friendship.createdAt })
    .from(friendship)
    .where(and(eq(friendship.a, a), eq(friendship.b, b)))
    .limit(1);
  return row ?? null;
}

export async function areFriends(x: string, y: string) {
  return (await getFriendship(x, y)) !== null;
}

/** The public side of a user, by username (never their email). */
export async function getUserByUsername(username: string) {
  const [row] = await db
    .select({
      id: user.id,
      username: user.username,
      image: user.image,
      createdAt: user.createdAt,
      shareActivity: user.shareActivity,
    })
    .from(user)
    .where(eq(user.username, username.toLowerCase()))
    .limit(1);
  return row ?? null;
}

/** Your friends, newest first, each with the last thing they watched (only if they share their activity). */
export async function getFriends(userId: string) {
  const pairs = await db
    .select()
    .from(friendship)
    .where(or(eq(friendship.a, userId), eq(friendship.b, userId)))
    .orderBy(desc(friendship.createdAt));
  const ids = pairs.map((p) => (p.a === userId ? p.b : p.a));
  if (ids.length === 0) return [];
  const people = await db
    .select({ id: user.id, username: user.username, image: user.image, shareActivity: user.shareActivity })
    .from(user)
    .where(inArray(user.id, ids));
  // ponytail: one small query per friend for their latest row. Fine for dozens of friends, a window query past that.
  return Promise.all(
    ids.map(async (id) => {
      const person = people.find((p) => p.id === id)!;
      const [last] = person.shareActivity
        ? await db.select().from(plays).where(eq(plays.userId, id)).orderBy(desc(plays.watchedAt)).limit(1)
        : [];
      return { ...person, last: last ?? null };
    }),
  );
}

/** An invite and who sent it (their username, never their email), or null for an unknown code. */
export async function getInvite(code: string) {
  const [row] = await db
    .select({
      code: invite.code,
      userId: invite.userId,
      expiresAt: invite.expiresAt,
      usesLeft: invite.usesLeft,
      host: user.username,
    })
    .from(invite)
    .innerJoin(user, eq(user.id, invite.userId))
    .where(eq(invite.code, code))
    .limit(1);
  return row ?? null;
}

/** Your newest invite that still works, or null. */
export async function getOpenInvite(userId: string, now = new Date()) {
  const [row] = await db
    .select()
    .from(invite)
    .where(and(eq(invite.userId, userId), gt(invite.expiresAt, now), gt(invite.usesLeft, 0)))
    .orderBy(desc(invite.createdAt))
    .limit(1);
  return row ?? null;
}

/** Your friends who share their activity, as id -> username. */
async function sharingFriends(userId: string) {
  const pairs = await db
    .select()
    .from(friendship)
    .where(or(eq(friendship.a, userId), eq(friendship.b, userId)));
  const ids = pairs.map((p) => (p.a === userId ? p.b : p.a));
  if (ids.length === 0) return new Map<string, string>();
  const people = await db
    .select({ id: user.id, username: user.username })
    .from(user)
    .where(and(inArray(user.id, ids), eq(user.shareActivity, true)));
  return new Map(people.filter((p) => p.username).map((p) => [p.id, p.username!]));
}

/** What your friends watched in the last `days`, one entry per title, most recent first. */
export async function getFriendsWatched(userId: string, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const friends = await sharingFriends(userId);
  if (friends.size === 0) return [];
  const rows = await db
    .select({ userId: plays.userId, mediaType: plays.mediaType, tmdbId: plays.tmdbId, at: plays.watchedAt })
    .from(plays)
    .where(and(inArray(plays.userId, [...friends.keys()]), gte(plays.watchedAt, since)));
  // undated rows ("A while ago") never pass the date filter, the flatMap only tells TypeScript
  return groupByTitle(rows.flatMap((r) => (r.at ? [{ ...r, at: r.at, name: friends.get(r.userId)! }] : [])));
}

/** Which friends watched this title (any episode) and which have it on their watchlist. */
export async function getFriendsOnTitle(userId: string, type: "movie" | "tv", tmdbId: number) {
  const friends = await sharingFriends(userId);
  if (friends.size === 0) return { watched: [], listed: [] };
  const ids = [...friends.keys()];
  const [seen, listed] = await Promise.all([
    db
      .select({ userId: watched.userId, at: watched.watchedAt })
      .from(watched)
      .where(and(inArray(watched.userId, ids), eq(watched.mediaType, type), eq(watched.tmdbId, tmdbId)))
      .orderBy(desc(watched.watchedAt)),
    db
      .select({ userId: watchlist.userId })
      .from(watchlist)
      .where(and(inArray(watchlist.userId, ids), eq(watchlist.mediaType, type), eq(watchlist.tmdbId, tmdbId))),
  ]);
  const names = (rows: { userId: string }[]) => [...new Set(rows.map((r) => friends.get(r.userId)!))];
  const watchedNames = names(seen);
  return { watched: watchedNames, listed: names(listed).filter((n) => !watchedNames.includes(n)) };
}

/** Which friends (who share) also have each title on their watchlist, as "movie-27205" -> usernames. */
export async function getFriendsWatchlisting(userId: string) {
  const friends = await sharingFriends(userId);
  const out = new Map<string, string[]>();
  if (friends.size === 0) return out;
  const rows = await db
    .select({ userId: watchlist.userId, mediaType: watchlist.mediaType, tmdbId: watchlist.tmdbId })
    .from(watchlist)
    .where(inArray(watchlist.userId, [...friends.keys()]));
  for (const r of rows) {
    const key = `${r.mediaType}-${r.tmdbId}`;
    out.set(key, [...(out.get(key) ?? []), friends.get(r.userId)!]);
  }
  return out;
}

/** Profile pictures by username, for the small faces next to names ("anna_k watched this"). */
export async function getImagesByUsername(usernames: string[]) {
  if (usernames.length === 0) return new Map<string, string | null>();
  const rows = await db
    .select({ username: user.username, image: user.image })
    .from(user)
    .where(inArray(user.username, usernames));
  return new Map(rows.map((r) => [r.username!, r.image]));
}
