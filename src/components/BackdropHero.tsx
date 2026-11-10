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
      {src && <TmdbImage src={src} lowSrc={img(backdropPath, "w300")!} alt="" sizes="100vw" priority />}
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

export function BackdropHeroSkeleton() {
  return <div className="min-h-hero sk max-sm:min-h-hero-sm" />;
}
