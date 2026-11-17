import "server-only";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { room, roomMember } from "@/lib/db/schema";
import { applyUpdate, canControl, playbackUpdate, type Playback } from "./playback";

/**
 * Plus one through the extension: only someone who joined the room (by their account, the extension's key) reads or
 * moves its player. A room that's gone or that you're not in looks the same: null.
 */
async function roomFor(code: string, userId: string) {
  const [r] = await db
    .select({
      hostId: room.hostId,
      control: room.control,
      playback: room.playback,
      kind: room.kind,
      tmdbId: room.winner,
      name: roomMember.name,
    })
    .from(room)
    .innerJoin(roomMember, and(eq(roomMember.roomCode, room.code), eq(roomMember.memberId, userId)))
    .where(and(eq(room.code, code), gt(room.expiresAt, new Date()), eq(roomMember.joined, true)))
    .limit(1);
  return r ?? null;
}

/** only what the extension needs, picked by name (an allowlist: a field added to Playback later stays on the server) */
function shared(p: Playback, userId: string) {
  const { playing, position, at, name, season, episode } = p;
  return { playing, position, at, name, season, episode, mine: p.by === userId };
}

export type PlusOneState = {
  now: number; // the server's clock, so the extension can tell how far off its own is
  control: "everyone" | "host";
  canControl: boolean;
  title: { kind: "movie" | "tv"; tmdbId: number } | null;
  /** the room's player without who moved it (no one's account id leaves the server), `mine`: you did */
  playback: (Omit<Playback, "by"> & { mine: boolean }) | null;
};

/** The room's player as you see it, null when the room is gone or you're not in it */
export async function getPlusOne(code: string, userId: string): Promise<PlusOneState | null> {
  const r = await roomFor(code, userId);
  if (!r) return null;
  return {
    now: Date.now(),
    control: r.control,
    canControl: canControl(r, userId),
    title: r.tmdbId ? { kind: r.kind, tmdbId: r.tmdbId } : null,
    playback: r.playback && shared(r.playback, userId),
  };
}

/** You played, paused or skipped: everyone's player follows. Throws on a body that isn't an update. */
export async function movePlusOne(code: string, userId: string, body: unknown) {
  const u = playbackUpdate.parse(body);
  const r = await roomFor(code, userId);
  if (!r) return { error: "That room is gone.", status: 404 } as const;
  if (!canControl(r, userId)) return { error: "Only the room's maker can pause and skip here.", status: 403 } as const;
  const playback = applyUpdate(u, { id: userId, name: r.name }, Date.now());
  // ponytail: last write wins. Two people pressing pause in the same second both pause, which is what they meant
  await db.update(room).set({ playback }).where(eq(room.code, code));
  return { ok: true };
}
