import { getLanguage } from "@/lib/region";
import { pickInBracket, playAgain } from "@/lib/rooms/actions";
import { bracketState, roundLabel } from "@/lib/rooms/bracket";
import { getPicks } from "@/lib/rooms/queries";
import { getTitle, img, shortGenre } from "@/lib/tmdb";
import { BracketVote, type Contender } from "./components/BracketVote";
import { PlayAgain } from "./components/RoomButtons";
import { Winner, type Room } from "./Winner";

/** Bracket, for one member: the match being played, who still has to vote, the tree so far, then the winner. */
export async function BracketGame({ r, meId }: { r: Room; meId: string }) {
  const lang = await getLanguage();
  const deck = r.deck ?? [];
  const members = r.members.filter((m) => m.joined);
  const picks = await getPicks(r.code);
  // the people the bracket waits for: there at the start and still here (late joiners vote, nobody waits for them)
  const here = members.map((m) => m.memberId);
  const waitFor = r.players ? r.players.filter((p) => here.includes(p)) : here;
  const state = bracketState(deck, picks, waitFor);
  const host = r.hostId === meId;
  const titles = new Map(
    await Promise.all(
      deck.map(async (id) => {
        const t = await getTitle(r.kind, String(id), lang);
        const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
        return [
          id,
          {
            id,
            title: t.title ?? t.name ?? "",
            meta: [r.kind === "movie" ? "Movie" : "Series", year, t.genres[0] && shortGenre(t.genres[0].name)]
              .filter(Boolean)
              .join(" · "),
            poster: img(t.poster_path, "w500")!,
          } satisfies Contender,
        ] as const;
      }),
    ),
  );

  if (r.winner) {
    const final = picks.get(6);
    const forWinner = final ? [...final.values()].filter((c) => c === r.winner).length : 0;
    const total = final?.size ?? 0;
    return (
      <Winner
        r={r}
        host={host}
        detail={total > 1 ? `Won the final ${forWinner} to ${total - forWinner}.` : "Won the final."}
        headline={(name) => [`${name}.`, "That's tonight."]}
      />
    );
  }

  const now = state.current;
  if (!now) {
    return (
      <div className="flex flex-col items-start gap-8">
        <h1 className="text-page leading-none font-bold">
          Not enough titles.
          <br />
          <span className="text-muted">Your shared services came up short.</span>
        </h1>
        {host && <PlayAgain code={r.code} again={playAgain} />}
      </div>
    );
  }
  const label = roundLabel(now.index);
  const name = (id: number | null) => (id === null ? "" : (titles.get(id)?.title ?? ""));
  const slot = (id: number | null, won: boolean, live: boolean) => (
    <span
      className={`flex h-8 items-center truncate rounded-thumb px-2.5 text-caption ${won ? "bg-accent/20 text-fg" : live ? "text-fg ring-1 ring-fg/30 ring-inset" : "bg-fg/5 text-muted"}`}
    >
      {name(id)}
    </span>
  );
  const matchSlots = (indices: number[]) =>
    indices.flatMap((i) => {
      const m = state.matches[i];
      return [m.a, m.b].map((id, k) => (
        <li key={`${i}-${k}`}>{slot(id, id !== null && m.winner === id, now.index === i)}</li>
      ));
    });

  return (
    <div className="flex flex-col gap-section">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-label text-muted">
            {label.round}
            {label.of && ` · match ${label.of}`}
          </span>
          <h1 className="text-page leading-none font-bold">Which one tonight?</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex">
            {members.map((m, i) => (
              <span
                key={m.memberId}
                data-tip={m.name}
                data-tip-meta={now.voted.includes(m.memberId) ? "Voted" : "Deciding"}
                className={`flex size-8 items-center justify-center rounded-full text-caption font-bold ring-2 ring-bg ${i > 0 ? "-ml-2" : ""} ${now.voted.includes(m.memberId) ? "glass-accent" : "glass-cell text-muted"}`}
              >
                {m.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
          <span className="text-caption text-muted nums">
            {waitFor.filter((id) => now.voted.includes(id)).length} of {waitFor.length} voted
          </span>
        </div>
      </div>

      <BracketVote
        key={now.index}
        code={r.code}
        match={now.index}
        pair={[titles.get(now.a!)!, titles.get(now.b!)!]}
        picked={picks.get(now.index)?.get(meId) ?? null}
        waitingFor={members
          .filter((m) => waitFor.includes(m.memberId) && !now.voted.includes(m.memberId) && m.memberId !== meId)
          .map((m) => m.name)}
        pick={pickInBracket}
      />

      <section aria-label="Bracket" className="hidden grid-cols-4 items-center gap-6 sm:grid">
        <div className="flex flex-col gap-2">
          <span className="pb-1 text-caption text-muted">8 titles</span>
          <ul className="flex flex-col gap-2">{matchSlots([0, 1, 2, 3])}</ul>
        </div>
        <div className="flex flex-col gap-2">
          <span className="pb-1 text-caption text-muted">Semifinals</span>
          <ul className="flex flex-col gap-12">{matchSlots([4, 5])}</ul>
        </div>
        <div className="flex flex-col gap-2">
          <span className="pb-1 text-caption text-muted">Final</span>
          <ul className="flex flex-col gap-28">{matchSlots([6])}</ul>
        </div>
        <div className="flex flex-col gap-2">
          <span className="pb-1 text-caption text-muted">Tonight</span>
          {slot(state.champion, false, false)}
        </div>
      </section>
    </div>
  );
}
