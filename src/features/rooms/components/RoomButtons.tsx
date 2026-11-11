"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

/** Joins with your account as soon as you open the room (you opened its link, that's the intent). */
export function AutoJoin({ code, join }: { code: string; join: (code: string) => Promise<void> }) {
  useEffect(() => {
    void join(code);
  }, [code, join]);
  return <p className="text-body text-muted">Joining</p>;
}

/** No account: a name and Join. */
export function GuestJoin({
  code,
  join,
}: {
  code: string;
  join: (code: string, name: string) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(e: FormEvent) {
    e.preventDefault();
    startTransition(async () => setError((await join(code, name)) ?? ""));
  }
  return (
    <div className="flex max-w-form flex-col gap-3">
      <form onSubmit={submit} className={fieldStyles("lg")}>
        <label htmlFor="guest-name" className="sr-only">
          Your name
        </label>
        <input
          id="guest-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoComplete="nickname"
          placeholder="Your name"
          className={fieldInputStyles}
        />
        <button type="submit" disabled={pending || !name.trim()} className={buttonStyles("primary", "sm")}>
          {pending ? "Joining" : "Join"}
        </button>
      </form>
      {error && (
        <p role="alert" className="pl-5 text-caption text-muted">
          {error}
        </p>
      )}
    </div>
  );
}

export function CopyRoomLink({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard.writeText(`${window.location.origin}/rooms/${code}`).then(() => setCopied(true))
      }
      className={buttonStyles("glass", "sm")}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

export function StartRoom({ code, start }: { code: string; start: (code: string) => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => start(code))}
      className={buttonStyles("primary", "md")}
    >
      {pending ? "Starting" : "Start"}
    </button>
  );
}

export function LeaveRoom({
  code,
  leave,
  host,
}: {
  code: string;
  leave: (code: string) => Promise<void>;
  host: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await leave(code);
          router.push("/rooms");
        })
      }
      className={buttonStyles("text", "text")}
    >
      {host ? "Close room" : "Leave"}
    </button>
  );
}

export function PlayAgain({ code, again }: { code: string; again: (code: string) => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => again(code))}
      className={buttonStyles("glass", "md")}
    >
      {pending ? "Dealing" : "Play again"}
    </button>
  );
}
