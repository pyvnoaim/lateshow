"use client";

import { ScanFace } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";
import { forget, HAS_PASSKEY, remember } from "@/lib/passkeyHint";

type Key = { id: string; name: string; added: string };

/** Settings · Passkeys: the ones you have (remove) and Add a passkey. */
export function Passkeys({ keys, remove }: { keys: Key[]; remove: (id: string) => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      {keys.length > 0 && (
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
        className={`self-start ${buttonStyles("glass", "sm")}`}
      >
        Add a passkey
      </button>
      {error && (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
