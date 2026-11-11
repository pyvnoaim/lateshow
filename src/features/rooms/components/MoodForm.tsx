"use client";

import { useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { MOOD_IDEAS } from "@/lib/rooms/mood";

/** Your mood: type one or tap an idea. Adding again replaces yours. */
export function MoodForm({
  code,
  current,
  add,
}: {
  code: string;
  current: string | null;
  add: (code: string, mood: string) => Promise<string | null>;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const send = (mood: string) =>
    startTransition(async () => {
      const problem = await add(code, mood);
      setError(problem ?? "");
      if (!problem) setText("");
    });
  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) send(text);
  }
  return (
    <div className="flex max-w-form flex-col gap-4">
      <form onSubmit={submit} className={fieldStyles("lg")}>
        <label htmlFor="mood" className="sr-only">
          Your mood
        </label>
        <input
          id="mood"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={40}
          autoComplete="off"
          placeholder={current ? `Yours: ${current}` : "Mind-bending, cozy, under 100 min"}
          className={fieldInputStyles}
        />
        <button type="submit" disabled={pending || !text.trim()} className={buttonStyles("primary", "sm")}>
          {current ? "Change" : "Add"}
        </button>
      </form>
      <div className="flex flex-wrap gap-x-5 gap-y-1 pl-5">
        {MOOD_IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            disabled={pending}
            onClick={() => send(idea)}
            className={buttonStyles("text", "text", "h-9 text-small")}
          >
            {idea}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="pl-5 text-caption text-muted">
          {error}
        </p>
      )}
    </div>
  );
}

export function SpinButton({
  code,
  spin,
  label,
  tone = "primary",
}: {
  code: string;
  spin: (code: string) => Promise<void>;
  label: string;
  tone?: "primary" | "glass";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => spin(code))}
      className={buttonStyles(tone, "md")}
    >
      {pending ? "Spinning" : label}
    </button>
  );
}
