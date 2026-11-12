import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { redirect } from "next/navigation";
import { PosterLink } from "@/components/PosterLink";
import { buttonStyles } from "@/components/ui/button";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { FriendMenu } from "@/components/friends/FriendMenu";
import { InviteButton } from "@/components/friends/InviteButton";
import { getSession } from "@/lib/auth";
import { ago } from "@/lib/ago";
import { getInviteLink, removeFriend } from "@/lib/friends/actions";
import { getFriendCount, getFriends } from "@/lib/friends/queries";
import { MIN_TITLES } from "@/lib/friends/match";
import { getMatch } from "@/lib/friends/taste";
import { shownName } from "@/lib/username";
import { getHistory, getStats, getWatchlist, getWatchTimes } from "@/lib/library/queries";
import { getLanguage } from "@/lib/region";
import { getTitle, img, titleToCard, type Card } from "@/lib/tmdb";
import { TmdbImage } from "@/components/TmdbImage";
import { SignOutButton } from "./components/SignOutButton";
import { YearHeatmap } from "./components/YearHeatmap";
import { yearGrid } from "./yearGrid";

const TABS = ["overview", "history", "watchlist", "friends"] as const;
type Tab = (typeof TABS)[number];

/** Whose profile this is. A friend's comes with when you became friends. */
export type Owner = {
  id: string;
  username: string | null;
  createdAt: Date;
  shareActivity: boolean;
  image?: string | null;
  friendsSince?: Date;
};
type Row = { mediaType: "movie" | "tv"; tmdbId: number; title: string; posterPath: string | null };

