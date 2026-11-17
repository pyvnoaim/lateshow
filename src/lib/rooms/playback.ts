import { z } from "zod";

/**
 * Plus one: the room's shared player. `position` (seconds into the episode) was true at `at` (the server's clock, ms),
 * so everyone works out where it is now from the same clock, whatever their laptop's says. `by` and `name`: who did
 * the last pause, play or skip, for the pill ("Mara paused"). Pure, no database.
 */
export type Playback = {
  playing: boolean;
  position: number;
  at: number;
  by: string;
  name: string;
  season?: number;
  episode?: number;
};

/** What the extension sends when you play, pause or skip */
export const playbackUpdate = z.object({
  playing: z.boolean(),
  position: z
    .number()
    .min(0)
    .max(24 * 3600),
  season: z.number().int().min(0).max(1000).optional(),
  episode: z.number().int().min(0).max(10_000).optional(),
});
export type PlaybackUpdate = z.infer<typeof playbackUpdate>;

/** The part of the player that says where it is */
type Clocked = Pick<Playback, "playing" | "position" | "at">;

/** Where the shared player is at `now` (server ms) */
export function positionAt(p: Clocked, now: number) {
  return p.playing ? p.position + Math.max(0, now - p.at) / 1000 : p.position;
}

/** The room maker's choice: everyone may pause and skip, or only they */
export function canControl(room: { control: "everyone" | "host"; hostId: string }, memberId: string) {
  return room.control === "everyone" || room.hostId === memberId;
}

/** The room's player after an update, stamped with the server's clock */
export function applyUpdate(u: PlaybackUpdate, who: { id: string; name: string }, now: number): Playback {
  return { ...u, at: now, by: who.id, name: who.name };
}

/** Where your own player is: seconds in, paused or not, and when you looked (your clock, ms) */
export type Local = { at: number; paused: boolean; t: number };

/**
 * What your player must do to match the room: play or pause, and a seek when it's more than `drift` seconds off.
 * Null when it already matches. `serverNow`: the server's clock now (yours plus the offset the stream told).
 */
export function follow(local: Local, p: Clocked, serverNow: number, drift = 2) {
  const out: { play?: boolean; seek?: number } = {};
  if (local.paused === p.playing) out.play = p.playing;
  const target = positionAt(p, serverNow);
  if (Math.abs(local.at - target) > drift) out.seek = target;
  return out.play === undefined && out.seek === undefined ? null : out;
}

/** You moved your player yourself between two looks: paused, played, or jumped more than `jump` seconds */
export function moved(prev: Local, now: Local, jump = 3) {
  if (prev.paused !== now.paused) return true;
  const expected = prev.at + (prev.paused ? 0 : (now.t - prev.t) / 1000);
  return Math.abs(now.at - expected) > jump;
}
