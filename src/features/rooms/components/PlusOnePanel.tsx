"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useExtension } from "@/components/useExtension";

type Control = "everyone" | "host";
type Netflix = { id: string; season?: number; episode?: number } | null;

/**
 * Plus one in a room: "Watch in sync" hands the room's code to this browser's extension (lateshow.ts), which then
 * keeps your Netflix player with the room's. The room's maker picks who may pause and skip.
 */
export function PlusOnePanel({
  code,
  host,
  control,
  setControl,
  netflix,
}: {
  code: string;
  host: boolean;
  control: Control;
  setControl: (code: string, control: Control) => Promise<void>;
  /** the title on Netflix and the episode to open, null when it isn't on Netflix here */
  netflix: Netflix;
}) {
  const ext = useExtension();
  const [inRoom, setInRoom] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useOptimistic(control);
  const [, startTransition] = useTransition();

  // the extension says which room it's in, now and whenever that changes
  useEffect(() => {
    const on = (e: MessageEvent) => {
      const d = e.data as { type?: string; code?: string | null; ok?: boolean; message?: string } | null;
      if (e.source !== window) return;
      if (d?.type === "lateshow:plusone-state") setInRoom(d.code ?? null);
      if (d?.type === "lateshow:plusone-joined") setError(d.ok ? "" : (d.message ?? "That didn't work. Try again."));
    };
    window.addEventListener("message", on);
    window.postMessage({ type: "lateshow:plusone-ask" }, location.origin);
    return () => window.removeEventListener("message", on);
  }, []);

  const synced = inRoom === code;
  const ready = Boolean(ext?.version && ext.keyId);

  return (
    // laptops only: phones aren't in Plus one v1
    <section className="hidden flex-col gap-4 pt-2 sm:flex">
      <div className="flex flex-col gap-1">
        <h2 className="text-body font-bold">Watch in sync</h2>
        <p className="text-label text-pretty text-muted">
          {synced
            ? "This browser follows the room. Open it on Netflix, everyone plays and pauses together."
            : "Each on your own laptop and Netflix. One pause pauses everyone."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {synced && netflix && (
          <button
            type="button"
            className={buttonStyles("primary", "md")}
            onClick={() => window.postMessage({ type: "lateshow:plusone-open", ...netflix }, location.origin)}
          >
            Open {netflix.season != null ? `S${netflix.season} E${netflix.episode} ` : ""}on Netflix
          </button>
        )}
        {!ext ? null : synced ? (
          <button
            type="button"
            className={buttonStyles("glass", "md")}
            onClick={() => window.postMessage({ type: "lateshow:plusone-leave" }, location.origin)}
          >
            Stop syncing here
          </button>
        ) : ready ? (
          <button
            type="button"
            className={buttonStyles("glass", "md")}
            onClick={() => window.postMessage({ type: "lateshow:plusone-join", code }, location.origin)}
          >
            Join with this browser
          </button>
        ) : (
          <Link href="/settings" className={buttonStyles("glass", "md")}>
            {ext.version ? "Connect the extension" : "Get the extension"}
          </Link>
        )}
        <span className="text-small text-muted">Works in Chrome</span>
      </div>
      {error && <p className="text-small text-muted">{error}</p>}
      {host && (
        <div className="flex items-center gap-5">
          <span className="text-label text-muted">Pause and skip</span>
          <SegmentedTabs
            label="Who may pause and skip"
            items={(["everyone", "host"] as const).map((c) => ({
              key: c,
              label: c === "everyone" ? "Everyone" : "Only me",
              active: shown === c,
              onSelect: () =>
                startTransition(async () => {
                  setShown(c);
                  await setControl(code, c);
                }),
            }))}
          />
        </div>
      )}
    </section>
  );
}
