"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { watchMonths, type ImportRow } from "@/lib/library/importing";

const STEP_MS = 240; // --duration-import-step
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthName = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/**
 * The import at work: a dark screen with a bar per month of your history, lit oldest first. An icy glow sits under
 * the current month and grows with progress, the title on its way to the server rises in above. Rows arrive oldest
 * first, so title, month and bars stay together. `done` rows are matched, `until` is the end of the batch in flight.
 */
export function ImportProgress({ rows, done, until }: { rows: ImportRow[]; done: number; until: number }) {
  // one title per step through the batch in flight, waiting on its last one
  const [at, setAt] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAt((a) => Math.min(Math.max(a + 1, done), until - 1)), STEP_MS);
    return () => clearInterval(id);
  }, [done, until]);

  const months = useMemo(() => watchMonths(rows), [rows]);
  const max = Math.max(1, ...months.map((m) => m.count));
  const row = rows[at];
  // undated rows (a watchlist) come last, by then every month is lit
  const now = Math.max(
    0,
    row?.date ? months.filter((m) => m.month <= row.date!.slice(0, 7)).length - 1 : months.length - 1,
  );
  const progress = rows.length ? (at + 1) / rows.length : 0;
  const light = {
    "--x": months.length ? `${((now + 0.5) / months.length) * 100}%` : "50%",
    "--o": 0.35 + 0.65 * progress,
  } as CSSProperties;

  return (
    <>
      <div aria-hidden className="relative h-64 w-full max-w-md overflow-hidden rounded-banner import-screen">
        <div className="absolute inset-0 import-light" style={light} />
        <div className="absolute inset-x-6 top-5 flex items-baseline justify-between gap-3 text-caption nums">
          <span className="text-accent">{months.length ? monthName(months[now].month) : "Matching"}</span>
          <span className="text-muted">
            <span className="font-medium text-fg">{done}</span> of {rows.length}
          </span>
        </div>
        {row && (
          <div key={at} className="absolute inset-x-6 top-12 flex import-title flex-col gap-0.5">
            <span className="truncate text-section leading-tight font-semibold tracking-tight">{row.title}</span>
            <span className="text-caption text-muted nums">
              {row.episodes
                ? `${row.episodes.length} ${row.episodes.length === 1 ? "episode" : "episodes"}`
                : (row.year ?? (row.type === "tv" ? "Series" : "Film"))}
            </span>
          </div>
        )}
        {months.length > 0 && (
          <div className="absolute inset-x-6 bottom-6 flex h-20 items-end gap-0.5">
            {months.map((m, i) => (
              <span
                key={m.month}
                data-state={i < now ? "lit" : i === now ? "now" : undefined}
                className="min-w-0 flex-1 import-bar"
                style={{ height: `${Math.max(6, (m.count / max) * 100)}%` }}
              />
            ))}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        Matching {done} of {rows.length}
      </p>
    </>
  );
}

/** A number counting up from 0, after `delay` ms. Reduced motion: the number right away. */
export function CountUp({ to, delay = 0 }: { to: number; delay?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const ms = matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900;
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const t = ms ? Math.min(1, Math.max(0, (now - start) / ms)) : 1;
      setN(Math.round((1 - (1 - t) ** 3) * to));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return <>{n.toLocaleString("en")}</>;
}
