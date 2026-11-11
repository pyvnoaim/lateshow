"use client";

import { useEffect, useState, type ReactNode } from "react";

const ROW = 80; // px per mood row (h-20)
const REPS = 7; // the column repeats so a spin can roll a few rounds
const SPIN_MS = 3200;

/**
 * The reel and what sits next to it. Before the spin: `before` (the mood form). When the host spins, everyone who is
 * watching sees the column roll and ease into the band on the landed mood, then `after` (the picks) appears.
 * Someone who opens the page later just sees where it landed.
 */
export function ReelSpin({
  moods,
  landed,
  before,
  after,
}: {
  moods: string[];
  landed: string | null;
  before: ReactNode;
  after: ReactNode;
}) {
  // open: no spin yet · start: just landed, reel at rest · rolling: easing to the mood · done: show the picks.
  // Someone who opens the page after the spin starts at done (no roll).
  const [phase, setPhase] = useState<"open" | "start" | "rolling" | "done">(landed ? "done" : "open");
  const [seen, setSeen] = useState(landed);
  if (seen !== landed) {
    // the host spun (or reset) while you watch: adjust during render, React's way to follow a prop
    setSeen(landed);
    setPhase(landed ? "start" : "open");
  }

  useEffect(() => {
    if (phase === "start") {
      const frame = requestAnimationFrame(() => setPhase("rolling"));
      return () => cancelAnimationFrame(frame);
    }
    if (phase === "rolling") {
      const end = setTimeout(() => setPhase("done"), SPIN_MS + 150);
      return () => clearTimeout(end);
    }
  }, [phase]);

  const rolling = phase === "rolling";
  const done = phase === "done";
  const list = moods.length > 0 ? moods : ["Add a mood"];
  const target = landed ? (REPS - 2) * list.length + Math.max(0, list.indexOf(landed)) : 2;
  const at = landed && (rolling || done) ? target : 2;
  const items = Array.from({ length: REPS }, () => list).flat();

  return (
    <div className="grid grid-cols-1 items-start gap-section lg:grid-cols-main-aside">
      <div className="min-w-0">
        {landed ? (
          done ? (
            after
          ) : (
            <h1 className="rise text-page leading-none font-bold">
              Spinning.
              <br />
              <span className="text-muted">Fingers crossed.</span>
            </h1>
          )
        ) : (
          before
        )}
      </div>
      <div className="relative order-first lg:order-none">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-40 h-20 rounded-banner glass" />
        <div
          role="img"
          aria-label={landed && done ? `The reel landed on ${landed}` : "Everyone's moods on the reel"}
          className="relative h-100 overflow-hidden reel-fade"
        >
          <div style={{ transform: `translateY(${-at * ROW + 2 * ROW}px)` }} className={rolling ? "reel-roll" : ""}>
            {items.map((m, i) => (
              <div
                key={i}
                className={`flex h-20 items-center justify-center truncate px-4 text-section font-bold transition-colors duration-300 ${done && landed && i === target ? "text-fg" : "text-muted"}`}
              >
                {m}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
