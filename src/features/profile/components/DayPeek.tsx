"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TmdbImage } from "@/components/TmdbImage";

export type PeekTitle = { key: string; title: string; meta: string; poster: string | null; href: string };

const WIDTH = 360; // w-90
const GAP = 10;

type Open = { date: string; label: string; time: string; rect: DOMRect };

/**
 * The heatmap's day card: a click on a lit day (a `button[data-day]` inside) opens a small glass card at the square
 * with the day's titles, most watched first. A busy day's list scrolls inside the card. Esc, a click outside or
 * scrolling the page closes it. The open day's square has aria-expanded (its ring). Phones get the card as a sheet.
 */
export function DayPeek({ peek, children }: { peek: (date: string) => Promise<PeekTitle[]>; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [titles, setTitles] = useState<PeekTitle[] | null>(null);
  const cache = useRef(new Map<string, PeekTitle[]>());
  const latest = useRef("");
  const card = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const onClick = (e: MouseEvent) => {
    const b = e.target instanceof Element ? e.target.closest<HTMLButtonElement>("button[data-day]") : null;
    if (!b) return;
    const date = b.dataset.day!;
    opener.current = b;
    latest.current = date;
    setOpen({ date, label: b.dataset.tip ?? date, time: b.dataset.tipMeta ?? "", rect: b.getBoundingClientRect() });
    const hit = cache.current.get(date);
    setTitles(hit ?? null);
    if (!hit)
      peek(date)
        .then((t) => {
          cache.current.set(date, t);
          if (latest.current === date) setTitles(t);
        })
        .catch(() => latest.current === date && setTitles([]));
  };

  useEffect(() => {
    if (!open) return;
    // the squares are server rendered, so their open state is set on the element (it rings the square)
    const square = opener.current;
    square?.setAttribute("aria-expanded", "true");
    card.current?.focus({ preventScroll: true });
    const close = (refocus: boolean) => {
      latest.current = "";
      setOpen(null);
      if (refocus) square?.focus({ preventScroll: true });
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    // a press on another day closes this one first, its click then opens the new one
    const down = (e: PointerEvent) => !card.current?.contains(e.target as Node) && close(false);
    const scroll = (e: Event) => !card.current?.contains(e.target as Node) && close(false);
    const resize = () => close(false);
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    window.addEventListener("scroll", scroll, { capture: true, passive: true });
    window.addEventListener("resize", resize);
    return () => {
      square?.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", scroll, { capture: true });
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  return (
    <div onClick={onClick}>
      {children}
      {open && createPortal(<Card open={open} titles={titles} cardRef={card} />, document.body)}
    </div>
  );
}

function Card({
  open,
  titles,
  cardRef,
}: {
  open: Open;
  titles: PeekTitle[] | null;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  // under the square, flipped above it when the bottom of the window is near, kept inside the window sideways.
  // Phones: a sheet at the bottom instead (no style, the classes place it).
  const phone = window.matchMedia("(max-width: 639px)").matches;
  const { rect } = open;
  const below = window.innerHeight - rect.bottom > 380;
  const style = phone
    ? undefined
    : {
        left: Math.min(Math.max(rect.left + rect.width / 2 - WIDTH / 2, 16), window.innerWidth - WIDTH - 16),
        ...(below ? { top: rect.bottom + GAP } : { bottom: window.innerHeight - rect.top + GAP }),
      };

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={open.label}
      tabIndex={-1}
      style={style}
      className={`fixed z-50 flex pop flex-col gap-1 rounded-poster p-4 glass-deep outline-none ${
        phone ? "inset-x-4 bottom-4" : "w-90"
      }`}
    >
      <div className="flex items-baseline justify-between gap-4 px-1 pb-2">
        <span className="text-body font-semibold">{open.label}</span>
        <span className="text-small text-muted nums">
          {open.time.replace(" watched", "")}
          {titles && titles.length > 1 && ` · ${titles.length} titles`}
        </span>
      </div>
      {titles === null ? (
        [0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3.5 px-1 py-1.5" aria-hidden>
            <div className="aspect-poster w-9 sk rounded-md" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="h-4 w-2/3 sk rounded-full" />
              <div className="h-3 w-1/2 sk rounded-full" />
            </div>
          </div>
        ))
      ) : titles.length === 0 ? (
        <p className="px-1 py-2 text-small text-muted">Couldn&apos;t load this day. Try again.</p>
      ) : (
        // a busy day scrolls inside the card (about 5 rows tall), the page stays put
        <ol className="-mx-1 flex max-h-80 flex-col overflow-y-auto overscroll-contain px-1">
          {titles.map((t) => (
            <li key={t.key}>
              <Link
                href={t.href}
                className="flex items-center gap-3.5 rounded-thumb px-1 py-1.5 transition-colors duration-200 hover:bg-fg/5"
              >
                <span className="relative aspect-poster w-9 shrink-0 overflow-hidden rounded-md bg-raised">
                  {t.poster && <TmdbImage src={t.poster} lowSrc={t.poster} alt="" sizes="36px" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label font-semibold">{t.title}</span>
                  <span className="block truncate text-small text-muted nums">{t.meta}</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
