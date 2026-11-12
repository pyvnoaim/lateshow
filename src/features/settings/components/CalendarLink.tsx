"use client";

import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { useCopy } from "@/components/useCopy";

/** The private feed link in a read-only pill with Copy, and Add to calendar that opens the calendar app. */
export function CalendarLink({ url }: { url: string }) {
  const { copied, copy } = useCopy();
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
    </div>
  );
}
