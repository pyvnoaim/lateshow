"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SKELETON_COOKIE } from "./devFlags";

const read = () => document.cookie.split("; ").includes(`${SKELETON_COOKIE}=1`);

/** Dev only (never rendered in production): pins every loading skeleton on, to look at them. */
export function DevSkeletonToggle() {
  const router = useRouter();
  const on = useSyncExternalStore(
    () => () => {},
    read,
    () => false,
  );
  return (
    <button
      type="button"
      aria-pressed={on}
      data-tip={on ? "Showing loading skeletons" : "Show loading skeletons"}
      data-tip-meta="Dev only"
      onClick={() => {
        document.cookie = `${SKELETON_COOKIE}=${on ? "0" : "1"}; path=/; max-age=86400; samesite=lax`;
        router.refresh();
      }}
      className={`inline-flex h-8 press items-center gap-1.5 rounded-full px-3 text-caption font-semibold ${on ? "glass-accent" : "glass"}`}
    >
      Skeletons {on ? "on" : "off"}
    </button>
  );
}
