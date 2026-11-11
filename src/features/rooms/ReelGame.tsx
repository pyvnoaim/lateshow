import { PosterLink } from "@/components/PosterLink";
import { getLanguage } from "@/lib/region";
import { addMood, spinAgain, spinReel } from "@/lib/rooms/actions";
import { getMoods } from "@/lib/rooms/queries";
import { getTitle, titleToCard } from "@/lib/tmdb";
import { MoodForm, SpinButton } from "./components/MoodForm";
import { ReelSpin } from "./components/ReelSpin";
import type { Room } from "./Winner";

/** Reel, for one member: add your mood, the host spins, everyone lands on the same mood and gets the same 3 picks. */
export async function ReelGame({ r, meId }: { r: Room; meId: string }) {
  const moods = await getMoods(r.code);
  const host = r.hostId === meId;
  const mine = moods.find((m) => m.memberId === meId)?.mood ?? null;
  const missing = r.members.filter((m) => m.joined && !moods.some((x) => x.memberId === m.memberId));

  const before = (
    <div className="flex flex-col gap-10">
      <div className="flex rise flex-col gap-4">
        <h1 className="text-page leading-none font-bold">
          Add a mood.
          <br />
          <span className="text-muted">Then spin.</span>
        </h1>
        <p className="text-body leading-normal text-muted">
          One each. A genre, a feeling, a length.
          <br />
          Whatever you&apos;re up for tonight.
        </p>
      </div>
      <MoodForm code={r.code} current={mine} add={addMood} />
      {moods.length > 0 && (
        <ul className="flex max-w-form flex-col">
          {moods.map((m) => (
            <li key={m.memberId} className="flex h-11 items-center gap-3">
              <span className="flex size-7 items-center justify-center rounded-full text-caption font-bold glass-accent">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-label">{m.mood}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {host ? (
          moods.length > 0 ? (
            <SpinButton code={r.code} spin={spinReel} label="Spin" />
          ) : (
            <span className="text-small text-muted">Spin unlocks once there&apos;s a mood.</span>
          )
        ) : (
          <span className="text-body text-muted">The host spins when you&apos;re ready.</span>
        )}
        {missing.length > 0 && (
          <span className="text-small text-muted">Still thinking: {missing.map((m) => m.name).join(", ")}</span>
        )}
      </div>
    </div>
  );

  let after = null;
  if (r.mood) {
    const lang = await getLanguage();
    const cards = await Promise.all(
      (r.deck ?? []).map((id) =>
        getTitle(r.kind, String(id), lang)
          .then((t) => titleToCard(t, r.kind))
          .catch(() => null),
      ),
    );
    const who = moods.find((m) => m.mood === r.mood)?.name;
    after = (
      <div className="flex flex-col items-start gap-10">
        <div className="flex rise flex-col gap-3">
          {who && <span className="text-label text-muted">{who}&apos;s mood won</span>}
          <h1 className="text-page leading-none font-bold break-words">
            {r.mood}.
            <br />
            <span className="text-muted">{cards.length === 3 ? "Three for tonight." : "Here's what fits."}</span>
          </h1>
        </div>
        {cards.some(Boolean) ? (
          <ul className="grid max-w-reading grid-cols-3 gap-3 sm:gap-5">
            {cards
              .filter((c) => c !== null)
              .map((c, i) => (
                <li key={c.id} className="min-w-0">
                  <PosterLink card={c} index={i} morph={false} />
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-body text-muted">Nothing on your services fits that one. Spin again.</p>
        )}
        {host && <SpinButton code={r.code} spin={spinAgain} label="Spin again" tone="glass" />}
      </div>
    );
  }

  return <ReelSpin moods={moods.map((m) => m.mood)} landed={r.mood} before={before} after={after} />;
}
