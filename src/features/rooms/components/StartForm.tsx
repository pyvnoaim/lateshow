"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { buttonStyles } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GAMES, type Game } from "@/lib/rooms/games";
import { GameArt } from "./GameArt";

type Friend = { id: string; username: string; image: string | null };

/** Three big game tiles, then Movie or Series and who's in, then the room opens and you land in its lobby. */
export function StartForm({
  friends,
  posters,
  create,
}: {
  friends: Friend[];
  /** trending poster URLs for the tiles' pictures, per kind */
  posters: { movie: string[]; tv: string[] };
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
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-3">
        {GAMES.map((g) => {
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
                className={`block h-64 overflow-hidden rounded-banner bg-linear-to-b from-raised to-surface transition duration-300 ${on ? "ring-2 ring-accent" : "opacity-70 group-hover:opacity-100"}`}
              >
                <GameArt game={g.id} posters={posters[kind]} />
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
          <SegmentedTabs
            label="Movie or series"
            items={[
              { key: "movie", label: "Movie", active: kind === "movie", onSelect: () => setKind("movie") },
              { key: "tv", label: "Series", active: kind === "tv", onSelect: () => setKind("tv") },
            ]}
          />
          {friends.length > 0 && (
            <ul aria-label="Invite friends" className="flex flex-wrap gap-2">
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
          )}
        </div>
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
      </div>
      {error && (
        <p role="alert" className="-mt-6 text-small text-muted">
          {error}
        </p>
      )}
    </div>
  );
}
