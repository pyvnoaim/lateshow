"use client";

import { useEffect, useState } from "react";

const CH = "@%#*+=-:.";
const STEP = 70; // ms between letters landing
const LEAD = 700; // how long a letter scrambles before it lands

/**
 * Text that arrives letter by letter, each one scrambling through @ % # * + = - : . before it lands, left to right
 * (the room's winner). Screen readers get the whole text at once. Reduced motion: plain text.
 */
export function Scramble({ text }: { text: string }) {
  const [t, setT] = useState<number | null>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    const end = 350 + text.length * STEP;
    let raf = requestAnimationFrame(function tick(now) {
      const at = now - start;
      setT(at);
      if (at < end) raf = requestAnimationFrame(tick);
      else setT(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [text]);
  if (t === null) return text;
  return (
    <span aria-label={text}>
      <span aria-hidden>
        {[...text].map((c, i) => {
          const at = 350 + i * STEP;
          if (c === " " || t >= at) return c;
          if (t < at - LEAD)
            return (
              <span key={i} className="invisible">
                {c}
              </span>
            );
          // heavier characters first, thinning toward the moment it lands, with a little flicker
          const k = Math.floor(((at - t) / LEAD) * CH.length);
          return (
            <span key={i} className="font-mono text-accent/75">
              {CH[Math.min(CH.length - 1, Math.max(0, CH.length - 1 - k + (Math.floor(t / 45) % 2)))]}
            </span>
          );
        })}
      </span>
    </span>
  );
}