const toCard = (r: Row): Card => ({ id: r.tmdbId, media_type: r.mediaType, title: r.title, poster_path: r.posterPath });
/** Rows as full TMDB cards (current poster, year, genre, same as Home), the stored row when TMDB fails. */
const fullCards = (rows: Row[], lang: string) =>
  Promise.all(
    rows.map((r) =>
      getTitle(r.mediaType, String(r.tmdbId), lang)
        .then((t) => titleToCard(t, r.mediaType))
        .catch(() => toCard(r)),
    ),
  );
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const shortDate = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });
const dayLabel = (d: Date, now: Date) => {
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return shortDate(d);
  // older ones by month, so a show watched one episode a week isn't a heading per row
  return d.toLocaleDateString("en", {
    month: "long",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * A profile: yours (at /u/me, or /u/yourname once you have a username) or a friend's (`owner` given, their username
 * address). `base` keeps the tabs on the address you came from. A friend who doesn't share shows only their name.
 */
export async function Profile({
  searchParams,
  base = "/u/me",
  owner: friend,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
  base?: string;
  owner?: Owner;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const self = !friend;
  const owner: Owner = friend ?? {
    id: session.user.id,
    username: session.user.username ?? null,
    createdAt: session.user.createdAt,
    shareActivity: true,
    image: session.user.image,
  };
  // yours: the watchlist has its own page (/watchlist). A friend's: their watchlist is a tab here.
  const tabs = TABS.filter((t) => (self ? t !== "watchlist" : t !== "friends"));
  const { tab: raw } = await searchParams;
  const tab: Tab = tabs.find((t) => t === raw) ?? "overview";

  const uid = owner.id;
  const now = new Date();
  const name = owner.username || shownName(session.user);
  const hidden = !self && !owner.shareActivity;
  const lang = await getLanguage();
  // A friend who keeps their activity private: nothing of theirs is even read, not just hidden.
  const none = Promise.resolve([] as never[]);
  const [stats, history, watchlist, times, friendCount, friends] = await Promise.all([
    hidden ? { movies: 0, episodes: 0, minutes: 0 } : getStats(uid),
    hidden ? none : getHistory(uid, 60),
    hidden ? none : getWatchlist(uid),
    hidden ? none : getWatchTimes(uid, new Date(now.getTime() - 380 * 24 * 60 * 60 * 1000)),
    self ? getFriendCount(uid) : 0,
    self && tab === "friends"
      ? getFriends(uid).then((list) =>
          Promise.all(
            list.map(async (f) => ({
              ...f,
              match: f.shareActivity ? (await getMatch(uid, f.id, lang)).percent : null,
              // their last few titles, so each friend shows as posters, not just a line of text
              recent: f.shareActivity
                ? await fullCards(uniqueTitles(await getHistory(f.id, 30)).slice(0, 6), lang)
                : [],
            })),
          ),
        )
      : [],
  ]);
  // a friend's profile leads with how alike your taste is, and the titles you both watched
  const match = !self && !hidden ? await getMatch(session.user.id, uid, lang) : null;
  // full TMDB cards (poster, year, genre) for the shared titles, the stored rows only have a title
  const [both, recent, listCards] = await Promise.all([
    fullCards((match?.both ?? []).slice(0, 12), lang),
    fullCards(uniqueTitles(history).slice(0, 12), lang),
    tab === "watchlist" ? fullCards(watchlist, lang) : [],
  ]);
  const month = (d: Date) => d.toLocaleDateString("en", { month: "long", year: "numeric" });
  const empty = stats.movies + stats.episodes === 0;

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-10">
        {/* relative z-10: the invite card hangs from here over the page, above the sections' own layers */}
        <div className="relative z-10 flex rise flex-wrap items-center gap-5">
          <Avatar name={name} image={owner.image} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-body font-semibold">{name}</div>
            <div className="text-small text-muted">
              {self
                ? `Since ${month(owner.createdAt)}`
                : `Friends since ${month(owner.friendsSince ?? owner.createdAt)}`}
              {friendCount > 0 && ` · ${plural(friendCount, "friend")}`}
            </div>
          </div>
          {self ? (
            <>
              <InviteButton getLink={getInviteLink} />
              <div className="flex gap-6">
                <Link href="/settings" className={buttonStyles("text", "text")}>
                  Settings
                </Link>
                <SignOutButton />
              </div>
            </>
          ) : (
            <FriendMenu friendId={owner.id} name={name} remove={removeFriend} />
          )}
        </div>

        {hidden && (
          <h1 className="rise text-page leading-none font-bold">
            {name} keeps
            <br />
            <span className="text-muted">their activity private.</span>
          </h1>
        )}

        {hidden ? null : empty ? (
          <div className="flex rise flex-col items-start gap-6">
            <h1 className="text-page leading-none font-bold">
              Nothing watched yet.
              <br />
              <span className="text-muted">{self ? "Your" : "Their"} year starts here.</span>
            </h1>
            {self && (
              <Link href="/search" className={buttonStyles("primary", "sm")}>
                Find something to watch
              </Link>
            )}
          </div>
        ) : (
          <div className="flex rise flex-col gap-4">
            <h1 className="text-page leading-none font-bold">
              {match?.percent != null ? (
                <>
                  {match.percent}% taste match.
                  <br />
                  <span className="text-muted">
                    {stats.minutes >= 60
                      ? plural(Math.round(stats.minutes / 60), "hour")
                      : plural(stats.minutes, "minute")}{" "}
                    watched.
                  </span>
                </>
              ) : (
                <>
                  {stats.minutes >= 60
                    ? plural(Math.round(stats.minutes / 60), "hour")
                    : plural(stats.minutes, "minute")}{" "}
                  watched.
                  <br />
                  <span className="text-muted">
                    {plural(stats.movies, "movie")}, {plural(stats.episodes, "episode")}.
                  </span>
                </>
              )}
            </h1>
            {match && match.percent === null && (
              <p className="text-small text-muted">Your taste match shows once you both watched {MIN_TITLES} titles.</p>
            )}
          </div>
        )}

        {!hidden && (
          <SegmentedTabs
            label="Profile"
            items={tabs.map((t) => ({
              key: t,
              label: t.charAt(0).toUpperCase() + t.slice(1),
              active: t === tab,
              href: t === "overview" ? base : `${base}?tab=${t}`,
            }))}
          />
        )}
      </div>

      {!hidden && tab === "overview" && (
        <>
          {match && match.both.length > 0 && (
            <Section
              title="You both watched"
              aside={<p className="text-small text-muted">{plural(match.both.length, "title")}</p>}
            >
              <PosterGrid>
                {both.map((c, i) => (
                  <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} morph={false} />
                ))}
              </PosterGrid>
            </Section>
          )}
          <Section
            title={self ? "Your year" : "Their year"}
            aside={<p className="text-small text-muted">Each square is a day.</p>}
          >
            <YearHeatmap days={yearGrid(times, now)} />
          </Section>
          {history.length > 0 && (
            <Section title="Recently watched">
              <PosterGrid>
                {recent.map((c, i) => (
                  <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
                ))}
              </PosterGrid>
            </Section>
          )}
        </>
      )}

      {!hidden &&
        tab === "history" &&
        (history.length === 0 ? (
          <Empty text="Nothing watched yet." action={self} />
        ) : (
          <div className="flex max-w-reading flex-col gap-8">
            {byWhen(history, now).map(([day, rows]) => (
              <section key={day} className="flex flex-col gap-1">
                <h2 className="text-small font-medium text-muted">{day}</h2>
                <ol className="flex flex-col">
                  {rows.map((r) => {
                    const poster = img(r.posterPath, "w92");
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/title/${r.mediaType}/${r.tmdbId}`}
                          className="group -mx-3 flex items-center gap-4 rounded-thumb px-3 py-2 transition-colors duration-200 hover:bg-fg/5"
                        >
                          <span className="relative aspect-poster w-10 shrink-0 overflow-hidden rounded-md bg-raised">
                            {poster && <TmdbImage src={poster} lowSrc={poster} alt="" sizes="40px" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-body font-medium">{r.title}</span>
                            <span className="block text-small text-muted nums">
                              {r.mediaType === "movie" ? "Movie" : `Season ${r.season}, episode ${r.episode}`}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        ))}

      {!hidden &&
        tab === "watchlist" &&
        (watchlist.length === 0 ? (
          <Empty text={self ? "Your watchlist is empty." : "Their watchlist is empty."} action={self} />
        ) : (
          <PosterGrid>
            {listCards.map((c, i) => (
              <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
            ))}
          </PosterGrid>
        ))}

      {tab === "friends" &&
        (friends.length === 0 ? (
          <p className="text-body text-muted">
            No friends yet.
            <br />
            Invite one with the button at the top.
          </p>
        ) : (
          <ul className="flex flex-col gap-section">
            {friends.map((f) => (
              <li key={f.id} className="flex flex-col gap-5">
                <Link href={`/u/${f.username}`} className="group flex items-center gap-4 rounded-thumb">
                  <Avatar name={f.username ?? "?"} image={f.image} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-section font-bold transition-colors group-hover:text-accent">
                      {f.username}
                    </div>
                    <div className="truncate text-small text-muted">
                      {!f.shareActivity
                        ? "Keeps their activity private"
                        : f.last
                          ? `Watched ${f.last.title}${f.last.mediaType === "tv" ? ` S${f.last.season} E${f.last.episode}` : ""} · ${ago(f.last.watchedAt, now)}`
                          : "Nothing watched yet"}
                    </div>
                  </div>
                  {f.match !== null && (
                    <div className="shrink-0 text-right">
                      <div className="text-section leading-none font-bold nums">{f.match}%</div>
                      <div className="text-caption text-muted">match</div>
                    </div>
                  )}
                </Link>
                {f.recent.length > 0 && (
                  <PosterGrid>
                    {/* one full row at every width: 4 on phones (2 rows of 2), 3, 4, then all 6 */}
                    {f.recent.map((c, i) => (
                      <div
                        key={`${c.media_type}-${c.id}`}
                        className={i >= 4 ? "hidden lg:block" : i === 3 ? "sm:max-md:hidden" : ""}
                      >
                        <PosterLink card={c} index={i} morph={false} />
                      </div>
                    ))}
                  </PosterGrid>
                )}
              </li>
            ))}
          </ul>
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

/** History rows grouped under "Today", "Yesterday", "Nov 9", then "October", newest first (rows come sorted). */
function byWhen<T extends { watchedAt: Date }>(rows: T[], now: Date) {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const day = dayLabel(r.watchedAt, now);
    groups.set(day, [...(groups.get(day) ?? []), r]);
  }
  return [...groups];
}

function Empty({ text, action }: { text: string; action: boolean }) {
  return (
    <div className="flex flex-col items-start gap-5">
      <p className="text-body text-muted">{text}</p>
      {action && (
        <Link href="/search" className={buttonStyles("primary", "sm")}>
          Find something to watch
        </Link>
      )}
    </div>
  );
}
