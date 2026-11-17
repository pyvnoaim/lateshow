// Plus one on a player page: while the popup has you in a room, your player follows the room's (play, pause, where)
// and what you do yourself goes to the room. The room's stream runs in background.ts (only it may call Lateshow),
// this page talks to it over a port, which also keeps the background awake. Each site hands in its player.
import { moved, positionAt, settle, type Local } from "@/lib/rooms/playback";
import type { PlusOneState } from "@/lib/rooms/plusOne";
import { close, toast } from "./toast";

export type Player = {
  /** where your player is now, null while it isn't ready */
  clock(): Local | null;
  /** play, pause or skip through the site's own player */
  control(c: { play?: boolean; seek?: number }): void;
  /** what's playing, sent along so everyone knows the episode */
  episode(): { season?: number; episode?: number } | null;
};

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** What happened, for the toast: "Mara paused", "Mara jumped to 21:40" */
type Shared = NonNullable<PlusOneState["playback"]>;
function told(before: Shared | null, now: Shared) {
  if (!before || before.playing !== now.playing) return `${now.name} ${now.playing ? "played" : "paused"}`;
  return `${now.name} jumped to ${mmss(now.position)}`;
}

export function plusOne(player: Player) {
  let port: chrome.runtime.Port | null = null;
  let state: PlusOneState | null = null;
  let offset = 0; // the server's clock minus yours
  let prev: Local | null = null;
  let quietUntil = 0; // after the room moved your player, its own jump isn't yours
  let applied: number | null = null; // the room's last move your player followed (its `at`)
  let asking = false; // "You're 4 s behind" is up

  async function connect() {
    const code = (await chrome.storage.local.get("plusOne")).plusOne as string | undefined;
    if (!code || port) return;
    port = chrome.runtime.connect({ name: "plusone" });
    port.onMessage.addListener((raw) => {
      const m = raw as { state?: PlusOneState; offset?: number; gone?: boolean };
      if (typeof m.offset === "number") offset = m.offset;
      if (m.gone) {
        state = null;
        toast({ title: "The Plus one room is over" }, 5000);
      }
      if (!m.state) return;
      const before = state?.playback ?? null;
      const now = m.state.playback;
      if (now && !now.mine && now.at !== before?.at) {
        asking = false; // this toast takes the prompt's place, it asks again if still behind
        toast({ title: told(before, now), meta: "Plus one" }, 4000);
      }
      state = m.state;
    });
    port.onDisconnect.addListener(() => {
      port = null;
      state = null;
      setTimeout(() => void connect(), 3000);
    });
  }

  /** You moved your player: the room follows you, or (only the maker may) yours goes back */
  function report(local: Local) {
    if (!state || !port) return;
    if (!state.canControl) {
      toast({ title: "Only the room's maker can pause and skip", meta: "Plus one" }, 4000);
      return;
    }
    const move = { playing: !local.paused, position: local.at, ...player.episode() };
    port.postMessage({ move });
    // as if the room said so already, so the next look doesn't pull you back before its answer
    const at = Date.now() + offset;
    state = { ...state, playback: { ...move, at, name: "", mine: true } };
    applied = at;
  }

  /** Behind the room on your own: catch up, or have everyone go back to you (only if you may move the room) */
  function ask(behind: number) {
    if (asking) return;
    asking = true;
    const done = () => {
      close();
      asking = false;
    };
    toast(
      {
        title: `You're ${Math.round(behind)} s behind`,
        meta: "Plus one",
        foot: [
          {
            label: "Catch up",
            meta: "",
            image: null,
            run: () => {
              done();
              const p = state?.playback;
              if (!p) return;
              player.control({ seek: positionAt(p, Date.now() + offset) });
              quietUntil = Date.now() + 2500;
            },
          },
          ...(state?.canControl
            ? [
                {
                  label: "Wait for me",
                  meta: "",
                  image: null,
                  run: () => {
                    done();
                    const c = player.clock();
                    if (c) report({ ...c, paused: false });
                  },
                },
              ]
            : []),
        ],
      },
      0,
    );
  }

  window.setInterval(() => {
    const now = player.clock();
    if (!now || !state) return void (prev = now);
    if (Date.now() > quietUntil) {
      // the room's first move is whoever may make it
      if (!state.playback ? state.canControl : prev && moved(prev, now)) report(now);
      else if (!state.playback) return void (prev = now);
      else {
        const p = state.playback;
        const { behind, ...act } = settle(now, p, Date.now() + offset, p.at !== applied) ?? {};
        applied = p.at;
        if (behind) ask(behind);
        else if (asking) {
          close(); // back in step by itself
          asking = false;
        }
        if (act.play !== undefined || act.seek !== undefined) {
          player.control(act);
          quietUntil = Date.now() + 2500;
        }
      }
    }
    prev = now;
  }, 1000);
  // a port that carries something now and then keeps the background awake
  window.setInterval(() => port?.postMessage({ ping: 1 }), 20_000);

  chrome.storage.onChanged.addListener((changes) => {
    if (!("plusOne" in changes)) return;
    if (changes.plusOne.newValue) void connect();
    else {
      port?.disconnect();
      port = null;
      state = null;
    }
  });
  void connect();
}
