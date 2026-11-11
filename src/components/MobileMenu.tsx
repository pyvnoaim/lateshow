"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buttonStyles } from "./ui/button";

const PAGES = [
  { href: "/", label: "Home" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/rooms", label: "Rooms" },
  { href: "/cinemas", label: "Coming to cinemas" },
];
const YOU = [
  { href: "/u/me", label: "Profile" },
  { href: "/settings", label: "Settings" },
];

/** Phones only: the top bar links don't fit, so a menu button opens them in a glass sheet below the bar. */
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const tab = useSearchParams().get("tab");
  const current = path === "/u/me" && tab === "watchlist" ? "/watchlist" : path;
  const isOn = (href: string) => (href === "/" ? current === "/" : current.startsWith(href));

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger aria-label="Menu" data-tip="Menu" className={buttonStyles("ghost", "icon", "sm:hidden")}>
        <Menu size={20} strokeWidth={1.75} aria-hidden />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 sheet-fade bg-bg/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-x-3 top-3 z-50 sheet-in rounded-banner p-3 glass focus:outline-none">
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Pages of Lateshow</Dialog.Description>
          <div className="flex items-center justify-between pb-2 pl-4">
            <span className="text-logo font-bold tracking-tight">Lateshow</span>
            <Dialog.Close aria-label="Close menu" className={buttonStyles("ghost", "icon")}>
              <X size={20} strokeWidth={1.75} aria-hidden />
            </Dialog.Close>
          </div>
          <nav aria-label="Main" className="flex flex-col">
            {[...PAGES, ...(signedIn ? YOU : [{ href: "/login", label: "Sign in" }])].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isOn(l.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex h-14 items-center rounded-thumb px-4 text-section font-bold tracking-tight transition-colors ${
                  isOn(l.href) ? "text-fg" : "text-muted hover:text-fg"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
