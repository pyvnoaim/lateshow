import Image from "next/image";
import { getLanguage } from "@/lib/region";
import { getTrending, img } from "@/lib/tmdb";

const SPEEDS = ["70s", "95s", "80s", "105s"];
const PER_COLUMN = 8;

/**
 * Sign in backdrop: slowly drifting, tilted columns of trending posters. The right half on desktop, a blurred wash
 * behind everything on narrower screens. Plain blocks if TMDB isn't reachable.
 */
export async function PosterWall() {
  // Two pages of trending: 40 posters for 32 slots, so no title shows twice on the wall.
  const lang = await getLanguage();
  const pages = await Promise.all([1, 2].map((page) => getTrending("all", page, lang).catch(() => [])));
  const posters = [...new Set(pages.flat().map((c) => img(c.poster_path, "w342")))].filter(
    (p): p is string => p !== null,
  );

  const columns = SPEEDS.map((speed, ci) => {
    // each column gets its own run of posters (wrapping only if TMDB returned fewer than 32)
    const own = Array.from(
      { length: PER_COLUMN },
      (_, i) => posters.at((ci * PER_COLUMN + i) % Math.max(posters.length, 1)) ?? null,
    );
    return { speed, posters: [...own, ...own] };
  });

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden lg:left-1/2">
      <div className="absolute inset-0 grid scale-125 -rotate-6 grid-cols-4 gap-4 px-4">
        {columns.map((col, ci) => (
          <div key={ci} className="flex drift flex-col gap-4" style={{ animationDuration: col.speed }}>
            {col.posters.map((src, i) => (
              <div
                key={i}
                className="relative aspect-poster overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline"
              >
                {src && <Image src={src} alt="" fill sizes="200px" className="object-cover" />}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* desktop: the wall is the right half, fading in from black so there is no edge. Narrower: blurred and dimmed behind the text */}
      <div className="absolute inset-0 bg-bg/75 backdrop-blur-md lg:bg-transparent lg:bg-linear-to-r lg:from-bg lg:via-bg/50 lg:to-bg/10 lg:backdrop-blur-none" />
      <div className="absolute inset-0 bg-linear-to-b from-bg/70 via-bg/0 to-bg/90" />
    </div>
  );
}
