"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";

export function Trailer({ youtubeKey, title }: { youtubeKey: string; title: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className={buttonStyles("glass")}>
        <Play size={18} strokeWidth={1.75} aria-hidden /> Trailer
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
          <Dialog.Close aria-label="Close trailer" className={buttonStyles("iconRaised", "absolute -top-14 right-0")}>
            <X size={20} strokeWidth={1.75} aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
