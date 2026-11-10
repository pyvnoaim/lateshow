"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Play, X } from "lucide-react";

export function Trailer({ youtubeKey, title }: { youtubeKey: string; title: string }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className="press flex h-12 items-center gap-2 rounded-full bg-fg/15 px-6 text-base font-semibold backdrop-blur-xl">
        <Play size={18} strokeWidth={1.75} aria-hidden /> Trailer
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-bg/80 backdrop-blur-md" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(1100px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2">
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
            aria-label="Close trailer"
            className="press absolute -top-14 right-0 flex size-11 items-center justify-center rounded-full bg-raised"
          >
            <X size={20} strokeWidth={1.75} aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
