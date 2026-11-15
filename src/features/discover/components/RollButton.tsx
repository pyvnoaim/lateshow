"use client";

import { Shuffle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type MouseEvent } from "react";
import { buttonStyles } from "@/components/ui/button";

/**
 * "Give me 3" / "Three more": a link (the roll lives in the URL) that carries `data-pending` while the next picks
 * load, so the row can let the old ones sink away (group-has-data-pending) before the new ones are dealt in.
 */
export function RollButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const go = (e: MouseEvent) => {
    // new tab, new window: let the browser do it
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    startTransition(() => router.push(href, { scroll: false }));
  };
  return (
    <Link
      href={href}
      scroll={false}
      onClick={go}
      data-pending={pending || undefined}
      className={buttonStyles("primary", "sm")}
    >
      <Shuffle size={16} strokeWidth={2} aria-hidden className={pending ? "shuffling" : undefined} />
      {label}
    </Link>
  );
}
