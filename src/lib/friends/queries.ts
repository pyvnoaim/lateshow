import "server-only";
import { and, count, desc, eq, gt, or } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { friendship, invite } from "@/lib/db/schema";
import { pair } from "./rules";

export async function getFriendCount(userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(friendship)
    .where(or(eq(friendship.a, userId), eq(friendship.b, userId)));
  return row?.n ?? 0;
}

export async function areFriends(x: string, y: string) {
  const { a, b } = pair(x, y);
  const rows = await db
    .select({ a: friendship.a })
    .from(friendship)
    .where(and(eq(friendship.a, a), eq(friendship.b, b)))
    .limit(1);
  return rows.length > 0;
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
