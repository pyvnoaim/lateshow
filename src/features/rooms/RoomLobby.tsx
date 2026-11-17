import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Spinner } from "@/features/rooms/components/Spinner";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { UsernameForm } from "@/components/UsernameForm";
import { buttonStyles } from "@/components/ui/button";
import { joinAsGuest, joinRoom, leaveRoom, phoneQr, startRoom } from "@/lib/rooms/actions";
import { GAMES } from "@/lib/rooms/games";
import { getRoomIdentity } from "@/lib/rooms/identity";
import { getRoom } from "@/lib/rooms/queries";
import { cleanCode } from "@/lib/rooms/rules";
import { AutoJoin, CopyRoomLink, GuestJoin, LeaveRoom, StartRoom } from "./components/RoomButtons";
import { LiveRoom } from "./components/LiveRoom";
import { PhoneQr } from "./components/PhoneQr";
import { BracketGame } from "./BracketGame";
import { ReelGame } from "./ReelGame";
import { SwipeGame } from "./SwipeGame";
import { Winner } from "./Winner";

function Heading({ top, muted, detail }: { top: ReactNode; muted: ReactNode; detail?: ReactNode }) {
  return (
    <div className="flex rise flex-col gap-4">
      {detail && <span className="text-label text-muted">{detail}</span>}
      <h1 className="text-page leading-none font-bold break-words">
        {top}
        <br />
        <span className="text-muted">{muted}</span>
      </h1>
    </div>
  );
}

/** /rooms/<code>: join it, then the live lobby. The game itself starts here in the next build step. */
export async function RoomLobby({ code: raw }: { code: string }) {
  await connection(); // per request: a room's state (and whether it expired) is live, never prerendered
  const code = cleanCode(raw);
  const r = code ? await getRoom(code) : null;
  if (!code || !r || r.status === "done") {
    return (
      <div className="flex flex-col items-start gap-10">
        <Heading top="This room" muted="is closed." />
        <Link href="/rooms" className={buttonStyles("glass", "sm")}>
          Open a new one
        </Link>
      </div>
    );
  }

  const me = await getRoomIdentity();
  const member = me ? r.members.find((m) => m.memberId === me.id && m.joined) : undefined;
  const game = { name: GAMES.find((g) => g.id === r.game)?.name ?? "Plus one" };
  const what = `${r.kind === "movie" ? "Movie" : "Series"} · ${game.name} · hosted by ${r.host}`;

  if (!member) {
    return (
      <div className="flex flex-col gap-10">
        <Heading detail={what} top={`${r.host}'s room.`} muted="Jump in." />
        {me && !me.guest && !me.username ? (
          <div className="flex flex-col items-start gap-4">
            <p className="text-body text-muted">
              First, a name for the room.
              <br />
              Everyone in it sees it, never your email.
            </p>
            <UsernameForm button="Join" />
          </div>
        ) : me && !me.guest ? (
          <AutoJoin code={code} join={joinRoom} />
        ) : (
          <div className="flex flex-col gap-4">
            <GuestJoin code={code} join={joinAsGuest} />
            <p className="pl-5 text-small text-muted">
              Or{" "}
              <Link href={`/login?next=/rooms/${code}`} className="text-fg hover:underline">
                sign in
              </Link>{" "}
              to use your services and friends.
            </p>
          </div>
        )}
      </div>
    );
  }

  const host = r.hostId === me!.id;

  if (r.status === "playing") {
    return (
      <div className="flex flex-col gap-10">
        <LiveRoom code={code} />
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <span className="text-small text-muted">
            Room {code} · {r.kind === "movie" ? "Movie" : "Series"} · {game.name}
          </span>
          <div className="flex items-center gap-4">
            {r.game === "plusone" && <CopyRoomLink code={code} />}
            <LeaveRoom code={code} leave={leaveRoom} host={host} />
          </div>
        </div>
        {r.game === "plusone" ? (
          <Winner
            r={r}
            host={host}
            detail={`Plus one · Room ${code} · hosted by ${r.host}`}
            headline={(name) => [name, "together."]}
          />
        ) : r.game === "swipe" ? (
          <SwipeGame r={r} meId={me!.id} />
        ) : r.game === "bracket" ? (
          <BracketGame r={r} meId={me!.id} />
        ) : (
          <ReelGame r={r} meId={me!.id} />
        )}
      </div>
    );
  }
  const joined = r.members.filter((m) => m.joined);
  const invited = r.members.filter((m) => !m.joined);

  return (
    <div className="flex flex-col gap-section">
      <LiveRoom code={code} />
      <Heading detail={what} top="Waiting for" muted="everyone." />

      <div className="flex flex-wrap items-end gap-10">
        <div className="flex flex-col gap-2">
          <span className="text-small text-muted">Room code</span>
          <span className="text-page leading-none font-bold tracking-widest">{code}</span>
        </div>
        <CopyRoomLink code={code} />
        {me && !me.guest && <PhoneQr code={code} load={phoneQr} />}
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="text-section leading-none font-bold">In the room</h2>
        <ul className="flex flex-wrap gap-6">
          {[...joined, ...invited].map((m) => (
            <li key={m.memberId} className="flex w-22 pop flex-col items-center gap-2.5 text-center">
              <Avatar name={m.name} image={m.image} size="lg" muted={!m.joined} />
              <span className="w-full truncate text-small">{m.name}</span>
              <span className="flex items-center gap-1.5 text-caption text-muted">
                {!m.joined && <Spinner />}
                {m.memberId === r.hostId
                  ? "Host"
                  : m.joined
                    ? m.memberId.startsWith("guest:")
                      ? "Guest"
                      : "Ready"
                    : "Invited"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-6">
        {host && r.status === "lobby" && <StartRoom code={code} start={startRoom} />}
        {!host && r.status === "lobby" && (
          <span className="flex items-center gap-2.5 text-body text-muted">
            <Spinner />
            Waiting for {r.host} to start.
          </span>
        )}
        <LeaveRoom code={code} leave={leaveRoom} host={host} />
        {host && r.status === "lobby" && (
          <span className="text-small text-muted">You can start without everyone. Late joiners jump in.</span>
        )}
      </div>
    </div>
  );
}
