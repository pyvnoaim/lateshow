import Image from "next/image";
import { getLanguage } from "@/lib/region";
import { playAgain, swipe } from "@/lib/rooms/actions";
import { getVotes } from "@/lib/rooms/queries";
import { getTitle, img, pickTrailer, shortGenre, subscriptionServices } from "@/lib/tmdb";
import { PlayAgain } from "./components/RoomButtons";
import { SwipeDeck, type SwipeCard } from "./components/SwipeDeck";
import { Winner, type Room } from "./Winner";

/** Swipe, for one member: your cards, who's still going, and the match (or no match) for everyone at once. */
export async function SwipeGame({ r, meId }: { r: Room; meId: string }) {
  const lang = await getLanguage();
  const deck = r.deck ?? [];
  const votes = await getVotes(r.code);
  const members = r.members.filter((m) => m.joined);
  const host = r.hostId === meId;
  const count = (id: string) => votes.filter((v) => v.memberId === id).length;

  if (r.winner) {
    return (
      <Winner
        r={r}
        host={host}
        eyebrow="It's a match"
        detail={
          members.length === 1
            ? "You said yes"
            : members.length === 2
              ? "Both of you said yes"
              : `All ${members.length} of you said yes`
        }
      />
    );
  }

  const mine = new Set(votes.filter((v) => v.memberId === meId).map((v) => v.tmdbId));
  const remaining = deck.filter((id) => !mine.has(id));
  const stillGoing = members.filter((m) => count(m.memberId) < deck.length);
  const faces = (
    <div className="flex items-center gap-3">
      <div className="flex">
        {members.map((m, i) => (
          <span
            key={m.memberId}
            data-tip={m.name}
            data-tip-meta={count(m.memberId) >= deck.length ? "Done" : `${deck.length - count(m.memberId)} to go`}
            className={`flex size-8 items-center justify-center rounded-full text-caption font-bold ring-2 ring-bg ${i > 0 ? "-ml-2" : ""} ${count(m.memberId) >= deck.length ? "glass-cell text-muted" : "glass-accent"}`}
          >
            {m.name.charAt(0).toUpperCase()}
          </span>
        ))}
      </div>
      <span className="text-caption text-muted nums">
        {remaining.length > 0 ? `${remaining.length} left for you` : `${stillGoing.length} still swiping`}
      </span>
    </div>
  );

  if (remaining.length === 0) {
    // everyone is through and nothing got a yes from all: the most liked ones
    if (stillGoing.length === 0) {
      const likes = new Map<number, number>();
      for (const v of votes) if (v.like) likes.set(v.tmdbId, (likes.get(v.tmdbId) ?? 0) + 1);
      const top = [...likes.entries()].toSorted((a, b) => b[1] - a[1]).slice(0, 3);
      const titles = await Promise.all(
        top.map(([id, n]) => getTitle(r.kind, String(id), lang).then((t) => ({ t, n }))),
      );
      return (
        <div className="flex flex-col gap-10">
          <h1 className="text-page leading-none font-bold">
            No match this time.
            <br />
            <span className="text-muted">{titles.length > 0 ? "Closest calls:" : "Nobody said yes."}</span>
          </h1>
          <ul className="grid max-w-reading grid-cols-3 gap-5">
            {titles.map(({ t, n }) => (
              <li key={t.id} className="flex flex-col gap-2.5">
                <div className="relative aspect-poster overflow-hidden rounded-poster bg-raised">
                  {t.poster_path && (
                    <Image src={img(t.poster_path, "w342")!} alt="" fill sizes="200px" className="object-cover" />
                  )}
                </div>
                <span className="text-label font-medium">{t.title ?? t.name}</span>
                <span className="-mt-2 text-caption text-muted">
                  {n} of {members.length} said yes
                </span>
              </li>
            ))}
          </ul>
          {host && <PlayAgain code={r.code} again={playAgain} />}
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-8">
        {faces}
        <h1 className="text-page leading-none font-bold">
          You&apos;re through.
          <br />
          <span className="text-muted">Waiting for {stillGoing.map((m) => m.name).join(" and ")}.</span>
        </h1>
      </div>
    );
  }

  const cards: SwipeCard[] = await Promise.all(
    remaining.map(async (id) => {
      const t = await getTitle(r.kind, String(id), lang);
      const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
      const length = r.kind === "movie" && t.runtime ? `${Math.floor(t.runtime / 60)} h ${t.runtime % 60} min` : "";
      const services = subscriptionServices(t, r.country ?? "DE");
      return {
        id,
        title: t.title ?? t.name ?? "",
        meta: [r.kind === "movie" ? "Movie" : "Series", year, t.genres[0] && shortGenre(t.genres[0].name), length]
          .filter(Boolean)
          .join(" · "),
        overview: t.overview,
        poster: img(t.poster_path, "w780")!,
        on: (services.find((s) => r.services?.includes(s.id)) ?? services[0])?.name,
        trailer: pickTrailer(t.videos.results)?.key,
      };
    }),
  );

  return (
    <div className="flex flex-col items-center gap-6">
      {faces}
      <SwipeDeck code={r.code} cards={cards} swipe={swipe} />
    </div>
  );
}
