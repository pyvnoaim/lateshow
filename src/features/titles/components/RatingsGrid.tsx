import { Star } from "lucide-react";
import { ScrollBox } from "@/components/ScrollBox";
import { Section } from "@/components/ui/Section";
import type { SeasonData } from "./Episodes";

// Brightness is relative to this show's own best and worst episode, so weaker shows still get a readable spread.
// seen keeps its brightness (the rating still reads) and gets a dot: an icy tint alone was too close to grey
const UNSEEN = ["bg-fg/10", "bg-fg/25", "bg-fg/45", "bg-fg/70", "bg-fg"];

/** One square per episode, a row per season. Brighter is better, a dot is seen. Rating on hover. */
export function RatingsGrid({ seasons, watched }: { seasons: SeasonData[]; watched: string[] }) {
  const rated = seasons.flatMap((s) => s.episodes.map((e) => ({ s: s.number, ...e }))).filter((e) => e.rating > 0);
  if (rated.length === 0) return null;
  const min = Math.min(...rated.map((e) => e.rating));
  const span = Math.max(...rated.map((e) => e.rating)) - min || 1;
  const step = (r: number) => Math.min(4, Math.floor(((r - min) / span) * 5));
  const best = rated.reduce((a, b) => (b.rating > a.rating ? b : a));
  const seen = new Set(watched);
  const columns = Math.max(13, ...seasons.map((s) => s.episodes.length));

  return (
    <Section title="Ratings">
      <div className="flex flex-col gap-4">
        <ScrollBox className="max-h-list">
          <div className="flex flex-col gap-1">
            {seasons.map((s) => (
              <div key={s.number} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-caption text-muted nums">S{s.number}</span>
                <div
                  className="grid flex-1 gap-1"
                  style={{ gridTemplateColumns: `repeat(${columns}, minmax(14px, 1fr))` }}
                >
                  {s.episodes.map((e) => {
                    const tone = e.rating > 0 ? step(e.rating) : 0;
                    const isSeen = seen.has(`${s.number}-${e.n}`);
                    return (
                      <div
                        key={e.n}
                        data-tip={`S${s.number} E${e.n} · ${e.name}`}
                        data-tip-meta={[
                          e.rating > 0 ? `★ ${e.rating.toFixed(1)}` : "Not rated yet",
                          isSeen ? "Seen" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                        className={`relative flex aspect-square items-center justify-center rounded-sm glass-cell ${e.rating > 0 ? UNSEEN[tone] : "bg-raised"}`}
                      >
                        {isSeen && (
                          <span aria-hidden className={`size-1.5 rounded-full ${tone >= 3 ? "bg-bg" : "bg-accent"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollBox>
        <div className="flex gap-4 pl-8 text-caption text-muted">
          <span>Brighter is better</span>
          <span className="flex items-center gap-1.5">
            <span className="flex size-3.5 items-center justify-center rounded-sm bg-fg/25">
              <span className="size-1 rounded-full bg-accent" />
            </span>
            Seen
          </span>
        </div>
        <div className="flex flex-col gap-1 pt-4">
          <span className="text-caption text-muted">Highest rated</span>
          <span className="text-label font-medium">
            S{best.s} E{best.n} · {best.name}{" "}
            <span className="inline-flex items-center gap-1 font-normal text-muted nums">
              <Star size={12} strokeWidth={2} aria-hidden /> {best.rating.toFixed(1)}
            </span>
          </span>
        </div>
      </div>
    </Section>
  );
}
