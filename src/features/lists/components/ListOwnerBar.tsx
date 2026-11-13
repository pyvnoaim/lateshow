"use client";

import { useOptimistic, useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { useCopy } from "@/components/useCopy";
import type { Visibility } from "@/lib/lists/rules";

/** The owner's controls on a list: who sees it, Copy link (once it isn't private), Rename, Delete (asks first). */
export function ListOwnerBar({
  name,
  visibility,
  options,
  setVisibility,
  rename,
  remove,
}: {
  name: string;
  visibility: Visibility;
  options: { key: Visibility; label: string }[];
  setVisibility: (v: Visibility) => Promise<void>;
  rename: (name: string) => Promise<void>;
  remove: () => Promise<void>;
}) {
  const [shown, setShown] = useOptimistic(visibility);
  const [pending, startTransition] = useTransition();
  const { copied, copy } = useCopy();
  const [mode, setMode] = useState<"idle" | "rename" | "delete">("idle");
  const [draft, setDraft] = useState(name);

  const choose = (v: Visibility) =>
    startTransition(async () => {
      setShown(v);
      await setVisibility(v).catch(() => {});
    });
  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    startTransition(async () => {
      await rename(draft.trim())
        .then(() => setMode("idle"))
        .catch(() => {}); // stays open with the name, nothing is lost
    });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SegmentedTabs
          label="Who sees this list"
          items={options.map((o) => ({
            key: o.key,
            label: o.label,
            active: o.key === shown,
            onSelect: () => choose(o.key),
          }))}
        />
      </div>
      <p className="text-small text-muted">
        {shown === "private" && "Only you see this list."}
        {shown === "friends" && "Your friends can open it, signed in."}
        {shown === "link" && "Anyone with the link can open it, without an account."}
      </p>
      <div className="flex flex-wrap items-center gap-6">
        {shown !== "private" && (
          <button type="button" onClick={() => void copy(window.location.href)} className={buttonStyles("glass", "sm")}>
            {copied ? "Copied" : "Copy link"}
          </button>
        )}
        <button type="button" onClick={() => setMode("rename")} className={buttonStyles("text", "text")}>
          Rename
        </button>
        <button type="button" onClick={() => setMode("delete")} className={buttonStyles("text", "text")}>
          Delete
        </button>
      </div>
      {mode === "rename" && (
        <form onSubmit={save} className={`${fieldStyles()} max-w-form`}>
          <label htmlFor="list-name" className="sr-only">
            Name
          </label>
          <input
            id="list-name"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setMode("idle")}
            maxLength={60}
            autoFocus
            className={fieldInputStyles}
          />
          <button type="submit" disabled={pending || !draft.trim()} className={buttonStyles("primary", "sm")}>
            Save
          </button>
        </form>
      )}
      {mode === "delete" && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-small text-muted">Delete this list? The titles stay where they are.</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => remove())}
            className={buttonStyles("dangerConfirm", "sm")}
          >
            Delete list
          </button>
          <button type="button" onClick={() => setMode("idle")} className={buttonStyles("text", "text")}>
            Keep it
          </button>
        </div>
      )}
    </div>
  );
}
