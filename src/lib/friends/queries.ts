import "server-only";
import { and, count, desc, eq, gt, inArray, or } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { friendship, invite, watched } from "@/lib/db/schema";
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
    .select({ id: user.id, username: user.username, createdAt: user.createdAt, shareActivity: user.shareActivity })
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
    .select({ id: user.id, username: user.username, shareActivity: user.shareActivity })
    .from(user)
    .where(inArray(user.id, ids));
  // ponytail: one small query per friend for their latest row. Fine for dozens of friends, a window query past that.
  return Promise.all(
    ids.map(async (id) => {
      const person = people.find((p) => p.id === id)!;
      const [last] = person.shareActivity
        ? await db.select().from(watched).where(eq(watched.userId, id)).orderBy(desc(watched.watchedAt)).limit(1)
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
