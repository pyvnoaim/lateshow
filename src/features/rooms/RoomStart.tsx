import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { getFriends } from "@/lib/friends/queries";
import { getRegion } from "@/lib/region";
import { createRoom } from "@/lib/rooms/actions";
import { getTrending, img } from "@/lib/tmdb";
import { JoinByCode } from "./components/JoinByCode";
import { StartForm } from "./components/StartForm";

const posterUrls = (cards: { poster_path?: string | null }[]) =>
  cards.flatMap((c) => img(c.poster_path, "w342") ?? []).slice(0, 5);

/** /rooms: open a room (signed in) or join one by code (anyone). */
export async function RoomStart() {
  const session = await getSession();
  const { lang } = await getRegion();
  const [friends, movies, shows] = await Promise.all([
    session ? getFriends(session.user.id) : [],
    getTrending("movie", 1, lang).catch(() => []),
    getTrending("tv", 1, lang).catch(() => []),
  ]);
  return (
    <div className="flex flex-col gap-14">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-8">
        <div className="flex rise flex-col gap-4">
          <h1 className="text-page leading-none font-bold">
            Watch together.
            <br />
            <span className="text-muted">Decide together.</span>
          </h1>
          <p className="text-body leading-normal text-muted">
            Only titles on services you all have.
            <br />
            Everyone plays on their own phone.
          </p>
        </div>
        <JoinByCode />
      </div>
      {session ? (
        <StartForm
          friends={friends.filter((f) => f.username).map((f) => ({ id: f.id, username: f.username!, image: f.image }))}
          posters={{ movie: posterUrls(movies), tv: posterUrls(shows) }}
          needsUsername={!session.user.username}
          create={createRoom}
        />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <Link href="/login?next=/rooms" className={buttonStyles("primary", "md")}>
            Sign in to start a room
          </Link>
        </div>
      )}
    </div>
  );
}
