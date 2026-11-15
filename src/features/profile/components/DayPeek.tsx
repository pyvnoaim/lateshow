"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { TmdbImage } from "@/components/TmdbImage";

export type PeekTitle = { key: string; title: string; meta: string; poster: string | null; href: string };

const ROWS = 4; // more than this and the card shows a strip of every title plus a link to the full day view
const WIDTH = 360; // w-90
const GAP = 10;

type Open = { date: string; label: string; time: string; href: string; rect: DOMRect };

/**
 * The heatmap's day card: a click on a lit day (an `a[data-day]` inside) opens a small glass card at the square with
 * the day's titles, Esc, a click outside or scrolling closes it. The link itself still goes to `?day=` (the full
 * day view) for a new tab, and that's where "All n titles" leads. Phones get the card as a sheet at the bottom.
 */
export function DayPeek({ peek, children }: { peek: (date: string) => Promise<PeekTitle[]>; children: ReactNode }) {
  const [open, setOpen] = useState<Open | null>(null);
  const [titles, setTitles] = useState<PeekTitle[] | null>(null);
  const cache = useRef(new Map<string, PeekTitle[]>());
  const latest = useRef("");
  const card = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const onClick = (e: MouseEvent) => {
    const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[data-day]") : null;
    // new tab, new window: let the browser follow the link
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    const date = a.dataset.day!;
    opener.current = a;
    latest.current = date;
    setOpen({
      date,
      label: a.dataset.tip ?? date,
      time: a.dataset.tipMeta ?? "",
      href: a.getAttribute("href")!,
      rect: a.getBoundingClientRect(),
    });
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
    card.current?.focus({ preventScroll: true });
    const close = (refocus: boolean) => {
      latest.current = "";
      setOpen(null);
      if (refocus) opener.current?.focus({ preventScroll: true });
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
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("scroll", scroll, { capture: true });
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  return (
    <div onClick={onClick}>
      {children}
      {open &&
        createPortal(<Card open={open} titles={titles} cardRef={card} close={() => setOpen(null)} />, document.body)}
    </div>
  );
}

function Card({
  open,
  titles,
  cardRef,
  close,
}: {
  open: Open;
  titles: PeekTitle[] | null;
  cardRef: React.RefObject<HTMLDivElement | null>;
  close: () => void;
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
  const many = titles && titles.length > ROWS;

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={open.label}
      tabIndex={-1}
      style={style}
      className={`fixed z-50 flex pop flex-col gap-1 rounded-poster p-4 pb-3 glass-deep outline-none ${
        phone ? "inset-x-4 bottom-4" : "w-90"
      }`}
    >
      <div className="flex flex-col gap-2.5 px-1 pb-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-body font-semibold">{open.label}</span>
          <span className="text-small text-muted nums">
            {open.time.replace(" watched", "")}
            {titles && titles.length > 1 && ` · ${titles.length} titles`}
          </span>
        </div>
        {/* a busy day: every title as a sliver of its poster, so its size shows at once */}
        {many && (
          <div className="flex h-8 gap-1" aria-hidden>
            {titles.map((t) => (
              <span key={t.key} className="relative flex-1 overflow-hidden rounded-sm bg-raised">
                {t.poster && <TmdbImage src={t.poster} lowSrc={t.poster} alt="" sizes="32px" />}
              </span>
            ))}
          </div>
        )}
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
        <ol className="flex flex-col">
          {titles.slice(0, ROWS).map((t) => (
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
      {many && (
        <Link
          href={open.href}
          scroll={false}
          onClick={close}
          className="mt-1 px-1 pt-2.5 text-label font-semibold transition-colors hover:text-muted"
        >
          All {titles.length} titles
        </Link>
      )}
    </div>
  );
}
