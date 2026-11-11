import { ViewTransition, type ReactNode } from "react";
import { img } from "@/lib/tmdb";
import { HeroShell } from "./HeroShell";
import { TmdbImage } from "./TmdbImage";

export { heroTitle } from "./HeroShell";

/**
 * A hero with one backdrop. `transitionName` lets a poster grow into this backdrop (View Transitions).
 */
export function BackdropHero({
  backdropPath,
  transitionName,
  children,
}: {
  backdropPath: string | null | undefined;
  transitionName?: string;
  children: ReactNode;
}) {
  const src = img(backdropPath, "original");
  const image = (
    <div className="absolute inset-0">
      {src && <TmdbImage src={src} lowSrc={img(backdropPath, "w300")!} alt="" sizes="100vw" preload />}
    </div>
  );
  return (
    <HeroShell
      media={
        transitionName ? (
          <ViewTransition name={transitionName} share="morph" default="none">
            {image}
          </ViewTransition>
        ) : (
          image
        )
      }
    >
      <div className="flex rise flex-col gap-5">{children}</div>
    </HeroShell>
  );
}

/** Placeholder in the hero's shape: dark backdrop, then bars where the title, meta line and buttons will be. */
export function BackdropHeroSkeleton() {
  return (
    <HeroShell media={<div className="absolute inset-0 bg-surface" />}>
      <div aria-hidden className="flex flex-col gap-5">
        <div className="h-20 w-96 max-w-full sk rounded-banner max-sm:h-14" />
        <div className="h-4 w-64 sk rounded-full" />
        <div className="h-4 w-80 max-w-full sk rounded-full" />
        <div className="flex gap-3 pt-2">
          <div className="h-12 w-36 sk rounded-full" />
          <div className="h-12 w-28 sk rounded-full" />
          <div className="size-12 sk rounded-full" />
        </div>
      </div>
    </HeroShell>
  );
}
