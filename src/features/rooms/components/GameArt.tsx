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
  // a slot reel: e above, a in the glass band, b below. Five ticks later the copy of a sits in the band, so it loops.
  const reel = [e, a, b, c, d, e, a, b];
  return (
    <span className="relative block h-full overflow-hidden">
      <span aria-hidden className="absolute top-1/2 left-1/2 h-36 w-28 -translate-1/2 rounded-thumb glass-cell" />
      <span className="absolute inset-0 reel-fade">
        {/* the second poster (a) starts centred: half a poster up from the middle, plus one step for e above it */}
        <span className="absolute top-1/2 left-1/2 -mt-48 -translate-x-1/2">
          <span className="flex reel-tick flex-col gap-3">
            {reel.map((src, i) => (
              <P key={i} src={src} className="relative w-20" />
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}
