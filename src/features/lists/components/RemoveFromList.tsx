"use client";

import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";

/** "Remove" under a poster on your own list. The poster leaves when the page refreshes. */
export function RemoveFromList({ remove }: { remove: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [gone, setGone] = useState(false);
  return (
    <button
      type="button"
      disabled={pending || gone}
      onClick={() =>
        startTransition(async () => {
          setGone(true);
          await remove().catch(() => setGone(false));
        })
      }
      className={buttonStyles("text", "text", "self-start text-caption")}
    >
      {gone ? "Removed" : "Remove"}
    </button>
  );
}
