import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userServices } from "@/lib/db/schema";
import { getFriendsWatchlisting } from "@/lib/friends/queries";
import { getWatchLinks } from "@/lib/justwatch";
import {
  cinemaDate,
  getEnglishName,
  getTitle,
  shortGenre,
  subscriptionServices,
  titleToCard,
  type Card,
  type MediaType,
} from "@/lib/tmdb";
import { getWatchlist } from "./queries";
import { daysUntil, readableNames, shelfFor, type Shelf } from "./shelves";

export type WatchlistItem = {
  card: Card;
  type: MediaType;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  addedAt: Date;
  shelf: Shelf;
  genre: string | null;
  rating: number;
  minutes: number | null;
  /** Watch now: the service of yours it's on, its logo and the deep link. */
  on?: { name: string; logoPath: string; url?: string };
  leavesIn: number | null;
  /** Coming up: "In cinemas Dec 17", "Out Mar 3". Watch now (series): "Season 3 · Mar 12". */
  note?: string;
  /** On other services: "On Apple TV", or "Rent on Videobuster, Apple TV Store". */
  rentOn?: string;
  friends: string[];
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * Your watchlist sorted onto shelves for tonight, with the details each shelf shows.
 * ponytail: one cached TMDB title + JustWatch lookup per title (a day each). Fine for lists of dozens, a stored
 * snapshot updated nightly if lists grow into the hundreds.
 */
export async function getWatchlistView(userId: string, country: string, lang: string) {
  const [rows, mine, friendsWant] = await Promise.all([
    getWatchlist(userId),
    db
      .select({ id: userServices.providerId })
      .from(userServices)
      .where(eq(userServices.userId, userId))
      .then((r) => r.map((x) => x.id)),
    getFriendsWatchlisting(userId),
  ]);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const items = await Promise.all(
    rows.map(async (row): Promise<WatchlistItem | null> => {
      const t = await getTitle(row.mediaType, String(row.tmdbId), lang).catch(() => null);
      if (!t) return null;
      const english = await getEnglishName(row.mediaType, t.id).catch(() => t.title ?? t.name ?? "");
      const links = await getWatchLinks(row.mediaType, t.id, english, country);
      const subs = subscriptionServices(t, country);
      const yours = mine.length > 0 ? subs.filter((s) => mine.includes(s.id)) : subs;
      const service = yours[0];
      const link = service ? links.find((l) => l.included && l.service === service.name) : undefined;
      const providers = t["watch/providers"].results[country];
      const paid = links.filter((l) => !l.included).map((l) => l.service);
      const rentNames =
        paid.length > 0 ? paid : [...(providers?.rent ?? []), ...(providers?.buy ?? [])].map((p) => p.provider_name);

      const cinema = row.mediaType === "movie" ? cinemaDate(t, country) : null;
      const release = row.mediaType === "movie" ? (cinema ?? t.release_date ?? null) : (t.first_air_date ?? null);
      const others = readableNames(subs.filter((s) => !yours.includes(s)).map((s) => s.name));
      const shelf = shelfFor({ release, today, onYours: !!service, elsewhere: others.length + rentNames.length > 0 });
      const next = t.next_episode_to_air;
      const note =
        shelf === "coming" && release
          ? cinema && cinema === release
            ? `In cinemas ${day(release)}`
            : `Out ${day(release)}`
          : row.mediaType === "tv" && next && next.episode_number === 1 && next.air_date > today
            ? `Season ${next.season_number} · ${day(next.air_date)}`
            : undefined;

      return {
        card: titleToCard(t, row.mediaType),
        type: row.mediaType,
        tmdbId: t.id,
        title: t.title ?? t.name ?? row.title,
        posterPath: t.poster_path,
        addedAt: row.addedAt,
        shelf,
        genre: t.genres[0] ? shortGenre(t.genres[0].name) : null,
        rating: t.vote_average,
        minutes: (row.mediaType === "movie" ? t.runtime : t.episode_run_time?.[0]) ?? null,
        on: service ? { name: service.name, logoPath: service.logoPath, url: link?.url } : undefined,
        leavesIn: shelf === "now" ? daysUntil(link?.leavesAt, now) : null,
        note,
        rentOn:
          shelf !== "rent"
            ? undefined
            : others.length > 0
              ? `On ${others.slice(0, 2).join(", ")}`
              : `Rent on ${[...new Set(rentNames)].slice(0, 2).join(", ")}`,
        friends: friendsWant.get(`${row.mediaType}-${t.id}`) ?? [],
      };
    }),
  );
  return items.filter((i) => i !== null);
}

/** Titles from your list that came out in the last 7 days (cinema or streaming), newest first. For Home. */
export async function getOutThisWeek(userId: string, country: string, lang: string) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const rows = await getWatchlist(userId);
  const hits = await Promise.all(
    rows.map(async (row) => {
      const t = await getTitle(row.mediaType, String(row.tmdbId), lang).catch(() => null);
      if (!t) return null;
      const release =
        row.mediaType === "movie" ? (cinemaDate(t, country) ?? t.release_date ?? null) : (t.first_air_date ?? null);
      return release && release >= weekAgo && release <= today
        ? { card: titleToCard(t, row.mediaType), release }
        : null;
    }),
  );
  return hits.filter((h) => h !== null).toSorted((a, b) => b.release.localeCompare(a.release));
}
