"use client";

import { useEffect, useState } from "react";

/**
 * What this browser is, for the extension: it can add the signed one (Zen, Firefox), Chrome's from the store, a Mac
 * browser on WebKit that isn't Safari (Lenira: it adds Chrome Web Store extensions), or none.
 */
export type Kind = "firefox" | "chrome" | "webkit" | "none";
/** `safari`: the page has `window.safari`, which only Safari itself gives it. `touch`: an iPad says "Macintosh" too. Pure. */
export function kindOf(ua: string, safari = false, touch = false): Kind {
  if (/Android|iPhone|iPad|Mobile/.test(ua)) return "none";
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Chrome\//.test(ua)) return "chrome";
  if (/Macintosh.*Safari\//.test(ua) && !safari && !touch) return "webkit";
  return "none";
}

/** The extension's mark on this page (lateshow.ts): its version and its key's id, read once it has set them */
export function useExtension() {
  const [ext, setExt] = useState<{ version: string | null; keyId: string | null; kind: Kind } | null>(null);
  useEffect(() => {
    const read = () => {
      const d = document.documentElement.dataset;
      setExt({
        version: d.lateshowExtension ?? null,
        keyId: d.lateshowKey ?? null,
        kind: kindOf(navigator.userAgent, "safari" in window, navigator.maxTouchPoints > 0),
      });
    };
    read();
    // the extension's script may run after the page: it changes these attributes then
    const watch = new MutationObserver(read);
    watch.observe(document.documentElement, { attributeFilter: ["data-lateshow-extension", "data-lateshow-key"] });
    return () => watch.disconnect();
  }, []);
  return ext;
}
