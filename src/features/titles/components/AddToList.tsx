"use client";

import { Check, ListPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

type MyList = { id: string; name: string; has: boolean };

/**
 * "Add to a list" on a title page: a glass card above the button with your lists (tap to add or take off, saved in
 * the background) and a field for a new one. Esc or a click outside closes it, like the invite card.
 */
export function AddToList({
  lists,
  toggle,
  create,
}: {
  lists: MyList[];
  toggle: (listId: string, on: boolean) => Promise<void>;
  create: (name: string) => Promise<string>;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useOptimistic(lists, (all, { id, has }: { id: string; has: boolean }) =>
    all.map((l) => (l.id === id ? { ...l, has } : l)),
  );
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const wrap = useRef<HTMLDivElement>(null);
  const onAny = shown.some((l) => l.has);

  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const outside = (e: PointerEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", close);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);

  const flip = (l: MyList) =>
    startTransition(async () => {
      setShown({ id: l.id, has: !l.has });
      await toggle(l.id, !l.has).catch(() => {}); // falls back to the saved state when the transition ends
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    startTransition(async () => {
      await create(n);
      setName("");
    });
  };

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-label="Add to a list"
        // no tooltip while the card is open, it would sit on top of it
        data-tip={open ? undefined : onAny ? "On your lists" : "Add to a list"}
        onClick={() => setOpen(!open)}
        className={buttonStyles(onAny ? "accent" : "glass", "icon")}
      >
        <ListPlus size={20} strokeWidth={onAny ? 2.25 : 1.75} aria-hidden />
      </button>
      {open && (
        // opens upward: the hero clips anything below its edge. Solid backing, see-through glass would mix with the text
        <div className="absolute bottom-full left-0 z-20 mb-3 w-72 pop rounded-banner bg-bg shadow-2xl">
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
              <label htmlFor="new-list" className="sr-only">
                New list
              </label>
              <input
                id="new-list"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder={shown.length ? "New list" : "Name your first list"}
                className={fieldInputStyles}
                autoFocus
              />
              <button type="submit" disabled={pending || !name.trim()} className={buttonStyles("primary", "iconSm")}>
                <span className="sr-only">Create list</span>
                <ListPlus size={16} strokeWidth={2} aria-hidden />
              </button>
            </form>
            <Link href="/u/me?tab=lists" className={buttonStyles("text", "text", "self-start px-3 py-1 text-caption")}>
              All your lists
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
