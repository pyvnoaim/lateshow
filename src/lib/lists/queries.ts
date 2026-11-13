import "server-only";
import { and, asc, count, desc, eq, inArray, ne } from "drizzle-orm";
import { cache } from "react";
import { getSession } from "@/lib/auth";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { list, listItem } from "@/lib/db/schema";
import { areFriends } from "@/lib/friends/queries";
import { canSeeList } from "./rules";

/**
 * One list with its titles (oldest first, the order they were added), or null when this viewer can't see it.
 * Once per request (the page and its metadata both ask).
 */
export const getList = cache(async (id: string, viewerId: string | null) => {
  const [l] = await db
    .select({
      id: list.id,
      userId: list.userId,
      name: list.name,
      visibility: list.visibility,
      owner: user.username,
      ownerImage: user.image,
    })
    .from(list)
    .innerJoin(user, eq(user.id, list.userId))
    .where(eq(list.id, id));
  if (!l) return null;
  const friends = viewerId !== null && viewerId !== l.userId && (await areFriends(viewerId, l.userId));
  if (!canSeeList(l, viewerId, friends)) return null;
  const items = await db.select().from(listItem).where(eq(listItem.listId, id)).orderBy(asc(listItem.addedAt));
  return { ...l, items };
});

// ponytail: reads every item of every list for 4 posters each. One ROW_NUMBER() query if lists get long.
/**
 * Someone's lists with a count and the first posters: all of them for the owner, for anyone else only the ones
 * not kept private (call it for a friend's profile only, a stranger never gets there).
 */
export async function getListsOf(ownerId: string, viewerId: string) {
  const lists = await db
    .select({ id: list.id, name: list.name, visibility: list.visibility })
    .from(list)
    .where(and(eq(list.userId, ownerId), viewerId === ownerId ? undefined : ne(list.visibility, "private")))
    .orderBy(desc(list.createdAt));
  if (!lists.length) return [];
  const ids = lists.map((l) => l.id);
  const [counts, items] = await Promise.all([
    db
      .select({ id: listItem.listId, n: count() })
      .from(listItem)
      .where(inArray(listItem.listId, ids))
      .groupBy(listItem.listId),
    db
      .select({ id: listItem.listId, posterPath: listItem.posterPath })
      .from(listItem)
      .where(inArray(listItem.listId, ids))
      .orderBy(asc(listItem.addedAt)),
  ]);
  return lists.map((l) => ({
    ...l,
    count: counts.find((c) => c.id === l.id)?.n ?? 0,
    posters: items
      .filter((i) => i.id === l.id && i.posterPath)
      .slice(0, 4)
      .map((i) => i.posterPath!),
  }));
}

/** Your lists, each with whether this title is on it, for "Add to list" on a title page. */
export async function getMyListsFor(userId: string, type: "movie" | "tv", tmdbId: number) {
  const [lists, on] = await Promise.all([
    db.select({ id: list.id, name: list.name }).from(list).where(eq(list.userId, userId)).orderBy(desc(list.createdAt)),
    db
      .select({ id: listItem.listId })
      .from(listItem)
      .innerJoin(list, eq(list.id, listItem.listId))
      .where(and(eq(list.userId, userId), eq(listItem.mediaType, type), eq(listItem.tmdbId, tmdbId))),
  ]);
  const has = new Set(on.map((o) => o.id));
  return lists.map((l) => ({ ...l, has: has.has(l.id) }));
}

/**
 * Your lists and which titles are on each ("movie-27205" -> list ids), for the list icon in every poster caption.
 * Null signed out. One pair of queries per request, shared by every poster on the page.
 */
export const getMyListMembership = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const [lists, items] = await Promise.all([
    db
      .select({ id: list.id, name: list.name })
      .from(list)
      .where(eq(list.userId, session.user.id))
      .orderBy(desc(list.createdAt)),
    db
      .select({ id: listItem.listId, mediaType: listItem.mediaType, tmdbId: listItem.tmdbId })
      .from(listItem)
      .innerJoin(list, eq(list.id, listItem.listId))
      .where(eq(list.userId, session.user.id)),
  ]);
  const on = new Map<string, Set<string>>();
  for (const i of items) {
    const key = `${i.mediaType}-${i.tmdbId}`;
    on.set(key, (on.get(key) ?? new Set()).add(i.id));
  }
  return { lists, on };
});
