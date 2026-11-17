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

/** Where the shared player is at `now` (server ms) */
export function positionAt(p: Playback, now: number) {
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
