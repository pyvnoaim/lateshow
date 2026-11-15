"use client";

import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";

export type PastImport = { id: string; source: string; when: string; watches: number; listed: number };

const n = (x: number) => x.toLocaleString("en");
const what = (i: PastImport) =>
  [
    i.watches && `${n(i.watches)} ${i.watches === 1 ? "watch" : "watches"}`,
    i.listed && `${n(i.listed)} on your watchlist`,
  ]
    .filter(Boolean)
    .join(" · ");

/**
 * Under Import: each past import that still holds something, with Remove (asks first, it can't be undone). Removing
 * takes back only what that import added, see removeImport.
 */
export function PastImports({ imports, remove }: { imports: PastImport[]; remove: (id: string) => Promise<void> }) {
  const [asking, setAsking] = useState<string | null>(null);
  const [gone, setGone] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();
  const shown = imports.filter((i) => !gone.includes(i.id));
  if (!shown.length) return null;

  return (
    <ul className="flex w-full flex-col gap-4" aria-label="Past imports">
      {shown.map((i) => (
        <li key={i.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="text-label">
              {i.source} <span className="text-muted">· {i.when}</span>
            </span>
            {asking !== i.id && (
              <button type="button" onClick={() => setAsking(i.id)} className={buttonStyles("text", "text")}>
                Remove
              </button>
            )}
          </div>
          <span className="text-small text-muted nums">{what(i)}</span>
          {asking === i.id && (
            <div className="flex flex-col items-start gap-3 pt-1">
              <p className="text-small text-fg">
                Remove {what(i)}? What you marked yourself stays.
                <br />
                <span className="text-muted">This can&apos;t be undone.</span>
              </p>
              <div className="flex items-center gap-6">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await remove(i.id);
                      setGone((g) => [...g, i.id]);
                      setAsking(null);
                    })
                  }
                  className={buttonStyles("dangerConfirm", "sm")}
                >
                  {pending ? "Removing" : "Remove for good"}
                </button>
                <button type="button" onClick={() => setAsking(null)} className={buttonStyles("text", "text")}>
                  Keep them
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
