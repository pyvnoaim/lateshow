import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { room, roomMember } from "@/lib/db/schema";

/** A room that is still open (not expired), with everyone in it, host first. Null when it's gone. */
export async function getRoom(code: string) {
  const [r] = await db
    .select({ room, host: user.username })
    .from(room)
    .innerJoin(user, eq(user.id, room.hostId))
    .where(and(eq(room.code, code), gt(room.expiresAt, new Date())))
    .limit(1);
  if (!r) return null;
  const members = await db.select().from(roomMember).where(eq(roomMember.roomCode, code)).orderBy(roomMember.joinedAt);
  return { ...r.room, host: r.host, members: members.toSorted((a) => (a.memberId === r.room.hostId ? -1 : 0)) };
}

/** The room's change counter, for the live lobby. Null when the room is gone. */
export async function getRoomVersion(code: string) {
  const [r] = await db.select({ version: room.version, status: room.status }).from(room).where(eq(room.code, code));
  return r ?? null;
}

/** Rooms a friend invited you to that are still waiting in the lobby. */
export async function getRoomInvites(userId: string) {
  return db
    .select({ code: room.code, kind: room.kind, game: room.game, host: user.username })
    .from(roomMember)
    .innerJoin(room, eq(room.code, roomMember.roomCode))
    .innerJoin(user, eq(user.id, room.hostId))
    .where(
      and(
        eq(roomMember.memberId, userId),
        eq(roomMember.joined, false),
        eq(room.status, "lobby"),
        gt(room.expiresAt, new Date()),
      ),
    );
}
