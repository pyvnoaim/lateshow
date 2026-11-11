"use client";

import { Heart, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Trailer } from "@/components/Trailer";
import { buttonStyles } from "@/components/ui/button";

export type SwipeCard = {
  id: number;
  title: string;
  meta: string;
  overview: string;
  poster: string;
  on?: string;
  trailer?: string;
};

const FLICK = 110; // px a card has to travel to count as a swipe

/**
 * Your cards, top one on the stack. Drag it, use ✕ / ♥ or the arrow keys. A swipe flies the card off at once and
 * saves in the background; cards you already swiped stay gone even while the page refreshes from others' swipes.
 */
export function SwipeDeck({
  code,
  cards,
  swipe,
}: {
  code: string;
  cards: SwipeCard[];
  swipe: (code: string, vote: { tmdbId: number; like: boolean }) => Promise<void>;
}) {
  const [gone, setGone] = useState<number[]>([]);
  const [leaving, setLeaving] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; dx: number; frame: number } | null>(null);
  const [, startTransition] = useTransition();
  const left = cards.filter((c) => !gone.includes(c.id));
  const top = left[0];

  // The card moves by writing its transform straight to the element (no React render per pointer move).
  const place = (dx: number, transition = "") => {
    const el = card.current;
    if (!el) return;
    el.style.transition = transition;
    el.style.transform = dx ? `translate3d(${dx}px,0,0) rotate(${dx / 22}deg)` : "";
  };

  const commit = useCallback(
    (like: boolean) => {
      const el = card.current;
      if (!top || !el || leaving) return;
      setLeaving(true);
      place(like ? window.innerWidth : -window.innerWidth, "transform 280ms cubic-bezier(.4,0,1,1)");
      el.addEventListener(
        "transitionend",
        () => {
          setGone((g) => [...g, top.id]);
          setLeaving(false);
          startTransition(() => swipe(code, { tmdbId: top.id, like }));
        },
        { once: true },
      );
    },
    [top, leaving, swipe, code],
  );

  // a new top card starts centred, without animating back from where the last one flew
  useEffect(() => place(0), [top?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") commit(false);
      if (e.key === "ArrowRight") commit(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  if (!top) return null;
  const next = left[1];

  return (
    <div className="flex swipe-card flex-col gap-5">
      <div className="relative aspect-poster w-full">
        {next && (
          <div
            className={`absolute inset-0 overflow-hidden rounded-banner bg-raised transition duration-300 ease-out ${leaving ? "scale-100 opacity-100" : "scale-95 opacity-50"}`}
          >
            <Image src={next.poster} alt="" fill sizes="384px" className="object-cover" />
          </div>
        )}
        <div
          key={top.id}
          ref={card}
          role="group"
          aria-label={top.title}
          onPointerDown={(e) => {
            if (leaving) return;
            drag.current = { x0: e.clientX, dx: 0, frame: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            d.dx = e.clientX - d.x0;
            cancelAnimationFrame(d.frame);
            d.frame = requestAnimationFrame(() => place(d.dx));
          }}
          onPointerUp={() => {
            const d = drag.current;
            drag.current = null;
            if (!d) return;
            if (Math.abs(d.dx) > FLICK) commit(d.dx > 0);
            else place(0, "transform 300ms cubic-bezier(.2,.8,.2,1)");
          }}
          onPointerCancel={() => {
            drag.current = null;
            place(0, "transform 300ms cubic-bezier(.2,.8,.2,1)");
          }}
          className="absolute inset-0 cursor-grab touch-none overflow-hidden rounded-banner bg-raised shadow-2xl outline-1 -outline-offset-1 outline-hairline will-change-transform select-none active:cursor-grabbing"
        >
          <Image src={top.poster} alt="" fill sizes="384px" preload className="pointer-events-none object-cover" />
          <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/30 to-transparent" />
          <div className="absolute inset-x-5 bottom-5 flex flex-col gap-2">
            <span className="text-caption text-fg/80">{top.meta}</span>
            <span className="text-section leading-none font-bold">{top.title}</span>
            <p className="line-clamp-3 text-small leading-normal text-fg/80">{top.overview}</p>
            {top.on && <span className="text-caption text-fg/80">On {top.on}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-7">
        <button
          type="button"
          aria-label="Not tonight"
          data-tip="Not tonight"
          data-tip-meta="Left arrow"
          onClick={() => commit(false)}
          className={buttonStyles("glass", "icon", "size-18")}
        >
          <X size={28} strokeWidth={2} aria-hidden />
        </button>
        {top.trailer && <Trailer youtubeKey={top.trailer} title={top.title} />}
        <button
          type="button"
          aria-label="Yes, I'd watch this"
          data-tip="Yes"
          data-tip-meta="Right arrow"
          onClick={() => commit(true)}
          className={buttonStyles("accent", "icon", "size-18")}
        >
          <Heart size={28} strokeWidth={2} fill="currentColor" aria-hidden />
        </button>
      </div>
    </div>
  );
}
