"use client";

import { Check, ListPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

export type MyList = { id: string; name: string; has: boolean };

const WIDTH = 288; // w-72
const GAP = 12;
const EDGE = 16; // the page gutter: the card never touches the screen edge

/**
 * Your lists for one title: tap one to put the title on it or take it off (saved in the background), or name a new
 * one. A native popover (top layer), so poster rows that scroll sideways can't clip it. It sits above the button
 * when there's room, else below, and closes on Esc, a tap outside, or scrolling.
 * `size`: the round glass button of a title page, or the quiet icon of a poster caption (next to the +).
 */
export function ListMenu({
  lists,
  toggle,
  create,
  name,
  size = "button",
}: {
  lists: MyList[];
  toggle: (listId: string, on: boolean) => Promise<void>;
  create: (name: string) => Promise<string>;
  /** the title, for screen readers */
  name: string;
  size?: "button" | "caption";
}) {
  const [shown, setShown] = useOptimistic(lists, (all, { id, has }: { id: string; has: boolean }) =>
    all.map((l) => (l.id === id ? { ...l, has } : l)),
  );
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();
  const onAny = shown.some((l) => l.has);

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    const onToggle = (e: Event) => setOpen((e as ToggleEvent).newState === "open");
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);
  useEffect(() => {
    if (!open) return;
    // it's placed once, against where the button was: scrolling would leave it floating elsewhere
    const close = () => card.current?.hidePopover();
    addEventListener("scroll", close, { passive: true, capture: true });
    return () => removeEventListener("scroll", close, { capture: true });
  }, [open]);

  const show = () => {
    const el = card.current;
    const b = button.current?.getBoundingClientRect();
    if (!el || !b) return;
    if (open) return el.hidePopover();
    el.showPopover();
    const h = el.offsetHeight;
    const left = Math.min(Math.max(b.right - WIDTH, EDGE), innerWidth - WIDTH - EDGE);
    const top = b.top - h - GAP >= EDGE ? b.top - h - GAP : b.bottom + GAP;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  };

  const flip = (l: MyList) =>
    startTransition(async () => {
      setShown({ id: l.id, has: !l.has });
      await toggle(l.id, !l.has).catch(() => {}); // falls back to the saved state when the transition ends
    });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = draft.trim();
    if (!n) return;
    startTransition(async () => {
      // signed out meanwhile or a bad name: keep what was typed rather than throwing to the error page
      if (await create(n).catch(() => null)) setDraft("");
    });
  };

  const label = onAny ? `${name} is on your lists` : `Add ${name} to a list`;
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        // no tooltip while the card is open, it would sit on top of it
        data-tip={open ? undefined : onAny ? "On your lists" : "Add to a list"}
        onClick={(e) => {
          e.preventDefault(); // a caption sits next to a link
          show();
        }}
        className={
          size === "button"
            ? buttonStyles(onAny ? "accent" : "glass", "icon")
            : `-m-1.5 inline-flex shrink-0 press items-center rounded-full p-1.5 transition-colors ${onAny ? "text-accent" : "text-muted hover:text-fg"}`
        }
      >
        <ListPlus
          size={size === "button" ? 20 : 14}
          strokeWidth={size === "button" ? (onAny ? 2.25 : 1.75) : 2.25}
          aria-hidden
        />
      </button>
      {/* top layer: none of the UA popover look (border, padding, canvas color), placed by show() */}
      <div
        ref={card}
        id={id}
        popover="auto"
        className="fixed inset-auto m-0 w-72 overflow-visible rounded-banner border-0 bg-bg p-0 text-fg shadow-2xl"
      >
        <div className="flex flex-col gap-2 rounded-banner p-3 glass">
          {shown.length > 0 && (
            <ul className="flex max-h-72 flex-col overflow-y-auto">
              {shown.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    aria-pressed={l.has}
                    onClick={() => flip(l)}
                    className="flex h-11 w-full press items-center gap-3 rounded-thumb px-3 text-left text-label transition-colors hover:bg-fg/5"
                  >
                    <span className="min-w-0 flex-1 truncate">{l.name}</span>
                    {l.has && <Check size={16} strokeWidth={2.25} className="shrink-0 text-accent" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={submit} className={fieldStyles()}>
            <label htmlFor={`${id}-new`} className="sr-only">
              New list
            </label>
            <input
              id={`${id}-new`}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={60}
              placeholder={shown.length ? "New list" : "Name your first list"}
              className={fieldInputStyles}
            />
            <button type="submit" disabled={pending || !draft.trim()} className={buttonStyles("primary", "iconSm")}>
              <span className="sr-only">Create list</span>
              <ListPlus size={16} strokeWidth={2} aria-hidden />
            </button>
          </form>
          <Link href="/u/me?tab=lists" className={buttonStyles("text", "text", "self-start px-3 py-1 text-caption")}>
            All your lists
          </Link>
        </div>
      </div>
    </>
  );
}
