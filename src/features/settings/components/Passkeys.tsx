"use client";

import { KeyRound, Plus, ScanFace } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";
import { forget, HAS_PASSKEY, remember } from "@/lib/passkeyHint";
import { Invite, ListBox, ListRow } from "./ListBox";

type Key = { id: string; name: string; added: string };

/**
 * Settings · Passkeys: the ones you have (rename, remove) with Add a passkey as the list's last row, or one clear
 * invitation when there's none yet.
 */
export function Passkeys({
  keys,
  remove,
  rename,
}: {
  keys: Key[];
  remove: (id: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const router = useRouter();

  const add = () =>
    startTransition(async () => {
      setError("");
      const res = await authClient.passkey.addPasskey();
      if (res?.error)
        setError(
          "code" in res.error && res.error.code === "SESSION_NOT_FRESH"
            ? "For your safety, sign out and back in first. Then add it right away."
            : "No passkey saved. Your device may have cancelled it.",
        );
      else {
        remember(HAS_PASSKEY);
        router.refresh();
      }
    });

  const save = (k: Key, name: string) => {
    setEditing(null);
    if (name.trim() && name.trim() !== k.name) startTransition(() => rename(k.id, name));
  };

  return (
    <div className="flex w-full flex-col gap-3">
      {keys.length > 0 ? (
        <ListBox label="Your passkeys">
          {keys.map((k) => (
            <ListRow
              key={k.id}
              accent
              icon={<KeyRound size={16} strokeWidth={2} />}
              title={
                editing === k.id ? (
                  <input
                    autoFocus
                    defaultValue={k.name}
                    maxLength={60}
                    aria-label={`New name for ${k.name}`}
                    onBlur={(e) => save(k, e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") save(k, e.currentTarget.value);
                      if (e.key === "Escape") setEditing(null);
                    }}
                    className="w-full rounded-sm bg-transparent text-label font-medium outline-1 outline-hairline focus:outline-accent"
                  />
                ) : (
                  k.name
                )
              }
              sub={`Added ${k.added}`}
            >
              <button
                type="button"
                disabled={pending}
                onClick={() => setEditing(k.id)}
                className={buttonStyles("text", "text", "text-small")}
              >
                Rename
              </button>
              <button
                type="button"
                disabled={pending}
                aria-label={`Remove ${k.name}`}
                onClick={() =>
                  startTransition(async () => {
                    await remove(k.id);
                    // none left: sign-in stops saying "Welcome back" with a button that can't work
                    if (keys.length === 1) forget(HAS_PASSKEY);
                  })
                }
                className={buttonStyles("text", "text", "text-small hover:text-danger")}
              >
                Remove
              </button>
            </ListRow>
          ))}
          <li>
            <button
              type="button"
              disabled={pending}
              onClick={add}
              className="flex w-full press items-center gap-3.5 py-4 text-left text-label font-medium text-accent"
            >
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-poster border border-dashed border-accent/40"
              >
                <Plus size={14} strokeWidth={2.2} />
              </span>
              Add a passkey
            </button>
          </li>
        </ListBox>
      ) : (
        <Invite
          icon={
            <span className="flex size-12 items-center justify-center rounded-thumb bg-accent/14 text-accent">
              <ScanFace size={22} strokeWidth={1.8} />
            </span>
          }
          title="Skip the email code next time"
          text="A passkey signs you in with one tap on this device."
        >
          <button type="button" disabled={pending} onClick={add} className={buttonStyles("primary", "sm")}>
            Add a passkey
          </button>
        </Invite>
      )}
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
