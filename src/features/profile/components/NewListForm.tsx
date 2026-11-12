"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { buttonStyles } from "@/components/ui/button";
import { fieldInputStyles, fieldStyles } from "@/components/ui/field";

/** "New list" on your Lists tab: names it, then opens it. */
export function NewListForm({ create }: { create: (name: string) => Promise<string> }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => router.push(`/l/${await create(name.trim())}`));
  };
  return (
    <form onSubmit={submit} className={`${fieldStyles("lg")} w-full max-w-form`}>
      <label htmlFor="new-list" className="sr-only">
        New list
      </label>
      <input
        id="new-list"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        placeholder="Name a new list"
        className={fieldInputStyles}
      />
      <button type="submit" disabled={pending || !name.trim()} className={buttonStyles("primary", "sm")}>
        New list
      </button>
    </form>
  );
}
