import "server-only";
import { and, eq, gt, lt } from "drizzle-orm";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { room, roomMember, roomMood, roomPick, roomVote } from "@/lib/db/schema";

/**
 * Housekeeping: rooms (with their members, votes, moods) are deleted a day after they close, as the privacy page
 * says. Runs whenever a room is opened or read, a cheap delete on a small table.
 */
export async function sweepRooms() {
  await db.delete(room).where(lt(room.expiresAt, new Date(Date.now() - 24 * 3600_000)));
}

/** A room that is still open (not expired), with everyone in it, host first. Null when it's gone. */
export async function getRoom(code: string) {
  await sweepRooms();
  const [r] = await db
    .select({ room, host: user.username })
    .from(room)
    .innerJoin(user, eq(user.id, room.hostId))
    .where(and(eq(room.code, code), gt(room.expiresAt, new Date())))
    .limit(1);
  if (!r) return null;
  const members = await db.select().from(roomMember).where(eq(roomMember.roomCode, code)).orderBy(roomMember.joinedAt);
  const isHost = (m: { memberId: string }) => (m.memberId === r.room.hostId ? 1 : 0);
  return { ...r.room, host: r.host, members: members.toSorted((a, b) => isHost(b) - isHost(a)) };
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

/** Every swipe in a room, for progress (who's done), your remaining cards and the no-match ranking. */
export async function getVotes(code: string) {
  return db.select().from(roomVote).where(eq(roomVote.roomCode, code));
}

/** Bracket votes as match -> member -> chosen title, the shape bracketState reads. */
export async function getPicks(code: string) {
  const all = new Map<number, Map<string, number>>();
  for (const p of await db.select().from(roomPick).where(eq(roomPick.roomCode, code))) {
    all.set(p.match, (all.get(p.match) ?? new Map()).set(p.memberId, p.choice));
  }
  return all;
}

/** Reel: everyone's mood, in the order they were added. */
export async function getMoods(code: string) {
  return db.select().from(roomMood).where(eq(roomMood.roomCode, code));
}
