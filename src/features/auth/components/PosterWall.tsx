import Image from "next/image";
import { getTrending, img } from "@/lib/tmdb";

const SPEEDS = ["70s", "95s", "80s", "105s", "88s", "100s", "76s", "92s"];
const PER_COLUMN = 8;

/**
 * Full-page backdrop for sign in: slowly drifting columns of trending posters, tilted, darkened toward the form so the
 * text stays readable and the glass picks up their colors. Plain blocks if TMDB isn't reachable.
 */
export async function PosterWall() {
  const posters = await getTrending()
    .then((cards) => cards.map((c) => img(c.poster_path, "w342")).filter((p): p is string => p !== null))
    .catch(() => []);

  const columns = SPEEDS.map((speed, ci) => {
    const own = Array.from(
      { length: PER_COLUMN },
      (_, i) => posters.at((ci * 5 + i) % Math.max(posters.length, 1)) ?? null,
    );
    return { speed, posters: [...own, ...own] };
  });

  return (
    <div aria-hidden className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 grid scale-125 -rotate-6 grid-cols-4 gap-4 px-4 lg:grid-cols-8">
        {columns.map((col, ci) => (
          <div
            key={ci}
            className={`flex drift flex-col gap-4 ${ci >= 4 ? "max-lg:hidden" : ""}`}
            style={{ animationDuration: col.speed }}
          >
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
      {/* dark on the form side, posters come through on the right; narrower screens get them blurred and dimmed behind the text */}
      <div className="absolute inset-0 bg-bg/75 backdrop-blur-md lg:bg-transparent lg:bg-linear-to-r lg:from-bg lg:via-bg/80 lg:to-bg/15 lg:backdrop-blur-none" />
      <div className="absolute inset-0 bg-linear-to-b from-bg/70 via-bg/0 to-bg/90" />
    </div>
  );
}
