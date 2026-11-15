import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { watched, watchlist } from "@/lib/db/schema";

type Row = {
  list: "history" | "watchlist";
  type: "movie" | "tv";
  tmdbId: number;
  title: string;
  season: number | null;
  episode: number | null;
  date: Date | null; // null: watched "A while ago", no date
};

const cell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  // quote when needed, and defuse spreadsheet formulas (a title starting with = + - @)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
};

/** CSV with a header row. Pure. */
export function toCsv(rows: Row[]) {
  const head = ["list", "type", "tmdb_id", "title", "season", "episode", "date"];
  const lines = rows.map((r) =>
    [r.list, r.type, r.tmdbId, r.title, r.season, r.episode, r.date?.toISOString() ?? ""].map(cell).join(","),
  );
  return [head.join(","), ...lines].join("\n") + "\n";
}

/** Everything you watched and your watchlist, as one CSV. */
export async function exportLibrary(userId: string) {
  const [history, listed] = await Promise.all([
    db.select().from(watched).where(eq(watched.userId, userId)).orderBy(desc(watched.watchedAt)),
    db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.addedAt)),
  ]);
  return toCsv([
    ...history.map((w) => ({
      list: "history" as const,
      type: w.mediaType,
      tmdbId: w.tmdbId,
      title: w.title,
      season: w.mediaType === "tv" ? w.season : null,
      episode: w.mediaType === "tv" ? w.episode : null,
      date: w.watchedAt,
    })),
    ...listed.map((w) => ({
      list: "watchlist" as const,
      type: w.mediaType,
      tmdbId: w.tmdbId,
      title: w.title,
      season: null,
      episode: null,
      date: w.addedAt,
    })),
  ]);
}
