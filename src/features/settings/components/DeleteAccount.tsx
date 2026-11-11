"use client";

import { useState, useTransition, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";

/**
 * Two steps, all on the page (no browser dialog): "Delete account" sits next to the other data action (`children`),
 * clicking it swaps the row for a plain warning with "Delete for good".
 */
export function DeleteAccount({ remove, children }: { remove: () => Promise<void>; children: ReactNode }) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <div className="flex flex-wrap gap-3">
        {children}
        <button type="button" onClick={() => setAsking(true)} className={buttonStyles("danger", "sm")}>
          Delete account
        </button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-body text-fg">
        Your history, watchlist and services go with it.
        <br />
        <span className="text-muted">This can&apos;t be undone.</span>
      </p>
      <div className="flex items-center gap-6">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => remove())}
          className={buttonStyles("dangerConfirm", "sm")}
        >
          {pending ? "Deleting" : "Delete for good"}
        </button>
        <button type="button" onClick={() => setAsking(false)} className={buttonStyles("text", "text")}>
          Keep my account
        </button>
      </div>
    </div>
  );
}
