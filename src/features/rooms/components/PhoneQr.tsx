"use client";

import { useEffect, useState } from "react";

const RENEW_MS = 100_000; // codes last 2 minutes, a new one comes a little before

/**
 * "Continue on your phone": only on computer-sized screens, and only then does it ask for a sign-in code, so no
 * phone or hidden tab leaves codes lying around. Renews itself while the lobby is open.
 */
export function PhoneQr({ code, load }: { code: string; load: (code: string) => Promise<string | null> }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    if (!matchMedia("(min-width: 640px)").matches) return;
    let alive = true;
    const get = () => void load(code).then((s) => alive && setSvg(s));
    get();
    const timer = setInterval(get, RENEW_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [code, load]);
  if (!svg) return null;
  return (
    <div className="flex w-56 shrink-0 flex-col gap-3 pt-30">
      {/* uqr output: a plain SVG made on our server from our own URL */}
      <div
        role="img"
        aria-label="QR code to open this room on your phone"
        className="size-50 overflow-hidden rounded-banner bg-fg"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="flex flex-col gap-1.5 pt-1">
        <span className="text-body font-semibold">Continue on your phone</span>
        <span className="text-small leading-normal text-muted">
          Scan with the camera. You land in this room, already signed in.
        </span>
      </div>
    </div>
  );
}
