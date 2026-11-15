// Runs in Prime Video's own page (the page's world, not the extension's): Prime's player learns what it plays from two
// answers this notes, by watching the player's own requests. GetVodPlaybackResources: the episode's own length (its
// video also holds the ad breaks) and where the credits start (NEXT_UP). playerChromeResources: asked again with
// catalogMetadata, it names the episode (show, season, number, title). Both go to the Lateshow script on this page
// (prime.ts). Nothing here sends anything anywhere, the one request it makes is the player's own, to Prime.
(() => {
  type Title = { titleId: string; durationMs?: number; nextUpMs?: number };
  const tell = (d: object) => window.postMessage({ type: "lateshow:pv", ...d }, location.origin);

  const resources = (url: string, text: string) => {
    const titleId = new URL(url, location.href).searchParams.get("titleId");
    if (!titleId) return;
    const j = JSON.parse(text) as {
      vodPlaylistedPlaybackUrls?: { result?: { playbackUrls?: { fullTitleDurationMs?: number } } };
      transitionTimecodes?: { result?: { events?: { eventType?: string; startTimeMs?: number }[] } };
    };
    const t: Title = {
      titleId,
      durationMs: j.vodPlaylistedPlaybackUrls?.result?.playbackUrls?.fullTitleDurationMs,
      nextUpMs: j.transitionTimecodes?.result?.events?.find((e) => e.eventType === "NEXT_UP")?.startTimeMs,
    };
    tell({ kind: "title", ...t });
  };

  const asked = new Set<string>();
  const chrome = async (url: string) => {
    const u = new URL(url, location.href);
    const titleId = u.searchParams.get("entityId");
    if (!titleId || asked.has(titleId)) return;
    asked.add(titleId);
    u.searchParams.set("desiredResources", "catalogMetadata");
    const j = (await (await fetchFn(u.href, { credentials: "include" })).json()) as {
      resources?: { catalogMetadata?: Record<string, unknown> };
    };
    const c = j.resources?.catalogMetadata ?? {};
    tell({
      kind: "catalog",
      titleId,
      type: c.type,
      title: c.title,
      seriesTitle: c.seriesTitle,
      seasonNumber: c.seasonNumber,
      episodeNumber: c.episodeNumber,
    });
  };

  const seen = (url: string, text: () => Promise<string>) => {
    try {
      if (/GetVodPlaybackResources/.test(url))
        void text()
          .then((t) => resources(url, t))
          .catch(() => {});
      else if (/playerChromeResources/.test(url)) void chrome(url).catch(() => asked.clear());
    } catch {
      // noting is best effort, the player's request goes out and comes back unchanged either way
    }
  };

  const fetchFn = window.fetch;
  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const res = await fetchFn.call(this, input, init);
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    seen(url, () => res.clone().text());
    return res;
  };
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  const urls = new WeakMap<XMLHttpRequest, string>();
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: Parameters<XMLHttpRequest["open"]>) {
    urls.set(this, String(args[1]));
    return open.apply(this, args);
  } as XMLHttpRequest["open"];
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null) {
    this.addEventListener("load", () => {
      const url = urls.get(this) ?? "";
      if (this.responseType === "" || this.responseType === "text") seen(url, async () => this.responseText);
    });
    return send.call(this, body);
  };
})();
