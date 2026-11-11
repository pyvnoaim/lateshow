import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { getSession } from "@/lib/auth";
import { getFriends } from "@/lib/friends/queries";
import { createRoom } from "@/lib/rooms/actions";
import { JoinByCode } from "./components/JoinByCode";
import { StartForm } from "./components/StartForm";

/** /rooms: open a room (signed in) or join one by code (anyone). */
export async function RoomStart() {
  const session = await getSession();
  const friends = session ? (await getFriends(session.user.id)).filter((f) => f.username) : [];
  return (
    <div className="flex flex-col gap-section">
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
      {session ? (
        <StartForm friends={friends.map((f) => ({ id: f.id, username: f.username! }))} create={createRoom} />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <Link href="/login?next=/rooms" className={buttonStyles("primary", "md")}>
            Sign in to start a room
          </Link>
        </div>
      )}
      <JoinByCode />
    </div>
  );
}
