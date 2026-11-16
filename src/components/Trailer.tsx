"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "./ui/button";

/** Trailer in a dialog. `pill` is the glass button, `primary` the white one, `text` a small grey link (under posters). */
export function Trailer({
  youtubeKey,
  title,
  variant = "pill",
  onOpenChange,
}: {
  youtubeKey: string;
  title: string;
  variant?: "pill" | "primary" | "text";
  /** told when the trailer opens and closes (the hero carousel holds still meanwhile) */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpenState] = useState(false);
  const setOpen = (o: boolean) => {
    setOpenState(o);
    onOpenChange?.(o);
  };
  const close = useRef<HTMLButtonElement>(null);

  // Clicking into the YouTube player moves keyboard focus into its frame, and the page never sees Esc again.
  // Take focus back right after (the click itself still reaches YouTube), so Esc keeps closing the dialog.
  useEffect(() => {
    if (!open) return;
    const reclaim = () =>
      setTimeout(() => {
        if (document.activeElement?.tagName === "IFRAME") close.current?.focus({ preventScroll: true });
      }, 0);
    window.addEventListener("blur", reclaim);
    return () => window.removeEventListener("blur", reclaim);
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        aria-label={variant === "text" ? `Play the ${title} trailer` : undefined}
        className={
          variant === "text"
            ? "inline-flex items-center gap-1 text-caption text-muted transition-colors hover:text-fg"
            : buttonStyles(variant === "primary" ? "primary" : "glass")
        }
      >
        <Play size={variant === "text" ? 11 : 18} strokeWidth={variant === "text" ? 2.25 : 1.75} aria-hidden />
        Trailer
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-md" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-trailer -translate-y-1/2">
          <Dialog.Title className="sr-only">{title} trailer</Dialog.Title>
          <Dialog.Description className="sr-only">Plays the official trailer from YouTube.</Dialog.Description>
          <div className="aspect-video overflow-hidden rounded-banner bg-surface">
            <iframe
              className="size-full"
              src={`https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1&rel=0`}
              title={`${title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            />
          </div>
          <Dialog.Close
            ref={close}
            aria-label="Close trailer"
            data-tip="Close"
            data-tip-meta="Esc"
            className={buttonStyles("glass", "icon", "absolute -top-14 right-0")}
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
