"use client";

import { UserPlus, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { UsernameForm } from "@/components/UsernameForm";
import { buttonStyles } from "@/components/ui/button";
import { useCopy } from "@/components/useCopy";
import type { InviteLink } from "@/lib/friends/actions";

/**
 * "Invite a friend" in the profile header. Opens a glass card over the page under the header, with the link, Copy
 * and New link. The header must be `relative` (with a z-index) for that. Esc closes it.
 */
export function InviteButton({ getLink }: { getLink: (fresh: boolean) => Promise<InviteLink> }) {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<InviteLink | null>(null);
  const { copied, copy } = useCopy();
  const [pending, startTransition] = useTransition();

  const load = (fresh: boolean) =>
    startTransition(async () => {
      setLink(await getLink(fresh));
    });
  useEffect(() => {
    if (!open) return;
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const url = link && "code" in link ? `${window.location.origin}/invite/${link.code}` : "";

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          if (!open && !link) load(false);
        }}
        className={buttonStyles("glass", "sm")}
      >
        <UserPlus size={18} strokeWidth={1.75} aria-hidden />
        Invite a friend
      </button>
      {open && (
        // over the page, not a row of its own: nothing below moves when it opens
        <div className="absolute top-full right-0 mt-3 flex w-full justify-end">
          {/* solid backing: over the page, see-through glass would mix with the text below */}
          <div className="w-full max-w-form pop rounded-banner bg-bg shadow-2xl">
            <div className="flex flex-col gap-5 rounded-banner p-7 glass">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-2">
                  <h2 className="text-section leading-none font-bold">Invite a friend</h2>
                  <p className="text-small leading-normal text-muted">
                    Send this link. Whoever opens it
                    <br />
                    can add you as a friend.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  data-tip="Close"
                  onClick={() => setOpen(false)}
                  className={buttonStyles("glass", "icon")}
                >
                  <X size={18} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
              {link && "error" in link ? (
                link.error === "username" ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-small text-muted">First, the name your friend will see. Never your email.</p>
                    <UsernameForm button="Save, get link" onSaved={() => load(false)} />
                  </div>
                ) : (
                  <p className="text-small text-muted">Sign in again to make a link.</p>
                )
              ) : (
                <>
                  <div className="flex h-14 items-center gap-3 rounded-full glass-cell pr-1.5 pl-5">
                    <span className="min-w-0 flex-1 truncate text-label">
                      {url ? (
                        <>
                          <span className="text-muted">{url.slice(0, url.lastIndexOf("/") + 1)}</span>
                          {url.slice(url.lastIndexOf("/") + 1)}
                        </>
                      ) : (
                        <span className="text-muted">Making a link</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={!url}
                      onClick={() => void copy(url)}
                      className={buttonStyles("primary", "sm")}
                    >
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                  <div className="flex flex-wrap justify-between gap-x-4 gap-y-2 text-caption text-muted">
                    <span>Works for 7 days, for up to 5 friends.</span>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => load(true)}
                      className={buttonStyles("text", "text", "text-caption")}
                    >
                      New link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
