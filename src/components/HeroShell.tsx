import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "./ui/Container";

/** Layout of every hero: full-bleed media under the top bar, a fade to black, content at the bottom. */
export function HeroShell({ media, children, footer }: { media: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <section className="relative flex min-h-hero flex-col justify-end overflow-hidden bg-raised max-sm:min-h-hero-sm">
      {media}
      <div className="absolute inset-0 bg-linear-to-t from-bg via-bg/35 to-bg/60" />
      <Container className="relative flex items-end justify-between gap-8 pt-bar pb-14">
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
        {footer}
      </Container>
    </section>
  );
}

/** Classes for the big title inside a hero, so Home and the title page set it the same way. */
export const heroTitle = "text-hero leading-display font-bold tracking-display max-sm:text-page";

/** The title's official logo artwork as the hero heading. `src` is a ready image URL. */
export function HeroLogo({ src, aspectRatio, name }: { src: string; aspectRatio: number; name: string }) {
  return (
    <h1 className="m-0">
      <Image
        src={src}
        alt={name}
        width={Math.round(120 * aspectRatio)}
        height={120}
        preload
        className="h-auto max-h-28 w-auto max-w-md object-contain object-left drop-shadow-lg max-sm:max-h-20 max-sm:max-w-full"
      />
    </h1>
  );
}
