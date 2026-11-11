"use client";

import { useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

/** One glass pill: your name and a Save button that confirms with "Saved". */
export function NameForm({ initial, save }: { initial: string; save: (name: string) => Promise<void> }) {
  const [name, setName] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== saved;

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = name.trim();
    startTransition(async () => {
      try {
        await save(next);
        setSaved(next);
        setError("");
      } catch {
        setError("That didn't save. Use 1 to 40 characters.");
      }
    });
  }

  return (
    <div className="flex max-w-form flex-col gap-3">
      <form onSubmit={submit} className={fieldStyles("lg")}>
        <label htmlFor="name" className="sr-only">
          Name
        </label>
        <input
          id="name"
          required
          maxLength={40}
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={fieldInputStyles}
        />
        <button type="submit" disabled={pending || !changed} className={buttonStyles("primary", "sm")}>
          {pending ? "Saving" : changed ? "Save" : "Saved"}
        </button>
      </form>
      {error && (
        <p role="alert" className="pl-5 text-caption">
          {error}
        </p>
      )}
    </div>
  );
}
