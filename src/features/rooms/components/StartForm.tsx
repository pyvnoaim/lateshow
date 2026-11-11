"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { GAMES, type Game } from "@/lib/rooms/games";

type Friend = { id: string; username: string };

/** Movie or Series, a game, who to invite, then the room opens and you land in its lobby. */
export function StartForm({
  friends,
  create,
}: {
  friends: Friend[];
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
    <div className="flex flex-col gap-section">
      <section className="flex flex-col gap-3">
        <h2 className="text-section leading-none font-bold">What tonight?</h2>
        <SegmentedTabs
          label="Movie or series"
          items={[
            { key: "movie", label: "Movie", active: kind === "movie", onSelect: () => setKind("movie") },
            { key: "tv", label: "Series", active: kind === "tv", onSelect: () => setKind("tv") },
          ]}
        />
      </section>

      <section className="flex flex-col gap-5">
        <h2 className="text-section leading-none font-bold">How do you pick?</h2>
        <div className="grid max-w-reading grid-cols-1 gap-4 sm:grid-cols-3">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={game === g.id}
              onClick={() => setGame(g.id)}
              className={`flex min-h-40 press flex-col gap-2.5 rounded-banner glass-cell p-6 text-left transition-shadow duration-200 ${game === g.id ? "ring-2 ring-accent ring-inset" : ""}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-section leading-none font-bold">{g.name}</span>
                <span className="text-caption text-muted">{g.time}</span>
              </span>
              <span className="text-label leading-normal text-muted">{g.what}</span>
            </button>
          ))}
        </div>
      </section>

      {friends.length > 0 && (
        <section className="flex max-w-form flex-col gap-3">
          <h2 className="text-section leading-none font-bold">Who&apos;s in?</h2>
          <ul className="flex flex-col">
            {friends.map((f) => {
              const on = invited.includes(f.id);
              return (
                <li key={f.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setInvited(on ? invited.filter((x) => x !== f.id) : [...invited, f.id])}
                    className="flex h-14 w-full items-center gap-3.5 text-left"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full text-label font-bold glass-accent">
                      {f.username.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex-1 text-body font-medium">{f.username}</span>
                    <span
                      className={`flex size-6 items-center justify-center rounded-full ${on ? "glass-tint" : "glass-cell"}`}
                    >
                      {on && <Check size={14} strokeWidth={3} aria-hidden />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="text-small text-muted">They see the room on their Home. Anyone else joins with the code.</p>
        </section>
      )}

      <div className="flex flex-col items-start gap-3">
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
        {error && (
          <p role="alert" className="text-small text-muted">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
