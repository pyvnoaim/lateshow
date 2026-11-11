"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

/** "Have a code?" One pill: the 4 letters and Join. */
export function JoinByCode() {
  const [code, setCode] = useState("");
  const router = useRouter();
  const clean = code.trim().toUpperCase();
  function submit(e: FormEvent) {
    e.preventDefault();
    if (/^[A-Z0-9]{4}$/.test(clean)) router.push(`/rooms/${clean}`);
  }
  return (
    <form onSubmit={submit} className={`${fieldStyles("lg")} w-full max-w-form sm:w-96`}>
      <label htmlFor="room-code" className="sr-only">
        Room code
      </label>
      <input
        id="room-code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        maxLength={4}
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        placeholder="Have a code? K3X9"
        className={`${fieldInputStyles} uppercase placeholder:normal-case`}
      />
      <button type="submit" disabled={clean.length !== 4} className={buttonStyles("primary", "sm")}>
        Join
      </button>
    </form>
  );
}
