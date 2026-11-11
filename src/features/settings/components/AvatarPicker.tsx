"use client";

import Image from "next/image";
import { useOptimistic, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { photoUrl, TONES } from "@/lib/avatar";

type Face = { id: number; name: string; character: string; path: string; title: string };

/** Settings · Profile picture: your initial on a glass tone, or a face from something you watched. */
export function AvatarPicker({
  name,
  current,
  faces,
  save,
}: {
  name: string;
  current: string | null;
  faces: Face[];
  save: (value: string) => Promise<void>;
}) {
  const [shown, setShown] = useOptimistic(current ?? "");
  const [, startTransition] = useTransition();
  const pick = (v: string) =>
    startTransition(async () => {
      setShown(v);
      await save(v);
    });
  const ring = (on: boolean) => (on ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : "");
  const isTone = shown === "" || shown.startsWith("c:");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center gap-5">
        <Avatar name={name} image={shown} size="lg" />
        <p className="text-body text-muted">Everyone sees this next to your name.</p>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label font-medium">Color</span>
        <div className="flex flex-wrap gap-3">
          {TONES.map((t) => {
            const v = t === "icy" ? "" : `c:${t}`;
            return (
              <button
                key={t}
                type="button"
                aria-label={t}
                aria-pressed={isTone && shown === v}
                data-tip={t.charAt(0).toUpperCase() + t.slice(1)}
                onClick={() => pick(v)}
                className={`press rounded-full ${ring(isTone && shown === v)}`}
              >
                <Avatar name={name} image={v || "c:icy"} size="md" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-label font-medium">A face from something you watched</span>
        {faces.length === 0 ? (
          <p className="text-body text-muted">Mark a few titles as watched and their cast shows up here.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {faces.map((f) => {
              const v = `p:${f.path}`;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-label={`${f.name} in ${f.title}`}
                  aria-pressed={shown === v}
                  data-tip={f.name}
                  data-tip-meta={f.character ? `${f.character} · ${f.title}` : f.title}
                  onClick={() => pick(v)}
                  className={`relative size-12 press overflow-hidden rounded-full glass-cell ${ring(shown === v)}`}
                >
                  <Image src={photoUrl(f.path)} alt="" fill sizes="48px" className="object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
