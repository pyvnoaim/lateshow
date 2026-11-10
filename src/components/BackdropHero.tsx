import { ViewTransition, type ReactNode } from "react";
import { img } from "@/lib/tmdb";
import { TmdbImage } from "./TmdbImage";
import { Container } from "./ui/Container";

/** Classes for the big title inside a hero, so Home and the title page set it the same way. */
export const heroTitle = "text-hero leading-display font-bold tracking-display max-sm:text-page";

/**
 * Full-bleed backdrop that runs under the top bar, content at the bottom.
 * `transitionName` lets a poster grow into this backdrop (View Transitions).
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
    <section className="relative flex min-h-hero flex-col justify-end overflow-hidden bg-raised max-sm:min-h-hero-sm">
      {transitionName ? (
        <ViewTransition name={transitionName} share="morph" default="none">
          {image}
        </ViewTransition>
      ) : (
        image
      )}
      <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/35 to-bg/60" />
      <Container className="relative flex rise flex-col gap-5 pt-bar pb-14">{children}</Container>
    </section>
  );
}

export function BackdropHeroSkeleton() {
  return <div className="min-h-hero sk max-sm:min-h-hero-sm" />;
}
