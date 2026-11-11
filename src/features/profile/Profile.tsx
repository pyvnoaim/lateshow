import Link from "next/link";
import { redirect } from "next/navigation";
import { PosterLink } from "@/components/PosterLink";
import { buttonStyles } from "@/components/ui/button";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { getSession } from "@/lib/auth";
import { getHistory, getStats, getWatchlist, getWatchTimes } from "@/lib/library/queries";
import type { Card } from "@/lib/tmdb";
import { SignOutButton } from "./components/SignOutButton";
import { YearHeatmap } from "./components/YearHeatmap";
import { yearGrid } from "./yearGrid";

const TABS = ["overview", "history", "watchlist"] as const;
type Tab = (typeof TABS)[number];
type Row = { mediaType: "movie" | "tv"; tmdbId: number; title: string; posterPath: string | null };

const toCard = (r: Row): Card => ({ id: r.tmdbId, media_type: r.mediaType, title: r.title, poster_path: r.posterPath });
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const shortDate = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });

export async function Profile({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { tab: raw } = await searchParams;
  const tab: Tab = TABS.find((t) => t === raw) ?? "overview";

  const uid = session.user.id;
  const now = new Date();
  const [stats, history, watchlist, times] = await Promise.all([
    getStats(uid),
    getHistory(uid, 60),
    getWatchlist(uid),
    getWatchTimes(uid, new Date(now.getTime() - 380 * 24 * 60 * 60 * 1000)),
  ]);
  const name = session.user.name || session.user.email.split("@")[0];
  const since = session.user.createdAt.toLocaleDateString("en", { month: "long", year: "numeric" });
  const empty = stats.movies + stats.episodes === 0;

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-10">
        <div className="flex rise flex-wrap items-center gap-5">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent text-section font-bold text-bg">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-body font-semibold">{name}</div>
            <div className="text-small text-muted">Since {since}</div>
          </div>
          <div className="-mr-5 text-muted">
            <SignOutButton />
          </div>
        </div>

        {empty ? (
          <div className="flex rise flex-col items-start gap-6">
            <h1 className="text-page leading-none font-bold">
              Nothing watched yet.
              <br />
              <span className="text-muted">Your year starts here.</span>
            </h1>
            <Link href="/search" className={buttonStyles("primary", "sm")}>
              Find something to watch
            </Link>
          </div>
        ) : (
          <h1 className="rise text-page leading-none font-bold">
            {stats.minutes >= 60 ? plural(Math.round(stats.minutes / 60), "hour") : plural(stats.minutes, "minute")}{" "}
            watched.
            <br />
            <span className="text-muted">
              {plural(stats.movies, "movie")}, {plural(stats.episodes, "episode")}.
            </span>
          </h1>
        )}

        <SegmentedTabs
          label="Profile"
          items={TABS.map((t) => ({
            key: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
            active: t === tab,
            href: t === "overview" ? "/u/me" : `/u/me?tab=${t}`,
          }))}
        />
      </div>

      {tab === "overview" && (
        <>
          <Section title="Your year" aside={<p className="text-small text-muted">Each square is a day.</p>}>
            <YearHeatmap days={yearGrid(times, now)} />
          </Section>
          {history.length > 0 && (
            <Section title="Recently watched">
              <PosterGrid>
                {uniqueTitles(history)
                  .slice(0, 12)
                  .map((r, i) => (
                    <PosterLink key={`${r.mediaType}-${r.tmdbId}`} card={toCard(r)} index={i} />
                  ))}
              </PosterGrid>
            </Section>
          )}
        </>
      )}

      {tab === "history" &&
        (history.length === 0 ? (
          <Empty text="Nothing watched yet." />
        ) : (
          <ol className="flex max-w-reading flex-col">
            {history.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/title/${r.mediaType}/${r.tmdbId}`}
                  className="-mx-3 flex h-16 items-center gap-6 rounded-thumb px-3 transition-colors duration-200 hover:bg-fg/5"
                >
                  <span className="w-16 text-small text-muted nums">{shortDate(r.watchedAt)}</span>
                  <span className="min-w-0 flex-1 truncate text-body font-medium">{r.title}</span>
                  <span className="text-small text-muted nums">
                    {r.mediaType === "movie" ? "Movie" : `S${r.season} E${r.episode}`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ))}

      {tab === "watchlist" &&
        (watchlist.length === 0 ? (
          <Empty text="Your watchlist is empty." />
        ) : (
          <PosterGrid>
            {watchlist.map((r, i) => (
              <PosterLink key={`${r.mediaType}-${r.tmdbId}`} card={toCard(r)} index={i} />
            ))}
          </PosterGrid>
        ))}
    </div>
  );
}

function uniqueTitles(rows: Row[]) {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${r.mediaType}-${r.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-start gap-5">
      <p className="text-body text-muted">{text}</p>
      <Link href="/search" className={buttonStyles("primary", "sm")}>
        Find something to watch
      </Link>
    </div>
  );
}
