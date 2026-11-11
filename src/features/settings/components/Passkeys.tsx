"use client";

import { ScanFace } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";
import { forget, HAS_PASSKEY, remember } from "@/lib/passkeyHint";

type Key = { id: string; name: string; added: string };

/** Settings · Sign-in: where your code goes, your passkeys (remove), and Add a passkey. */
export function Passkeys({
  email,
  keys,
  remove,
}: {
  email: string;
  keys: Key[];
  remove: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="flex max-w-reading flex-col gap-5">
      <p className="text-body leading-normal text-muted">
        Codes go to <span className="text-fg">{email}</span>. Passkeys sign you in with one tap.
      </p>
      {keys.length === 0 ? (
        <p className="text-body text-muted">No passkeys yet. You sign in with a code.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center gap-4 rounded-banner glass-cell px-5 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-thumb bg-fg/6">
                <ScanFace size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-label font-medium">{k.name}</span>
                <span className="block text-caption text-muted">Added {k.added}</span>
              </span>
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
                className={buttonStyles("text", "text", "text-small text-danger hover:text-danger")}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
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
            })
          }
          className={buttonStyles("glass", "sm")}
        >
          Add a passkey
        </button>
        <span className="text-caption text-muted">One per device, or one that syncs (iCloud Keychain, Google).</span>
      </div>
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
