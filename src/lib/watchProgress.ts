/**
 * Has someone really watched this video to the end? Pure, fed with the player's ticks (the extension's generic
 * `<video>` module, the same on every site). Only seconds actually played count: a jump forward or back (seeking) adds
 * nothing, neither does an ad. Finished = the credits started (the site's signal) or 90% reached, and at least half
 * of it actually watched, so skipping to the end marks nothing. Short clips (trailers, previews) never finish.
 */

export type Progress = {
  /** the video's length in seconds, the playthrough restarts when it changes (the next episode) */
  duration: number;
  /** where the last tick was */
  at: number;
  /** seconds actually played */
  watched: number;
  finished: boolean;
};

export type Tick = {
  /** the video's position and length now */
  at: number;
  duration: number;
  /** playback speed, so 1.5x still counts as playing, not as a jump */
  rate?: number;
  /** an ad is playing (the site's signal) */
  ad?: boolean;
  /** the credits started (the site's signal: Skip Credits, Next episode) */
  credits?: boolean;
};

export const MIN_LENGTH = 5 * 60; // shorter than this is a trailer or preview
const NEAR_END = 0.9;
const WATCHED_SHARE = 0.5;
// between two ticks (players tick about every quarter second, a throttled background tab every second or so)
const MAX_STEP = 3;

export const start = (duration = 0): Progress => ({ duration, at: 0, watched: 0, finished: false });

/** The next state after a tick. `finished` turns true once, on the tick that completes it. */
export function tick(p: Progress, t: Tick): Progress {
  if (!Number.isFinite(t.duration) || t.duration <= 0) return p;
  // a different length (the next episode), or back at the start after finishing (the next one is just as long, or
  // a rewatch): a fresh playthrough from here
  const fresh = Math.abs(t.duration - p.duration) > 1 || (p.finished && t.at < 30);
  const base = fresh ? { ...start(t.duration), at: t.at } : p;
  const step = t.at - base.at;
  const playing = step > 0 && step <= MAX_STEP * Math.max(1, t.rate ?? 1);
  const watched = base.watched + (playing && !t.ad ? step : 0);
  const done =
    t.duration >= MIN_LENGTH &&
    watched >= t.duration * WATCHED_SHARE &&
    (t.credits === true || t.at >= t.duration * NEAR_END);
  return { duration: t.duration, at: t.at, watched, finished: base.finished || done };
}
