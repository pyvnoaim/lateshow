"use client";

import { ArrowUpRight, Shuffle } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { buttonStyles } from "@/components/ui/button";

export type Pickable = { key: string; title: string; meta: string; poster: string | null; on: string; url?: string };

/** "Pick one for me": a random title you can stream tonight, in a glass card with Watch on and Another. */
export function PickOne({ items }: { items: Pickable[] }) {
  const [pick, setPick] = useState<Pickable | null>(null);
  const roll = () => {
    const pool = items.filter((i) => i.key !== pick?.key);
    if (pool.length > 0) setPick(pool[Math.floor(Math.random() * pool.length)]);
  };
  if (items.length === 0) return null;
  return (
    <>
      <button type="button" onClick={roll} className={buttonStyles("primary", "md")}>
        <Shuffle size={18} strokeWidth={2} aria-hidden />
        Pick one for me
      </button>
      {pick && (
        <div className="order-last flex basis-full pop flex-wrap items-center gap-6 rounded-banner p-5 glass">
          <span className="relative aspect-poster w-24 shrink-0 overflow-hidden rounded-poster bg-raised">
            {pick.poster && <Image src={pick.poster} alt="" fill sizes="96px" className="object-cover" />}
          </span>
          <span className="flex min-w-48 flex-1 flex-col gap-1.5">
            <span className="text-small text-muted">Tonight from your list</span>
            <span className="text-section leading-none font-bold">{pick.title}</span>
            <span className="text-small text-muted">
              {pick.meta} · on {pick.on}
            </span>
          </span>
          <span className="flex items-center gap-3">
            {pick.url && (
              <a href={pick.url} target="_blank" rel="noopener noreferrer" className={buttonStyles("primary", "md")}>
                Watch on {pick.on}
                <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
              </a>
            )}
            <button type="button" onClick={roll} className={buttonStyles("glass", "md")}>
              Another
            </button>
          </span>
        </div>
      )}
    </>
  );
}
