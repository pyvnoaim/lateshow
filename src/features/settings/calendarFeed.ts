import "server-only";
import { eq } from "drizzle-orm";
import {
  buildIcs,
  calendarTokenUser,
  makeCalendarToken,
  verifyCalendarToken,
  type CalendarEvent,
} from "@/lib/calendar";
import { user } from "@/lib/db/auth-schema";
import { db } from "@/lib/db/client";
import { calendarFeed as feed } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { getRecentShows, getWatchlist } from "@/lib/library/queries";
import { DEFAULT_COUNTRY } from "@/lib/region";
import { SITE_URL } from "@/lib/site";
import { pool } from "@/lib/pool";
import { getTitle, theatricalDate } from "@/lib/tmdb";

const DAY = 86_400_000;

/** The account and its link version (0 without a row), or undefined when the account is gone. */
const linkVersion = async (userId: string) => {
  const [row] = await db
    .select({ version: feed.version })
    .from(user)
    .leftJoin(feed, eq(feed.userId, user.id))
    .where(eq(user.id, userId));
  return row ? (row.version ?? 0) : undefined;
};

/** The private subscribe link for Settings. */
export async function calendarUrl(userId: string) {
  const token = makeCalendarToken(userId, (await linkVersion(userId)) ?? 0, env("auth").BETTER_AUTH_SECRET);
  return `${SITE_URL}/api/cal/${token}.ics`;
}

/**
 * The .ics text for a token, or null when the token isn't ours. Next episodes of shows you watch or saved (60 days), and
 * upcoming release days of films on your watchlist.
 * ponytail: calendar apps send no cookies or geo headers, so it's Germany and English. A stored country if it matters.
 * Episode names are always shown, the spoiler guard is a browser cookie the calendar app doesn't have.
 */
export async function calendarFeed(token: string) {
  const raw = token.replace(/\.ics$/, "");
  const userId = calendarTokenUser(raw);
  const version = userId ? await linkVersion(userId) : undefined;
  // a deleted account, an old link after New link, or not ours at all: the same 404
  if (!userId || version === undefined || !verifyCalendarToken(raw, version, env("auth").BETTER_AUTH_SECRET))
    return null;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const end = new Date(now.getTime() + 60 * DAY).toISOString().slice(0, 10);
  // TMDB only knows the next episode of a show, so one per show at most
  const soon = (d: string | null | undefined): d is string => !!d && d >= today && d <= end;

  const [recent, listed] = await Promise.all([getRecentShows(userId, 30), getWatchlist(userId)]);
  const showIds = new Set([
    ...recent.map((r) => r.tmdbId),
    ...listed.filter((w) => w.mediaType === "tv").map((w) => w.tmdbId),
  ]);

  // 8 at a time each: a long watchlist on a cold cache must not hit TMDB's rate limit (and drop events)
  const episodes = pool([...showIds], 8, async (id): Promise<CalendarEvent[]> => {
    const t = await getTitle("tv", String(id)).catch(() => null);
    const ep = t?.next_episode_to_air;
    if (!t || !ep || !soon(ep.air_date)) return [];
    const name = ep.name && !/^Episode \d+$/.test(ep.name) ? `: ${ep.name}` : "";
    return [
      {
        uid: `tv-${t.id}-s${ep.season_number}e${ep.episode_number}@lateshow`,
        date: ep.air_date,
        summary: `${t.name} S${ep.season_number}E${ep.episode_number}${name}`,
        url: `${SITE_URL}/title/tv/${t.id}`,
      },
    ];
  });
  // series on the watchlist already show up above through their next episode, so only films here
  const releases = pool(
    listed.filter((w) => w.mediaType === "movie"),
    8,
    async (w): Promise<CalendarEvent[]> => {
      const t = await getTitle("movie", String(w.tmdbId)).catch(() => null);
      if (!t) return [];
      const cinema = theatricalDate(t, DEFAULT_COUNTRY);
      const date = cinema ?? t.release_date;
      if (!date || date < today) return [];
      const title = t.title ?? w.title;
      return [
        {
          uid: `movie-${t.id}@lateshow`,
          date,
          summary: cinema ? `${title} in cinemas` : `${title} out`,
          url: `${SITE_URL}/title/movie/${t.id}`,
        },
      ];
    },
  );

  const events = (await Promise.all([episodes, releases])).flat(2).toSorted((a, b) => a.date.localeCompare(b.date));
  return buildIcs(events, now);
}
