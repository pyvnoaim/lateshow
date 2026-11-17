// Runs in Netflix's own page (the page's world, not the extension's): Netflix's viewing activity API wants the
// profile's id and the site's build id, which only the page's app holds (window.netflix), and marking only marks
// your own profile (its name). This hands them to the Lateshow script on this page when it asks (netflix.ts). On a
// player page it also reports the episode's position once a second from Netflix's player API: the page's <video>
// can't tell it (with ads its length isn't the episode's), and plays, pauses and skips for Plus one when netflix.ts
// says so. Nothing here sends anything anywhere.
(() => {
  window.addEventListener("message", (e) => {
    if (e.source !== window || (e.data as { type?: string } | null)?.type !== "lateshow:nf-ask") return;
    const models = (
      window as { netflix?: { reactContext?: { models?: Record<string, { data?: Record<string, string> }> } } }
    ).netflix?.reactContext?.models;
    const info = models?.userInfo?.data;
    window.postMessage(
      {
        type: "lateshow:nf-ids",
        guid: info?.guid ?? info?.userGuid ?? null,
        name: info?.name ?? null,
        build: models?.serverDefs?.data?.BUILD_IDENTIFIER ?? null,
      },
      location.origin,
    );
  });

  type Player = {
    getCurrentTime(): number;
    getDuration(): number;
    isPaused(): boolean;
    play(): void;
    pause(): void;
    seek(ms: number): void;
  };
  type Api = { getAllPlayerSessionIds(): string[]; getVideoPlayerBySessionId(id: string): Player | undefined };
  const player = () => {
    const vp = (
      window as { netflix?: { appContext?: { state?: { playerApp?: { getAPI(): { videoPlayer: Api } } } } } }
    ).netflix?.appContext?.state?.playerApp?.getAPI().videoPlayer;
    const ids = vp?.getAllPlayerSessionIds() ?? [];
    return ids.length ? vp!.getVideoPlayerBySessionId(ids[ids.length - 1]) : undefined;
  };

  // Plus one (netflix.ts): play, pause and skip through Netflix's own player API, never the <video> (that breaks it)
  window.addEventListener("message", (e) => {
    const d = e.data as { type?: string; play?: boolean; seek?: number } | null;
    if (e.source !== window || d?.type !== "lateshow:nf-control") return;
    try {
      const p = player();
      if (!p) return;
      if (typeof d.seek === "number") p.seek(Math.round(d.seek * 1000));
      if (d.play === true) p.play();
      if (d.play === false) p.pause();
    } catch {
      // the player isn't ready: the next state from the room tries again
    }
  });

  window.setInterval(() => {
    if (!location.pathname.startsWith("/watch/")) return;
    try {
      const p = player();
      if (!p || !(p.getDuration() > 0)) return;
      window.postMessage(
        {
          type: "lateshow:nf-tick",
          at: p.getCurrentTime() / 1000,
          duration: p.getDuration() / 1000,
          rate: 1,
          paused: p.isPaused(),
        },
        location.origin,
      );
    } catch {
      // the player isn't ready yet, or Netflix changed it: no ticks, nothing marked
    }
  }, 1000);
})();
