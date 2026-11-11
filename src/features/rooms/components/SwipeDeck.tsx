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
  const [dx, setDx] = useState(0);
  const [flying, setFlying] = useState<"L" | "R" | null>(null);
  const start = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();
  const left = cards.filter((c) => !gone.includes(c.id));
  const top = left[0];

  const commit = useCallback(
    (like: boolean) => {
      if (!top || flying) return;
      setFlying(like ? "R" : "L");
      setTimeout(() => {
        setGone((g) => [...g, top.id]);
        setFlying(null);
        setDx(0);
        startTransition(() => swipe(code, { tmdbId: top.id, like }));
      }, 260);
    },
    [top, flying, swipe, code],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") commit(false);
      if (e.key === "ArrowRight") commit(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit]);

  if (!top) return null;
  const x = flying === "R" ? 700 : flying === "L" ? -700 : dx;
  const next = left[1];

  return (
    <div className="flex swipe-card flex-col gap-5">
      <div className="relative aspect-poster w-full">
        {next && (
          <div className="absolute inset-0 scale-95 overflow-hidden rounded-banner bg-raised opacity-50">
            <Image src={next.poster} alt="" fill sizes="384px" className="object-cover" />
          </div>
        )}
        <div
          role="group"
          aria-label={top.title}
          onPointerDown={(e) => {
            start.current = e.clientX;
            setDragging(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
          onPointerUp={() => {
            start.current = null;
            setDragging(false);
            if (Math.abs(dx) > FLICK) commit(dx > 0);
            else setDx(0);
          }}
          style={{ transform: `translateX(${x}px) rotate(${x / 22}deg)` }}
          className={`absolute inset-0 cursor-grab touch-none overflow-hidden rounded-banner bg-raised shadow-2xl outline-1 -outline-offset-1 outline-hairline select-none active:cursor-grabbing ${dragging ? "" : "transition-transform duration-300 ease-out"}`}
        >
          <Image src={top.poster} alt="" fill sizes="384px" priority className="pointer-events-none object-cover" />
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
