import Image from "next/image";
import type { Game } from "@/lib/rooms/games";

// no position here: the swipe stack makes them absolute, the rest pass relative (next/image fill needs one)
const poster = "aspect-poster shrink-0 overflow-hidden rounded-poster bg-raised shadow-xl";

function P({ src, className = "" }: { src?: string; className?: string }) {
  return (
    <span className={`${poster} ${className}`}>
      {src && <Image src={src} alt="" fill sizes="112px" className="object-cover" />}
    </span>
  );
}

/** A tiny picture of each game, made of real posters: a fanned stack, two face to face, a rolling column. */
export function GameArt({ game, posters }: { game: Game; posters: string[] }) {
  const [a, b, c, d, e] = posters;
  if (game === "swipe") {
    // the stack fans out a little more when you point at the tile
    return (
      <span className="relative flex h-full items-center justify-center">
        <P
          src={c}
          className="absolute w-24 -translate-x-10 -rotate-12 transition-transform duration-300 group-hover:-translate-x-14"
        />
        <P
          src={b}
          className="absolute w-24 translate-x-10 rotate-12 transition-transform duration-300 group-hover:translate-x-14"
        />
        <P
          src={a}
          className="absolute w-28 -translate-y-1 transition-transform duration-300 group-hover:-translate-y-3"
        />
      </span>
    );
  }
  if (game === "bracket") {
    return (
      <span className="flex h-full flex-col items-center justify-center gap-4">
        <span className="flex items-center gap-4">
          <P src={d} className="relative w-24 transition-transform duration-300 group-hover:-rotate-3" />
          <span className="text-label font-semibold text-muted">or</span>
          <P src={e} className="relative w-24 transition-transform duration-300 group-hover:rotate-3" />
        </span>
        <span aria-hidden className="flex gap-1.5">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`size-1.5 rounded-full ${i < 3 ? "bg-fg" : "bg-fg/25"}`} />
          ))}
        </span>
      </span>
    );
  }
  return (
    <span className="relative flex h-full items-center justify-center">
      <span aria-hidden className="absolute top-1/2 left-1/2 h-36 w-28 -translate-1/2 rounded-thumb glass-cell" />
      <span className="flex flex-col items-center gap-3 reel-fade transition-transform duration-500 group-hover:-translate-y-6">
        <P src={b} className="relative w-20 opacity-60" />
        <P src={c} className="relative w-20" />
        <P src={a} className="relative w-20 opacity-60" />
      </span>
    </span>
  );
}
