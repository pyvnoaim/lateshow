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

const START: Record<string, string> = { swipe: "Start swiping", bracket: "Start the bracket" };

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
          <>
            <Winner r={r} host={host} eyebrow="Plus one" detail={`Room ${code} · hosted by ${r.host}`} />
            {/* everyone who can see and move this player: someone you don't know here, close the room */}
            <section className="flex flex-col gap-5">
              <h2 className="text-section leading-none font-bold">In the room</h2>
              <ul className="flex flex-wrap gap-6">
                {r.members
                  .filter((m) => m.joined)
                  .map((m) => (
                    <li key={m.memberId} className="flex w-22 pop flex-col items-center gap-2.5 text-center">
                      <Avatar name={m.name} image={m.image} size="lg" />
                      <span className="w-full truncate text-small">{m.name}</span>
                      <span className="text-caption text-muted">{m.memberId === r.hostId ? "Host" : "Here"}</span>
                    </li>
                  ))}
              </ul>
            </section>
          </>
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
      <div className="flex items-center justify-between gap-6">
        <span className="text-label text-muted">{what}</span>
        <LeaveRoom code={code} leave={leaveRoom} host={host} />
      </div>
      <div className="flex gap-24">
        <div className="flex min-w-0 flex-1 rise flex-col gap-12">
          <h1 className="text-page leading-none font-bold text-balance">
            Waiting for <span className="text-muted">everyone.</span>
          </h1>
          <div className="flex flex-col gap-3">
            <span className="text-label text-muted">Room code</span>
            <div className="flex items-center justify-between gap-7 sm:justify-start">
              <span className="text-page leading-none font-bold tracking-widest nums sm:text-hero">{code}</span>
              <CopyRoomLink code={code} />
            </div>
            <span className="text-label text-muted">Friends enter it under Rooms, or open the link.</span>
          </div>
          <section className="flex flex-col gap-5">
            <h2 className="text-label text-muted">
              <span className="font-semibold text-fg">{joined.length} here</span>
              {invited.length > 0 && ` · ${invited.length} invited`}
            </h2>
            <ul className="grid grid-cols-4 gap-3 sm:flex sm:flex-wrap sm:gap-7">
              {[...joined, ...invited].map((m) => (
                <li key={m.memberId} className="flex pop flex-col items-center gap-2 text-center sm:w-18">
                  <Avatar name={m.name} image={m.image} size="lg" muted={!m.joined} />
                  <span className={`w-full truncate text-small ${m.joined ? "" : "text-muted"}`}>{m.name}</span>
                  <span className="-mt-1 flex items-center gap-1.5 text-caption text-muted">
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
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
            {host && r.status === "lobby" && (
              <>
                <StartRoom code={code} start={startRoom} label={START[r.game] ?? "Start"} />
                <span className="text-small text-muted">Late joiners jump in.</span>
              </>
            )}
            {!host && r.status === "lobby" && (
              <span className="flex items-center gap-2.5 text-body text-muted">
                <Spinner />
                Waiting for {r.host} to start.
              </span>
            )}
          </div>
        </div>
        {me && !me.guest && <PhoneQr code={code} load={phoneQr} />}
      </div>
    </div>
  );
}
