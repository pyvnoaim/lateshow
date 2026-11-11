import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { GAMES } from "@/lib/rooms/games";
import { getRoomInvites } from "@/lib/rooms/queries";

/** On Home: a friend opened a room and invited you. One line per room, with Join. */
export async function RoomInvites() {
  const session = await getSession();
  if (!session) return null;
  const rooms = await getRoomInvites(session.user.id);
  if (rooms.length === 0) return null;
  return (
    <ul className="flex flex-col gap-3">
      {rooms.map((r) => (
        <li key={r.code} className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-banner p-5 pl-7 glass">
          <span className="min-w-0 flex-1">
            <span className="block text-body font-semibold">{r.host} opened a room for you</span>
            <span className="block text-small text-muted">
              {r.kind === "movie" ? "Movie" : "Series"} · {GAMES.find((g) => g.id === r.game)?.name}
            </span>
          </span>
          <Link href={`/rooms/${r.code}`} className={buttonStyles("primary", "sm")}>
            Join
          </Link>
        </li>
      ))}
    </ul>
  );
}
