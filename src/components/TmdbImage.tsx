"use client";

import Image from "next/image";
import { useState } from "react";

// Space is always reserved by the parent (fill). A tiny blurred copy shows first, the sharp one fades in over it.
// `preload` (the one hero image) and `eager` (the first row on screen) skip the fade: it starts only after hydration
// and held the main picture back by about 0.7 s (measured in Helium).
export function TmdbImage({
  src,
  lowSrc,
  alt,
  sizes,
  preload,
  eager,
}: {
  src: string;
  lowSrc: string;
  alt: string;
  sizes: string;
  preload?: boolean;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const now = preload || eager;
  return (
    <>
      {/* through our image server too, so no visitor's browser ever talks to TMDB (see the privacy page) */}
      <Image src={lowSrc} alt="" aria-hidden fill sizes="64px" className="scale-110 object-cover blur-xl" />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        loading={eager ? "eager" : undefined}
        fetchPriority={eager ? "high" : undefined}
        onLoad={now ? undefined : () => setLoaded(true)}
        className={
          now
            ? "object-cover"
            : `object-cover transition-opacity duration-600 ease-out ${loaded ? "opacity-100" : "opacity-0"}`
        }
      />
    </>
  );
}
