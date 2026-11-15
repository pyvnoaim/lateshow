"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";

/** `browser`: "Chrome on macOS", null until a key connected or used since 2026-11-15 says */
export type Connected = { id: string; created: string; used: string | null; browser: string | null };

/**
 * Settings › Extension. Your connected browsers with Disconnect. Opened by the extension with ?connect=extension it
 * asks first, then hands the new key to the extension's script on this page (this window only) and waits for it to
 * say it has it.
 */
export function ExtensionKeys({
  connected,
  connect,
  disconnect,
}: {
  connected: Connected[];
  connect: () => Promise<string>;
  disconnect: (id: string) => Promise<void>;
}) {
  // only the extension opens Settings with this, and only after you clicked Connect there
  const asked = useSearchParams().get("connect") === "extension";
  const [state, setState] = useState<"idle" | "waiting" | "done" | "missing">("idle");
  const [gone, setGone] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const ack = (e: MessageEvent) => {
      if (e.source === window && (e.data as { type?: string })?.type === "lateshow:extension-connected")
        setState("done");
    };
    window.addEventListener("message", ack);
    return () => window.removeEventListener("message", ack);
  }, []);

  const doConnect = () =>
    startTransition(async () => {
      const key = await connect();
      setState("waiting");
      window.postMessage({ type: "lateshow:extension-key", key }, location.origin);
      // no answer: the extension isn't in this browser (the key is useless without it, Disconnect removes it)
      setTimeout(() => setState((s) => (s === "waiting" ? "missing" : s)), 3000);
    });

  const shown = connected.filter((c) => !gone.includes(c.id));

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {asked && state !== "done" && (
        <div className="flex flex-col items-start gap-4">
          <p className="text-body text-fg">
            Connect the Lateshow extension in this browser?
            <br />
            <span className="text-muted">It can then mark what you finish. Nothing else.</span>
          </p>
          {state === "missing" ? (
            <p className="text-small text-danger">The extension didn&apos;t answer. Reload it and connect again.</p>
          ) : (
            <button type="button" disabled={pending} onClick={doConnect} className={buttonStyles("primary", "sm")}>
              {pending || state === "waiting" ? "Connecting" : "Connect"}
            </button>
          )}
        </div>
      )}
      {state === "done" && <p className="text-body text-fg">Connected. You can close this tab.</p>}
      {shown.length > 0 ? (
        <ul className="flex w-full flex-col gap-3" aria-label="Connected browsers">
          {shown.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <span className="text-label">
                {c.browser ?? "A browser"}{" "}
                <span className="text-muted">
                  · connected {c.created} · {c.used ? `used ${c.used}` : "not used yet"}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await disconnect(c.id);
                    setGone((g) => [...g, c.id]);
                  })
                }
                className={buttonStyles("text", "text")}
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !asked && (
          <p className="text-small text-muted">Not connected. Open the Lateshow extension and choose Connect.</p>
        )
      )}
    </div>
  );
}
