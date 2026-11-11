"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps a room page current: listens to the room's server-sent events and refreshes when it changes.
 * `every` also refreshes on a timer (the lobby's QR token lasts 2 minutes).
 */
export function LiveRoom({ code, every }: { code: string; every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const events = new EventSource(`/api/rooms/${code}/events`);
    events.onmessage = () => router.refresh();
    events.addEventListener("gone", () => router.refresh());
    const timer = every ? setInterval(() => router.refresh(), every) : undefined;
    return () => {
      events.close();
      clearInterval(timer);
    };
  }, [code, every, router]);
  return null;
}
