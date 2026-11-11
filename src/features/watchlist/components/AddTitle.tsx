"use client";

import { Plus } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import type { AddResult } from "@/lib/library/actions";

/** "Add a title": results drop down while you type (2+ letters), tap one or press Enter for the first. */
export function AddTitle({
  find,
  add,
}: {
  find: (q: string) => Promise<AddResult[]>;
  add: (r: AddResult) => Promise<void>;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<AddResult[]>([]);
  const [added, setAdded] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (q.trim().length < 2) return;
    const timer = setTimeout(() => void find(q).then(setResults), 250);
    return () => clearTimeout(timer);
  }, [q, find]);

  const shown = q.trim().length < 2 ? [] : results;
  const keyOf = (r: AddResult) => `${r.type}-${r.id}`;
  const put = (r: AddResult) => {
    if (r.listed || added.includes(keyOf(r))) return;
    setAdded((a) => [...a, keyOf(r)]);
    startTransition(() => add(r));
  };
  function submit(e: FormEvent) {
    e.preventDefault();
    if (shown[0]) put(shown[0]);
  }

  return (
    <form onSubmit={submit} className={`${fieldStyles("md")} relative w-full overflow-visible sm:w-88`}>
      <Plus size={16} strokeWidth={2} aria-hidden />
      <label htmlFor="add-title" className="sr-only">
        Add a title
      </label>
      <input
        id="add-title"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        placeholder="Add a title"
        className={fieldInputStyles}
      />
      {shown.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-30 mt-2 flex pop flex-col rounded-banner p-1.5 glass">
          {shown.map((r) => {
            const on = r.listed || added.includes(keyOf(r));
            return (
              <li key={keyOf(r)}>
                <button
                  type="button"
                  onClick={() => put(r)}
                  className="flex h-14 w-full items-center gap-3 rounded-thumb px-2.5 text-left transition-colors hover:bg-fg/8"
                >
                  <span className="relative h-11 w-7.5 shrink-0 overflow-hidden rounded-sm bg-raised">
                    {r.poster && <Image src={r.poster} alt="" fill sizes="30px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label">{r.title}</span>
                    <span className="block text-caption text-muted">{r.meta}</span>
                  </span>
                  <span className={`text-caption ${on ? "text-accent" : "text-muted"}`}>{on ? "Added" : "Add"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </form>
  );
}
