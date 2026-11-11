import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";
import { renderSVG } from "uqr";
import { buttonStyles } from "@/components/ui/button";
import { joinAsGuest, joinRoom, leaveRoom, startRoom } from "@/lib/rooms/actions";
import { GAMES } from "@/lib/rooms/games";
import { handoffUrl } from "@/lib/rooms/handoff";
import { getRoomIdentity } from "@/lib/rooms/identity";
import { getRoom } from "@/lib/rooms/queries";
import { cleanCode } from "@/lib/rooms/rules";
import { AutoJoin, CopyRoomLink, GuestJoin, LeaveRoom, StartRoom } from "./components/RoomButtons";
import { LiveRoom } from "./components/LiveRoom";

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
  const game = GAMES.find((g) => g.id === r.game)!;
  const what = `${r.kind === "movie" ? "Movie" : "Series"} · ${game.name} · hosted by ${r.host}`;

  if (!member) {
    return (
      <div className="flex flex-col gap-10">
        <Heading detail={what} top={`${r.host}'s room.`} muted="Jump in." />
        {me && !me.guest ? (
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
  const joined = r.members.filter((m) => m.joined);
  const invited = r.members.filter((m) => !m.joined);
  // the QR signs your phone in as you; guests have no account to hand over, theirs just opens the room
  const qr = me && !me.guest ? renderSVG(await handoffUrl(`/rooms/${code}`), { border: 1 }) : null;

  return (
    <div className="flex flex-col gap-section">
      <LiveRoom code={code} every={qr ? 90_000 : undefined} />
      {r.status === "playing" ? (
        <Heading detail={what} top={`${game.name} is on.`} muted="The game screen comes next." />
      ) : (
        <Heading detail={what} top="Waiting for" muted="everyone." />
      )}

      <div className="flex flex-wrap items-end gap-10">
        <div className="flex flex-col gap-2">
          <span className="text-small text-muted">Room code</span>
          <span className="text-page leading-none font-bold tracking-widest">{code}</span>
        </div>
        <CopyRoomLink code={code} />
        {qr && (
          <div className="ml-auto hidden items-center gap-5 rounded-banner glass-cell py-4 pr-6 pl-4 sm:flex">
            {/* uqr output: a plain SVG we built from our own URL */}
            <div
              role="img"
              aria-label="QR code to open this room on your phone"
              className="size-28 overflow-hidden rounded-thumb bg-fg"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <div className="flex max-w-56 flex-col gap-1.5">
              <span className="text-body font-semibold">Continue on your phone</span>
              <span className="text-small leading-normal text-muted">
                Scan with the camera. You land in this room, already signed in.
              </span>
            </div>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="text-section leading-none font-bold">In the room</h2>
        <ul className="flex flex-wrap gap-6">
          {[...joined, ...invited].map((m) => (
            <li key={m.memberId} className="flex w-22 pop flex-col items-center gap-2.5 text-center">
              <span
                className={`flex size-16 items-center justify-center rounded-full text-section font-bold ${m.joined ? "glass-accent" : "glass-cell text-muted"}`}
              >
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="w-full truncate text-small">{m.name}</span>
              <span className="text-caption text-muted">
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
        {!host && r.status === "lobby" && <span className="text-body text-muted">Waiting for {r.host} to start.</span>}
        <LeaveRoom code={code} leave={leaveRoom} host={host} />
        {host && r.status === "lobby" && (
          <span className="text-small text-muted">You can start without everyone. Late joiners jump in.</span>
        )}
      </div>
    </div>
  );
}
