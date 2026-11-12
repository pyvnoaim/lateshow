"use client";

import { Users } from "lucide-react";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";

/** Opens a swipe room over this list. Everyone you bring swipes the same titles, the first all-yes wins. */
export function SwipeListButton({ start }: { start: () => Promise<{ error: string } | undefined> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await start();
            if (r) setError(r.error);
          })
        }
        className={buttonStyles("primary", "sm")}
      >
        <Users size={18} strokeWidth={1.75} aria-hidden />
        Pick one together
      </button>
      {error && <span className="text-small text-danger">{error}</span>}
    </div>
  );
}
