"use client";

import { useState, useTransition } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";
import { setUsername } from "@/lib/settings/actions";

/**
 * Pick your username right where it's needed (after sign in, inviting a friend, rooms), instead of a trip to
 * Settings. Same rules and checks as Settings. Saving refreshes the page, so whatever waited on the name shows up.
 */
export function UsernameForm({
  button = "Save",
  onSaved,
  refreshPage = true,
}: {
  button?: string;
  onSaved?: (name: string) => void;
  /** false on the sign in screen: refreshing there redirects past the passkey step */
  refreshPage?: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await setUsername(value, refreshPage);
          if ("error" in result) setError(result.error);
          else {
            setError("");
            onSaved?.(result.value);
          }
        });
      }}
      className="flex w-full max-w-form flex-col gap-2"
    >
      <div className={fieldStyles("lg")}>
        <span aria-hidden className="text-label">
          @
        </span>
        <label htmlFor="username-pick" className="sr-only">
          Username
        </label>
        <input
          id="username-pick"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          placeholder="yourname"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className={fieldInputStyles}
        />
        <button type="submit" disabled={pending || !value.trim()} className={buttonStyles("primary", "sm")}>
          {button}
        </button>
      </div>
      <p role={error ? "alert" : undefined} className={`pl-5 text-caption ${error ? "text-danger" : "text-muted"}`}>
        {error || "3 to 20 letters, numbers or _. You can change it later."}
      </p>
    </form>
  );
}
