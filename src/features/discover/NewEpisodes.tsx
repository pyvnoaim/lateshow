import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { getSession } from "@/lib/auth";
import { getRecentShows, getWatchlist } from "@/lib/library/queries";
import { getTitle, img } from "@/lib/tmdb";

const DAY = 24 * 60 * 60 * 1000;

/** Today and a week from now as YYYY-MM-DD (UTC). Runs per request, the session above made this dynamic. */
function nextSevenDays() {
  const now = Date.now();
  return {
    today: new Date(now).toISOString().slice(0, 10),
    weekEnd: new Date(now + 7 * DAY).toISOString().slice(0, 10),
  };
}

function when(airDate: string, today: string) {
  const diff = Math.round((Date.parse(airDate) - Date.parse(today)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Date(airDate).toLocaleDateString("en", { weekday: "long", timeZone: "UTC" });
}

/** New episodes in the next 7 days of shows you watch or have on your watchlist. */
export async function NewEpisodes() {
  const session = await getSession();
  if (!session) return null;
  const uid = session.user.id;
  const [recent, listed] = await Promise.all([getRecentShows(uid, 30), getWatchlist(uid)]);
  const ids = [
    ...new Set([...recent.map((r) => r.tmdbId), ...listed.filter((w) => w.mediaType === "tv").map((w) => w.tmdbId)]),
  ];

  const { today, weekEnd } = nextSevenDays();
  const shows = await Promise.all(ids.map((id) => getTitle("tv", String(id)).catch(() => null)));
  const upcoming = shows
    .flatMap((t) => {
      const ep = t?.next_episode_to_air;
      return t && ep && ep.air_date >= today && ep.air_date <= weekEnd ? [{ t, ep }] : [];
    })
    .toSorted((a, b) => a.ep.air_date.localeCompare(b.ep.air_date))
    .slice(0, 6);
  if (upcoming.length === 0) return null;

  return (
    <Section title="New episodes this week">
      <ul className="grid grid-cols-1 gap-x-10 gap-y-2 md:grid-cols-2">
        {upcoming.map(({ t, ep }) => (
          <li key={t.id}>
            <Link
              href={`/title/tv/${t.id}`}
              className="-mx-3 flex items-center gap-4 rounded-thumb px-3 py-2 transition-colors duration-200 hover:bg-fg/5"
            >
              <div className="relative aspect-poster w-12 shrink-0 overflow-hidden rounded-thumb bg-raised">
                {t.poster_path && (
                  <Image src={img(t.poster_path, "w185")!} alt="" fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-label font-medium">{t.name}</div>
                <div className="truncate text-caption text-muted nums">
                  S{ep.season_number} E{ep.episode_number}
                  {ep.name && ` · ${ep.name}`}
                </div>
              </div>
              <span className="shrink-0 text-label text-accent">{when(ep.air_date, today)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
