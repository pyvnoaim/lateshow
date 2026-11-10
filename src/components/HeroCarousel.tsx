"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HeroLogo, HeroShell, heroTitle } from "./HeroShell";
import { LibraryToggle } from "./library/LibraryToggle";
import { Trailer } from "./Trailer";
import { buttonStyles } from "./ui/button";

export type HeroSlide = {
  key: string;
  href: string;
  name: string;
  logo: { src: string; aspectRatio: number } | null;
  backdrop: string;
  meta: string;
  rating: number;
  overview?: string;
  trailerKey?: string;
  watchlist: { signedIn: boolean; initial: boolean; toggle: (on: boolean) => Promise<void> };
};

/**
 * Rotating hero: a new title every --duration-slide with a crossfade. Pauses while you hover it,
 * never rotates for people who turned off motion. The dashes jump to a slide.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[index];

  // The active dash's fill animation is the clock: when it ends, the next slide comes. Pausing pauses the
  // animation, so bar and slide can never drift apart. Reduced motion turns animations off, so nothing rotates.
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <HeroShell
        media={slides.map((s, i) => (
          <div
            key={s.key}
            aria-hidden={i !== index}
            className={`absolute inset-0 transition-opacity duration-900 ease-out ${i === index ? "opacity-100" : "opacity-0"}`}
          >
            <Image src={s.backdrop} alt="" fill sizes="100vw" priority={i === 0} className="object-cover" />
          </div>
        ))}
        footer={
          slides.length > 1 && (
            <div className="hidden shrink-0 gap-1.5 pb-4 sm:flex">
              {slides.map((s, i) => (
                <button
                  key={s.key}
                  type="button"
                  aria-label={`Show ${s.name}`}
                  aria-current={i === index}
                  onClick={() => setIndex(i)}
                  className="group flex h-6 items-center"
                >
                  <span className="relative h-0.75 w-8 overflow-hidden rounded-full bg-fg/25 transition-colors group-hover:bg-fg/40">
                    {i === index && (
                      <span
                        key={`${s.key}-${index}`}
                        onAnimationEnd={next}
                        className={`absolute inset-0 fill-bar rounded-full bg-fg ${paused ? "paused" : ""}`}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          )
        }
      >
        <div key={slide.key} className="flex rise flex-col gap-5">
          {slide.logo ? (
            <HeroLogo src={slide.logo.src} aspectRatio={slide.logo.aspectRatio} name={slide.name} />
          ) : (
            <h1 className={heroTitle}>{slide.name}</h1>
          )}
          <div className="flex flex-wrap items-center gap-x-2 text-label text-fg/80 nums">
            <span>{slide.meta}</span>
            {slide.rating > 0 && (
              <span className="inline-flex items-center gap-1">
                · <Star size={13} strokeWidth={2} aria-hidden /> {slide.rating.toFixed(1)}
              </span>
            )}
          </div>
          {slide.overview && (
            <p className="line-clamp-2 max-w-search text-body leading-normal text-fg/80">{slide.overview}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {slide.trailerKey && <Trailer youtubeKey={slide.trailerKey} title={slide.name} variant="primary" />}
            <Link href={slide.href} className={buttonStyles("glass")}>
              Details
            </Link>
            <LibraryToggle
              kind="watchlist"
              signedIn={slide.watchlist.signedIn}
              initial={slide.watchlist.initial}
              toggle={slide.watchlist.toggle}
            />
          </div>
        </div>
      </HeroShell>
    </div>
  );
}
