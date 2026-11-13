"use client";

import { useEffect, useState } from "react";
import { buttonStyles } from "@/components/ui/button";
import { BUILD_ID } from "@/lib/build";

const EVERY_MS = 10 * 60_000;
const INTRO_OUT_MS = 380; // --duration-intro-out

/**
 * After a deploy, a small glass bar at the bottom: "Lateshow got an update", Reload. The page knows
 * the build it came from (BUILD_ID, inlined), /api/version says what runs now. Checked when you
 * come back to the tab and every 10 minutes. Navigating reloads on its own anyway (Next's version skew handling),
 * this is for a page left open.
 */
export function UpdateBar() {
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    const check = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/version", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((v: { id?: string } | null) => v?.id && v.id !== BUILD_ID && setFresh(true))
        .catch(() => {}); // offline or mid-deploy: try again next time
    };
    const timer = setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  if (!fresh) return null;
  // fade into the intro's black, then reload: the new version opens with the intro
  const reload = () => {
    try {
      sessionStorage.removeItem("intro");
    } catch {}
    document.documentElement.dataset.outro = "";
    setTimeout(() => location.reload(), INTRO_OUT_MS);
  };
  return (
    // solid backing like the other floating cards: over the page, see-through glass let the text below read through
    <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto w-fit rise rounded-full bg-bg shadow-2xl">
      <div className="flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 glass-deep">
        <span className="text-label whitespace-nowrap">Lateshow got an update.</span>
        <button type="button" onClick={reload} className={buttonStyles("primary", "sm")}>
          Reload
        </button>
      </div>
    </div>
  );
}
