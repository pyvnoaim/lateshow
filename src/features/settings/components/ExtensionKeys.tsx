"use client";

import { Download, Globe } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { CHROME_STORE_URL } from "@/lib/site";
import { Invite, ListBox, ListRow } from "./ListBox";
import { useExtension } from "@/components/useExtension";

/** `browser`: "Chrome on macOS", null until a key connected or used since 2026-11-15 says */
export type Connected = { id: string; created: string; used: string | null; browser: string | null };

/**
 * Settings › Extension, by what this browser has: no extension (Add, where it can have one), the extension but not
 * connected (Connect this browser), connected (the list, "this browser" marked). Connecting asks the server for a key
 * and hands it to the extension's script on this page (this window only), then waits for it to say it has it. The
 * popup opens this page with ?connect=extension for the same.
 */
export function ExtensionKeys({
  connected,
  latest,
  connect,
  disconnect,
}: {
  connected: Connected[];
  /** the newest signed extension for Zen and Firefox, null before CI published one */
  latest: { version: string; link: string } | null;
  connect: () => Promise<string>;
  disconnect: (id: string) => Promise<void>;
}) {
  const asked = useSearchParams().get("connect") === "extension";
  const ext = useExtension();
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
  const here = ext?.keyId ? shown.find((c) => c.id === ext.keyId) : undefined;
  // the extension is here but its key isn't one of yours (never connected, disconnected, another account)
  const offerConnect = state !== "done" && (asked || (ext?.version != null && !here));
  const offerAdd = ext != null && ext.version == null && !asked;
  // Zen and Firefox check for updates about once a day, a click on the signed file updates now. Chrome's store
  // updates by itself and its newest version may still be in review, so it's never offered there
  const offerUpdate =
    ext?.kind === "firefox" &&
    ext.version != null &&
    latest != null &&
    ext.version.localeCompare(latest.version, undefined, { numeric: true }) < 0;

  const logo = (
    // the icon's glass screen with its light, as on the extension's popup
    // eslint-disable-next-line @next/next/no-img-element -- an svg needs no optimizing
    <img src="/icon.svg" alt="" width={48} height={48} />
  );

  return (
    <div className="flex w-full flex-col items-start gap-4">
      {offerConnect && (
        <Invite
          glow
          icon={logo}
          title={ext?.version ? `Lateshow ${ext.version} is in this browser` : "Connect the Lateshow extension"}
          text={
            state === "missing"
              ? "The extension didn't answer. Reload it and connect again."
              : "Connect it to mark what you finish here. It can't do anything else."
          }
        >
          <button type="button" disabled={pending} onClick={doConnect} className={buttonStyles("primary", "sm")}>
            {pending || state === "waiting" ? "Connecting" : "Connect"}
          </button>
        </Invite>
      )}
      {state === "done" && <p className="text-body text-fg">Connected. You can close this tab.</p>}
      {offerUpdate && (
        <Invite
          glow
          icon={logo}
          title={`Lateshow ${latest.version} is out`}
          text={`This browser has ${ext.version}. Update now, or it updates by itself within a day.`}
        >
          <a href={latest.link} className={buttonStyles("primary", "sm")}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Update
          </a>
        </Invite>
      )}
      {offerAdd && ext.kind === "firefox" && latest && (
        <Invite
          glow
          icon={logo}
          title="Get the Lateshow extension"
          text="Free, and it updates by itself. Come back here to connect it."
        >
          {/* a plain link: Zen and Firefox install a signed add-on from it after asking */}
          <a href={latest.link} className={buttonStyles("primary", "sm")}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Add to Zen
          </a>
        </Invite>
      )}
      {offerAdd && ext.kind === "chrome" && CHROME_STORE_URL && (
        <Invite
          glow
          icon={logo}
          title="Get the Lateshow extension"
          text="Free, and it updates by itself. Come back here to connect it."
        >
          <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className={buttonStyles("primary", "sm")}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Add to Chrome
          </a>
        </Invite>
      )}
      {offerAdd && ext.kind === "webkit" && CHROME_STORE_URL && (
        <Invite
          glow
          icon={logo}
          title="Get the Lateshow extension"
          text="Free, from the Chrome Web Store. Lenira adds it there. Come back here to connect it."
        >
          <a href={CHROME_STORE_URL} target="_blank" rel="noreferrer" className={buttonStyles("primary", "sm")}>
            <Download size={16} strokeWidth={2} aria-hidden />
            Add to Lenira
          </a>
        </Invite>
      )}
      {offerAdd && ext.kind === "chrome" && !CHROME_STORE_URL && (
        <p className="text-small text-pretty text-muted">
          For Chrome it&apos;s coming to the Chrome Web Store. Zen and Firefox have it now.
        </p>
      )}
      {shown.length > 0 && (
        <ListBox label="Connected browsers">
          {shown.map((c) => (
            <ListRow
              key={c.id}
              accent={c === here}
              icon={<Globe size={16} strokeWidth={2} />}
              title={
                <>
                  {c.browser ?? "A browser"}
                  {c === here && <span className="text-caption text-accent"> · this browser</span>}
                </>
              }
              sub={`Connected ${c.created} · ${c.used ? `last used ${c.used}` : "not used yet"}`}
            >
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await disconnect(c.id);
                    setGone((g) => [...g, c.id]);
                  })
                }
                className={buttonStyles("text", "text", "text-small hover:text-danger")}
              >
                Disconnect
              </button>
            </ListRow>
          ))}
        </ListBox>
      )}
      {shown.length === 0 && ext?.kind === "none" && (
        // the same box as Add and Connect, without an action: a bare grey line looked like the section failed to load
        <Invite
          icon={logo}
          title="Not for this browser"
          text="The extension runs in Zen, Firefox, Chrome and Lenira on a computer."
        />
      )}
    </div>
  );
}
