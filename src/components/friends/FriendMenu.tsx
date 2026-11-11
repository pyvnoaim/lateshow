"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";

/**
 * "✓ Friends" on a friend's profile. Opens a small glass menu with Remove friend, which asks first (on the page, no
 * browser dialog) as its own row under the header (`basis-full`). After removing you land on your friends list.
 */
export function FriendMenu({
  friendId,
  name,
  remove,
}: {
  friendId: string;
  name: string;
  remove: (friendId: string) => Promise<void>;
}) {
  const [menu, setMenu] = useState(false);
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <>
      <div className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
          className={buttonStyles("glass", "sm")}
        >
          <Check size={16} strokeWidth={2} aria-hidden />
          Friends
        </button>
        {menu && (
          <div role="menu" className="absolute top-full right-0 z-30 mt-2 flex pop flex-col rounded-thumb p-1.5 glass">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                setAsking(true);
              }}
              className="flex h-11 items-center rounded-thumb px-3.5 text-label whitespace-nowrap text-danger transition-colors hover:bg-fg/10"
            >
              Remove friend
            </button>
          </div>
        )}
      </div>
      {asking && (
        <div className="order-last flex basis-full rise flex-col items-start gap-4">
          <p className="text-body leading-normal">
            Remove {name} as a friend?
            <br />
            <span className="text-muted">You stop seeing each other&apos;s activity. They won&apos;t be told.</span>
          </p>
          <div className="flex items-center gap-6">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await remove(friendId);
                  router.push("/u/me?tab=friends");
                })
              }
              className={buttonStyles("dangerConfirm", "sm")}
            >
              {pending ? "Removing" : "Remove"}
            </button>
            <button type="button" onClick={() => setAsking(false)} className={buttonStyles("text", "text")}>
              Keep
            </button>
          </div>
        </div>
      )}
    </>
  );
}
