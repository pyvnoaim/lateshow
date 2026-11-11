"use client";

import { useEffect, useState } from "react";

const FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

/** A small braille spinner in the accent, for "waiting on someone" (rooms). Holds still under reduced motion. */
export function Spinner() {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setF((x) => x + 1), 90);
    return () => clearInterval(t);
  }, []);
  return (
    <span aria-hidden className="inline-block w-3 font-mono text-accent">
      {FRAMES[f % FRAMES.length]}
    </span>
  );
}
