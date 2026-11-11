"use client";

import { useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

/**
 * One glass pill for a text setting (name, username): the field, an optional grey prefix, and Save that turns
 * into "Saved". `save` returns the value as stored (cleaned, like a lowercase username) or what went wrong.
 */
export function TextSetting({
  id,
  label,
  initial,
  save,
  prefix,
  placeholder,
  maxLength,
  autoComplete = "off",
}: {
  id: string;
  label: string;
  initial: string;
  save: (value: string) => Promise<{ value: string } | { error: string }>;
  prefix?: string;
  placeholder?: string;
  maxLength: number;
  autoComplete?: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const changed = value.trim() !== saved;

  function submit(e: FormEvent) {
    e.preventDefault();
    const next = value.trim();
    startTransition(async () => {
      const result = await save(next).catch(() => ({ error: "That didn't save. Try again." }));
      if ("error" in result) return setError(result.error);
      setError("");
      setSaved(result.value);
      setValue(result.value);
    });
  }

  return (
    <div className="flex max-w-form flex-col gap-3">
      <form onSubmit={submit} className={fieldStyles("lg")}>
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        {prefix && (
          <span aria-hidden className="-mr-3 text-label text-muted">
            {prefix}
          </span>
        )}
        <input
          id={id}
          maxLength={maxLength}
          autoComplete={autoComplete}
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError("");
          }}
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
