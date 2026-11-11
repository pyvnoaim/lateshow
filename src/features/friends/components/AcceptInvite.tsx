"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import type { AcceptResult } from "@/lib/friends/actions";

const PROBLEMS: Record<Exclude<AcceptResult, "friends" | "already">, string> = {
  signin: "You were signed out. Reload the page and sign in again.",
  username: "Pick a username in Settings first, then open this link again.",
  own: "This is your own invite. Send it to a friend.",
  expired: "This invite just ran out. Ask for a new link.",
  used: "This invite was just used up. Ask for a new link.",
  missing: "This invite doesn't exist anymore. Ask for a new link.",
};

/** Accept / Not now. On success the page turns into "You're friends." right away. */
export function AcceptInvite({
  code,
  host,
  accept,
  done,
}: {
  code: string;
  host: string;
  accept: (code: string) => Promise<AcceptResult>;
  /** What to show once you're friends (server rendered, both avatars). */
  done: ReactNode;
}) {
  const [result, setResult] = useState<AcceptResult | null>(null);
  const [pending, startTransition] = useTransition();

  if (result === "friends" || result === "already") return done;

  return (
    <div className="flex rise flex-col gap-10">
      <div className="flex flex-col gap-6">
        <h1 className="text-page leading-none font-bold break-words">
          Add {host}
          <br />
          <span className="text-muted">as a friend?</span>
        </h1>
        <p className="text-body leading-normal text-muted">
          You&apos;ll see each other&apos;s history and watchlist.
          <br />
          You can remove a friend any time.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(async () => setResult(await accept(code)))}
            className={buttonStyles("primary", "sm")}
          >
            {pending ? "Adding" : "Accept"}
          </button>
          <Link href="/" className={buttonStyles("text", "text")}>
            Not now
          </Link>
        </div>
        {result && (
          <p role="alert" className="text-caption text-muted">
            {PROBLEMS[result]}
          </p>
        )}
      </div>
    </div>
  );
}
