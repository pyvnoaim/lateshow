"use client";

import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

/**
 * Under the title's buttons after you marked some of it: marking means "today", this moves it to the day you actually
 * watched or to no date ("A while ago": counts everywhere, stays off the heatmap and Recently watched). The line is
 * gone once nothing of the title is from the last day.
 */
export function WhenWatched({ redate }: { redate: (when: string | null) => Promise<void> }) {
  const [pending, start] = useTransition();
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState("");
  const [failed, setFailed] = useState(false);
  const save = (when: string | null) =>
    start(async () => {
      setFailed(false);
      await redate(when).catch(() => setFailed(true));
    });

  return (
    <div
      className={`flex basis-full flex-wrap items-center gap-x-4 gap-y-2 text-small text-muted transition-opacity ${pending ? "opacity-50" : ""}`}
    >
      <span>{failed ? "Couldn't save that. Try again." : "Marked as today. Watched it earlier?"}</span>
      <button type="button" disabled={pending} onClick={() => save(null)} className={buttonStyles("text", "text")}>
        A while ago
      </button>
      {picking ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (day) save(day);
          }}
        >
          <label className={fieldStyles()}>
            <span className="sr-only">Day you watched it</span>
            {/* max is today on this device, the server checks again */}
            <input
              type="date"
              required
              autoFocus
              min="1900-01-01"
              max={new Date().toISOString().slice(0, 10)}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              className={`${fieldInputStyles} scheme-dark`}
            />
          </label>
          <button type="submit" disabled={pending || !day} className={buttonStyles("glass", "sm")}>
            Save
          </button>
        </form>
      ) : (
        <button type="button" onClick={() => setPicking(true)} className={buttonStyles("text", "text")}>
          Pick a date
        </button>
      )}
    </div>
  );
}
