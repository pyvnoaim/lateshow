import Image from "next/image";
import { getTrending, img } from "@/lib/tmdb";

const SPEEDS = ["70s", "95s", "80s", "105s"];
const PER_COLUMN = 8;

/** Slowly drifting columns of trending posters next to the sign in form. Plain blocks if TMDB isn't reachable. */
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
    <div aria-hidden className="relative hidden overflow-hidden lg:block">
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
      <div className="absolute inset-0 bg-linear-to-r from-bg via-bg/60 to-bg/30" />
      <div className="absolute inset-0 bg-linear-to-b from-bg via-bg/0 to-bg" />
    </div>
  );
}
