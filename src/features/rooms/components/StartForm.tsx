"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { UsernameForm } from "@/components/UsernameForm";
import { buttonStyles } from "@/components/ui/button";
import { GAMES, type Game } from "@/lib/rooms/games";
import { GameArt } from "./GameArt";

type Friend = { id: string; username: string; image: string | null };

/** Three big game tiles, then Movie or Series and who's in, then the room opens and you land in its lobby. */
export function StartForm({
  friends,
  posters,
  needsUsername,
  create,
}: {
  friends: Friend[];
  /** trending poster URLs for the tiles' pictures, per kind */
  posters: { movie: string[]; tv: string[] };
  /** signed in without a username yet: everyone in a room sees it, so pick one here first */
  needsUsername: boolean;
  create: (input: {
    kind: "movie" | "tv";
    game: Game;
    friends: string[];
  }) => Promise<{ code: string } | { error: string }>;
}) {
  const [kind, setKind] = useState<"movie" | "tv">("movie");
  const [game, setGame] = useState<Game>("swipe");
  const [invited, setInvited] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div className="flex flex-col gap-12">
      {/* the choice is part of the sentence: the picked word bright, the other dim */}
      <div className="flex flex-col gap-2.5">
        <span className="text-body text-muted">Tonight we pick a</span>
        <div role="group" aria-label="Movie or series" className="flex items-baseline gap-6">
          {(
            [
              ["movie", "Movie"],
              ["tv", "Series"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={`press rounded-thumb text-choice leading-none font-bold tracking-tight transition-colors duration-300 ${kind === k ? "text-fg" : "text-fg/20 hover:text-fg/45"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
        {GAMES.map((g, gi) => {
          const on = game === g.id;
          return (
            <button
              key={g.id}
              type="button"
              aria-pressed={on}
              onClick={() => setGame(g.id)}
              className="group flex press flex-col gap-4 rounded-banner text-left"
            >
              <span
                className={`relative block h-64 overflow-hidden rounded-banner bg-linear-to-b from-raised to-surface transition duration-300 ${on ? "ring-2 ring-accent" : "opacity-70 group-hover:opacity-100"}`}
              >
                {/* both sets are there and loaded: switching Movie / Series crossfades instead of popping in */}
                {(["movie", "tv"] as const).map((k) => (
                  <span
                    key={k}
                    aria-hidden={k !== kind}
                    style={{ transitionDelay: `${gi * 70}ms` }}
                    className={`absolute inset-0 transition duration-500 ease-out ${k === kind ? "scale-100 opacity-100 blur-none" : "pointer-events-none scale-95 opacity-0 blur-sm"}`}
                  >
                    <GameArt game={g.id} posters={posters[k]} />
                  </span>
                ))}
              </span>
              <span className="flex flex-col gap-1.5 px-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className={`text-section leading-none font-bold ${on ? "text-fg" : "text-fg/80"}`}>
                    {g.name}
                  </span>
                  <span className="text-caption text-muted">{g.time}</span>
                </span>
                <span className="text-label leading-normal text-muted">{g.what}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-10 gap-y-6">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          {friends.length > 0 && (
            // a label in front: a lone name chip didn't read as "invite this friend"
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span id="invite-label" className="text-label text-muted">
                Invite
              </span>
              <ul aria-labelledby="invite-label" className="flex flex-wrap gap-2">
                {friends.map((f) => {
                  const inv = invited.includes(f.id);
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        aria-pressed={inv}
                        onClick={() => setInvited(inv ? invited.filter((x) => x !== f.id) : [...invited, f.id])}
                        data-tip={inv ? "Invited" : "Invite"}
                        className={`flex h-10 press items-center gap-2 rounded-full pr-4 pl-1 text-label ${inv ? "glass-tint" : "glass"}`}
                      >
                        <Avatar name={f.username} image={f.image} size="sm" />
                        {f.username}
                        {inv && <Check size={14} strokeWidth={3} aria-hidden />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {needsUsername ? (
          // saving refreshes the page, then the prop is false and the button is here
          <div className="flex w-full flex-col gap-3">
            <p className="text-body leading-normal text-muted">
              First, a name for the room.
              <br />
              Everyone in it sees it, never your email.
            </p>
            <UsernameForm />
          </div>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await create({ kind, game, friends: invited });
                if ("error" in result) setError(result.error);
                else router.push(`/rooms/${result.code}`);
              })
            }
            className={buttonStyles("primary", "md")}
          >
            {pending ? "Opening" : "Open the room"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="-mt-6 text-small text-muted">
          {error}
        </p>
      )}
    </div>
  );
}
