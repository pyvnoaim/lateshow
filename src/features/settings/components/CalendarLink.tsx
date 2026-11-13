"use client";

import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { useCopy } from "@/components/useCopy";

/**
 * The private feed link in a read-only pill with Copy, Add to calendar that opens the calendar app, and New link
 * (asks first: the old link stops working, every calendar using it needs the new one).
 */
export function CalendarLink({ url, renew }: { url: string; renew: () => Promise<void> }) {
  const { copied, copy } = useCopy();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex max-w-form flex-col gap-3">
      <div className={fieldStyles("lg")}>
        <label htmlFor="calendar-url" className="sr-only">
          Calendar link
        </label>
        <input
          id="calendar-url"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className={fieldInputStyles}
        />
        <button type="button" onClick={() => void copy(url)} className={buttonStyles("glass", "sm")}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <a href={url.replace(/^https?:/, "webcal:")} className={`self-start ${buttonStyles("primary", "sm")}`}>
        Add to calendar
      </a>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-caption text-muted">
        {asking ? (
          <>
            <span>The old link stops working. Calendars using it need the new one.</span>
            <span className="flex gap-4">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await renew().catch(() => {});
                    setAsking(false);
                  })
                }
                className={buttonStyles("text", "text", "text-caption")}
              >
                {pending ? "Making a link" : "Make a new link"}
              </button>
              <button
                type="button"
                onClick={() => setAsking(false)}
                className={buttonStyles("text", "text", "text-caption")}
              >
                Keep this one
              </button>
            </span>
          </>
        ) : (
          <>
            <span>Shared it by mistake? Retire it.</span>
            <button
              type="button"
              onClick={() => setAsking(true)}
              className={buttonStyles("text", "text", "text-caption")}
            >
              New link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
