// screenshot data for the store: a connected browser after a sync
const now = Date.now();
const data = {
  key: "ls_demo",
  settings: { profiles: { Netflix: "Jamie", "Prime Video": "Jamie", Crunchyroll: "Jamie" } },
  syncedAt: { Netflix: now - 2 * 3600e3, "Prime Video": now - 26 * 3600e3, Crunchyroll: now - 60e3 },
  synced: {},
  syncState: {
    site: "Crunchyroll",
    phase: "done",
    result: { episodes: 38, films: 2, series: 4, watchlist: 12, unsure: 0, notFound: 0 },
    profile: "Jamie",
    at: now - 30e3,
  },
  recent: [
    {
      title: "Frieren: Beyond Journey's End",
      season: 1,
      episode: 14,
      ids: [1],
      at: now - 40 * 60e3,
      via: "Crunchyroll",
    },
    { title: "Severance", season: 2, episode: 3, ids: [2], at: now - 20 * 3600e3, via: "Prime Video" },
    { title: "Wednesday", season: 2, episode: 1, ids: [3], at: now - 50 * 3600e3, via: "Netflix" },
  ],
};
const ev = { addListener() {} };
window.chrome = {
  storage: {
    local: { get: async (k) => ({ [k]: data[k] }), set: async () => {}, remove: async () => {} },
    onChanged: ev,
  },
  permissions: { contains: async () => true, request: async () => true },
  runtime: { sendMessage: async () => ({}), onMessage: ev },
  tabs: { create: async () => {} },
};
const f0 = window.fetch;
window.fetch = async (u, o) =>
  String(u).includes("/api/extension/me") ? new Response(JSON.stringify({ name: "Jamie" })) : f0(u, o);
