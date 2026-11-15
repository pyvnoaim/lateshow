// Auto-marking, the same on every site: follows the playing <video>, counts what you really watch (watchProgress) and
// once you finished it, asks Lateshow to mark it (through the background's queue) and shows the toast. A site only
// adds an Adapter: what's playing, whether an ad runs, whether the credits started, which profile is on. Only the
// finished title ever leaves the browser, never progress.
import type { ImportRow } from "@/lib/library/importing";
import type { MarkResult } from "@/lib/extension/mark";
import type { Candidate } from "@/lib/library/matching";
import { start, tick, type Progress } from "@/lib/watchProgress";
import { close, toast } from "./toast";

export type Via = "Prime Video" | "Netflix" | "Crunchyroll";

/** The playing video's state: from this page's own <video>, or reported by the site's player frame */
export type Clock = { at: number; duration: number; rate: number; paused: boolean };

export type Adapter = {
  via: Via;
  /** what's playing, as one import row (a film, or a show with the one episode), null while unknown */
  playing(): ImportRow | null | Promise<ImportRow | null>;
  /** where the video is when it isn't in this page (Crunchyroll plays in a frame of its own), else the page's video */
  clock?(): Clock | null;
  /** an ad runs now (it doesn't count as watching) */
  ad?(): boolean;
  /** the credits started (the site's Skip Credits or Next episode) */
  credits?(): boolean;
  /** the site's profile that's playing, so only yours is marked */
  profile?(): string | null;
};

type Answer = MarkResult | { status: "queued" } | { status: "error"; message: string };
type Settings = { key?: string; autoMark?: Partial<Record<Via, boolean>>; profiles?: Partial<Record<Via, string>> };

/** The video that's playing: the largest one with a length (sites keep small previews and ad players around) */
function mainVideo(): HTMLVideoElement | null {
  let best: HTMLVideoElement | null = null;
  for (const v of document.querySelectorAll("video")) {
    if (!(v.duration > 0) || v.readyState < 2) continue;
    if (!best || v.clientWidth * v.clientHeight > best.clientWidth * best.clientHeight) best = v;
  }
  return best;
}

// the poster through Lateshow's image server: no request from this page goes to TMDB (see /privacy)
const poster = (c: Candidate) =>
  c.posterPath
    ? `${__LATESHOW__}/_next/image?url=${encodeURIComponent(`https://image.tmdb.org/t/p/w92${c.posterPath}`)}&w=96&q=75`
    : null;

const label = (a: Extract<MarkResult, { status: "marked" }>) =>
  a.season !== undefined ? `${a.title} · S${a.season} E${a.episode}` : a.title;

async function send(via: Via, row: ImportRow, at: string, pick?: Candidate) {
  const answer = await chrome.runtime.sendMessage<Answer>({
    type: "lateshow:mark",
    body: {
      row,
      at,
      via,
      ...(pick && { pick: { id: pick.id, type: pick.type, title: pick.title, posterPath: pick.posterPath } }),
    },
  });
  show(via, row, at, answer);
}

function show(via: Via, row: ImportRow, at: string, a: Answer) {
  if (a.status === "marked")
    toast({
      title: "Marked as watched",
      meta: label(a),
      undo: () =>
        void chrome.runtime
          .sendMessage<{ ok: boolean }>({ type: "lateshow:undo", ids: a.ids })
          .then((r) => toast({ title: r.ok ? "Undone" : "Couldn't undo, remove it in Lateshow" }, 3000)),
    });
  else if (a.status === "already") toast({ title: "Already in Lateshow", meta: a.title }, 3000);
  else if (a.status === "queued") toast({ title: "Saved", meta: "It goes to Lateshow once it's reachable" }, 4000);
  else if (a.status === "pick")
    toast(
      {
        title: `Which ${row.title} did you just watch?`,
        meta: "Picked once, Lateshow knows it next time.",
        choices: a.candidates.slice(0, 3).map((c) => ({
          label: c.title,
          meta: [c.year, c.type === "tv" ? "Series" : "Film"].filter(Boolean).join(" · "),
          image: poster(c),
          run: () => void send(via, row, at, c),
        })),
        foot: [{ label: "Neither", meta: "", image: null, run: close }],
      },
      0,
    );
  else if (a.status === "error") toast({ title: "Not marked", meta: a.message }, 6000);
  // "unknown": Lateshow doesn't know this title, nothing to say mid-film
}

/** Starts following playback on this page for one site. Checks once a second, does nothing without a key. */
export function watch(site: Adapter) {
  let p: Progress = start();
  const ownVideo = (): Clock | null => {
    const v = mainVideo();
    return v && { at: v.currentTime, duration: v.duration, rate: v.playbackRate, paused: v.paused };
  };
  window.setInterval(async () => {
    const v = site.clock?.() ?? ownVideo();
    if (!v || v.paused) return;
    const was = p.finished;
    p = tick(p, {
      at: v.at,
      duration: v.duration,
      rate: v.rate,
      ad: site.ad?.() ?? false,
      credits: site.credits?.() ?? false,
    });
    if (was || !p.finished) return;
    const s = (await chrome.storage.local.get("settings")).settings as Settings | undefined;
    const key = (await chrome.storage.local.get("key")).key;
    if (!key || s?.autoMark?.[site.via] === false) return;
    // your profile: the first one that finishes something here, changeable in the popup
    const profile = site.profile?.() ?? null;
    if (profile) {
      const mine = s?.profiles?.[site.via];
      if (mine && mine !== profile) return;
      if (!mine)
        await chrome.storage.local.set({ settings: { ...s, profiles: { ...s?.profiles, [site.via]: profile } } });
    }
    const row = await site.playing();
    if (row) void send(site.via, row, new Date().toISOString());
  }, 1000);
}
