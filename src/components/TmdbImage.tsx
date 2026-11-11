"use client";

import Image from "next/image";
import { useState } from "react";

// Space is always reserved by the parent (fill). A tiny blurred copy shows first, the sharp one fades in over it.
export function TmdbImage({
  src,
  lowSrc,
  alt,
  sizes,
  priority,
}: {
  src: string;
  lowSrc: string;
  alt: string;
  sizes: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <>
      {/* through our image server too, so no visitor's browser ever talks to TMDB (see the privacy page) */}
      <Image src={lowSrc} alt="" aria-hidden fill sizes="64px" className="scale-110 object-cover blur-xl" />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={`object-cover transition-opacity duration-600 ease-out ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </>
  );
}
