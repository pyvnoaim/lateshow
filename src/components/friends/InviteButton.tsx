"use client";

import { UserPlus, X } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { useCopy } from "@/components/useCopy";
import type { InviteLink } from "@/lib/friends/actions";

/**
 * "Invite a friend" in the profile header. Opens a glass card as its own row under the header (`basis-full`), with
 * the link, Copy and New link. The header must be a wrapping flex row for that.
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
        <div className="order-last flex basis-full justify-end">
          <div className="flex w-full max-w-form pop flex-col gap-5 rounded-banner p-7 glass">
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
              <p className="text-small text-muted">
                Pick a username first. Your friend sees it, never your email.{" "}
                <Link href="/settings" className="text-fg hover:underline">
                  Settings
                </Link>
              </p>
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
      )}
    </>
  );
}
