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
import { areFriends, getFriendCount, getFriends, getUserByUsername } from "@/lib/friends/queries";
import { MIN_TITLES } from "@/lib/friends/match";
import { getMatch } from "@/lib/friends/taste";
import { createList } from "@/lib/lists/actions";
import { getListsOf } from "@/lib/lists/queries";
import { VISIBILITY } from "@/lib/lists/rules";
import { shownName } from "@/lib/username";
import {
  getHistory,
  getRecentTitles,
  getWatchedBetween,
  getWatchYears,
  getStats,
  getWatchlist,
  getWatchTimes,
} from "@/lib/library/queries";
import { getLanguage } from "@/lib/region";
import { getTitle, img, titleToCard, type Card } from "@/lib/tmdb";
import { TmdbImage } from "@/components/TmdbImage";
import { SignOutButton } from "./components/SignOutButton";
import { YearHeatmap } from "./components/YearHeatmap";
import { NewListForm } from "./components/NewListForm";
import { yearGrid } from "./yearGrid";
import { dayTitles, episodesLabel, historyEntries } from "./history";
import type { PeekTitle } from "./components/DayPeek";

const HISTORY_PAGE = 300;
const MAX_PAGES = 1000;
const TABS = ["overview", "history", "watchlist", "lists", "friends"] as const;
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
  searchParams: Promise<{
    tab?: string | string[];
    more?: string | string[];
    year?: string | string[];
  }>;
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
  const { tab: raw, more, year: rawYear } = await searchParams;
  // /u/me is only a shortcut for links: with a username you land on /u/yourname, the address you can share
  if (self && base === "/u/me" && owner.username) {
    const query = new URLSearchParams(
      Object.entries({ tab: raw, more, year: rawYear }).filter((e): e is [string, string] => typeof e[1] === "string"),
    );
    redirect(`/u/${owner.username}${query.size ? `?${query}` : ""}`);
  }
  const tab: Tab = tabs.find((t) => t === raw) ?? "overview";
  // History pages by "Show older", each one adds HISTORY_PAGE rows (they render from the db alone, no TMDB calls).
  // ponytail: every click rerenders the earlier pages too, bounded by the user's own rows. A cursor if that gets slow.
  // MAX_PAGES (300k rows) keeps the LIMIT a sane integer whatever ?more= says, and the link stops there so it can't loop
  const pages = tab === "history" ? Math.min(Math.max(Math.floor(Number(more)) || 1, 1), MAX_PAGES) : 1;

  const uid = owner.id;
  const now = new Date();
  // the heatmap shows one calendar year, ?year= an older one, this year by default
  const thisYear = now.getUTCFullYear();
  const y = Number(rawYear);
  const year = tab === "overview" && Number.isInteger(y) && y >= 1900 && y <= thisYear ? y : thisYear;
  const name = owner.username || shownName(session.user);
  const hidden = !self && !owner.shareActivity;
  const lang = await getLanguage();
  // A friend who keeps their activity private: nothing of theirs is even read, not just hidden.
  const none = Promise.resolve([] as never[]);
  const [stats, history, watchlist, times, watchYears, friendCount, friends] = await Promise.all([
    hidden ? { movies: 0, episodes: 0, minutes: 0 } : getStats(uid),
    hidden || tab !== "history" ? none : getHistory(uid, pages * HISTORY_PAGE + 1),
    hidden ? none : getWatchlist(uid),
    hidden ? none : getWatchTimes(uid, new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1))),
    hidden || tab !== "overview" ? [] : getWatchYears(uid),
    self ? getFriendCount(uid) : 0,
    self && tab === "friends"
      ? getFriends(uid).then((list) =>
          Promise.all(
            list.map(async (f) => {
              // match and posters side by side, each friend in parallel
              const [match, recent] = f.shareActivity
                ? await Promise.all([
                    getMatch(uid, f.id, lang).then((m) => m.percent),
                    // their last few titles, so each friend shows as posters, not just a line of text
                    getRecentTitles(f.id, 6).then((rows) => fullCards(rows, lang)),
                  ])
                : [null, []];
              return { ...f, match, recent };
            }),
          ),
        )
      : [],
  ]);
  // a friend's profile leads with how alike your taste is, and the titles you both watched
  const match = !self && !hidden ? await getMatch(session.user.id, uid, lang) : null;
  // full TMDB cards (poster, year, genre) for the shared titles, the stored rows only have a title
  const [both, recent, listCards, lists] = await Promise.all([
    fullCards((match?.both ?? []).slice(0, 12), lang),
    hidden || tab !== "overview" ? [] : getRecentTitles(uid, 12).then((rows) => fullCards(rows, lang)),
    tab === "watchlist" ? fullCards(watchlist, lang) : [],
    tab === "lists" && !hidden ? getListsOf(uid, session.user.id) : [],
  ]);
  const month = (d: Date) => d.toLocaleDateString("en", { month: "long", year: "numeric" });
  const empty = stats.movies + stats.episodes === 0;
  // the heatmap's day card. Next binds uid and the username in encrypted, and access is checked again on every call:
  // signed in, and for a friend's profile still friends and still sharing (they may have turned it off since)
  const friendName = self ? null : owner.username;
  async function peekDay(date: string): Promise<PeekTitle[]> {
    "use server";
    const start = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00Z`) : NaN;
    const me = await getSession();
    if (!me || Number.isNaN(start)) return [];
    if (uid !== me.user.id) {
      const them = friendName ? await getUserByUsername(friendName) : null;
      if (!them || them.id !== uid || !them.shareActivity || !(await areFriends(me.user.id, uid))) return [];
    }
    const rows = await getWatchedBetween(uid, new Date(start), new Date(start + 86_400_000));
    return dayTitles(rows).map(({ row: r, episodes }) => ({
      key: `${r.mediaType}-${r.tmdbId}`,
      title: r.title,
      meta: episodesLabel(episodes),
      poster: img(r.posterPath, "w92") ?? null,
      href: `/title/${r.mediaType}/${r.tmdbId}`,
    }));
  }
  // a year switcher only for years with watches (this year always), and only once there's one before this year
  const years = watchYears.some((n) => n < thisYear) ? [thisYear, ...watchYears.filter((n) => n < thisYear)] : [];

  return (
    <div className="group/profile flex flex-col gap-section">
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
              {/* quiet links first, the one button at the edge */}
              <div className="flex gap-6">
                <Link href="/settings" className={buttonStyles("text", "text")}>
                  Settings
                </Link>
                <SignOutButton />
              </div>
              <InviteButton getLink={getInviteLink} />
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

      {/* the old tab dims while the next one renders on the server (SegmentedTabs sets data-pending) */}
      <div className="flex flex-col gap-section transition-opacity duration-200 group-has-data-pending/profile:opacity-40">
        {!hidden && tab === "overview" && (
          <>
            {match && match.both.length > 0 && (
              <Section title="You both watched" description={plural(match.both.length, "title")}>
                <PosterGrid>
                  {both.map((c, i) => (
                    <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} morph={false} />
                  ))}
                </PosterGrid>
              </Section>
            )}
            <Section
              title={year === thisYear ? (self ? "Your year" : "Their year") : `${self ? "Your" : "Their"} ${year}`}
              description="Each square is a day."
              aside={
                years.length > 0 && (
                  <SegmentedTabs
                    label="Year"
                    items={years.map((n) => ({
                      key: String(n),
                      label: String(n),
                      active: n === year,
                      href: n === thisYear ? base : `${base}?year=${n}`,
                    }))}
                  />
                )
              }
              asideAt="end"
            >
              <YearHeatmap days={yearGrid(times, now, year)} peek={peekDay} />
            </Section>
            {recent.length > 0 && (
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
            <div className="flex flex-col gap-6">
              {historyEntries(history.slice(0, pages * HISTORY_PAGE), (d) => dayLabel(d, now)).map(([day, entries]) => (
                // wide screens: the day in a left column, its titles side by side, so a day is one band, not a tall list
                <section key={day} className="flex flex-col gap-1 md:flex-row md:gap-8">
                  <h2 className="text-small font-medium text-muted md:w-28 md:shrink-0 md:pt-3">{day}</h2>
                  <HistoryList entries={entries} />
                </section>
              ))}
              {history.length > pages * HISTORY_PAGE && pages < MAX_PAGES && (
                <Link
                  href={`${base}?tab=history&more=${pages + 1}`}
                  scroll={false}
                  className={buttonStyles("text", "text", "self-start")}
                >
                  Show older
                </Link>
              )}
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

        {!hidden && tab === "lists" && (
          <div className="flex flex-col gap-10">
            {self && <NewListForm create={createList.bind(null, null)} />}
            {lists.length === 0 ? (
              <p className="text-body text-muted">
                {self ? "No lists yet. Name one above, then add titles from any title page." : "No lists shared yet."}
              </p>
            ) : (
              <PosterGrid>
                {lists.map((l, i) => (
                  <Link
                    key={l.id}
                    href={`/l/${l.id}`}
                    className="group flex rise flex-col gap-2.5 rounded-poster"
                    style={{ animationDelay: `${Math.min(i, 12) * 80}ms` }}
                  >
                    {/* the first four posters as a 2 by 2 mosaic, poster shaped like every other card */}
                    <div className="grid aspect-poster lift grid-cols-2 grid-rows-2 overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
                      {l.posters.map((p) => (
                        <span key={p} className="relative overflow-hidden">
                          <TmdbImage src={img(p, "w185")!} lowSrc={img(p, "w92")!} alt="" sizes="100px" />
                        </span>
                      ))}
                    </div>
                    <span className="flex flex-col gap-1">
                      <span className="truncate text-label font-medium">{l.name}</span>
                      <span className="text-caption text-muted nums">
                        {l.count} {l.count === 1 ? "title" : "titles"}
                        {self && ` · ${VISIBILITY.find((v) => v.key === l.visibility)?.label}`}
                      </span>
                    </span>
                  </Link>
                ))}
              </PosterGrid>
            )}
          </div>
        )}

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
    </div>
  );
}

type WatchedRow = Awaited<ReturnType<typeof getHistory>>[number];

/** One day's titles: small poster, title, which episodes. Side by side on wide screens. */
function HistoryList({ entries }: { entries: { row: WatchedRow; episodes: WatchedRow[] }[] }) {
  return (
    <ol className="grid flex-1 gap-x-8 lg:grid-cols-2 2xl:grid-cols-3">
      {entries.map(({ row: r, episodes }) => {
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
                <span className="block text-small text-muted nums">{episodesLabel(episodes)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
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

/** Shaped like the profile (avatar line, headline, tabs, a section), so the switch in isn't a black page. */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-col gap-10">
        <div className="flex items-center gap-5">
          <div className="size-16 sk rounded-full" />
          <div className="flex flex-col gap-2">
            <div className="h-5 w-32 sk rounded-full" />
            <div className="h-4 w-44 sk rounded-full" />
          </div>
        </div>
        <div className="h-24 w-2/3 sk rounded-poster" />
        <div className="h-6 w-72 sk rounded-full" />
      </div>
      <div className="h-48 sk rounded-poster" />
    </div>
  );
}
