"use client";

import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";

/** Two steps, all on the page (no browser dialog): "Delete account", then a plain warning and "Delete for good". */
export function DeleteAccount({ remove }: { remove: () => Promise<void> }) {
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!asking) {
    return (
      <button type="button" onClick={() => setAsking(true)} className={buttonStyles("text", "text")}>
        Delete account
      </button>
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
          className={buttonStyles("primary", "sm")}
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
