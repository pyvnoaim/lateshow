import { Suspense } from "react";
import { PosterGridSkeleton, PosterLink } from "@/components/PosterLink";
import { getTrending } from "@/lib/tmdb";

// ponytail: step 1 home is just trending, enough to reach title pages. Full home (continue watching, leaving soon) comes with layer 2.
export default function Home() {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pt-[120px] sm:px-12">
      <h1 className="text-section font-bold">Trending this week</h1>
      <Suspense fallback={<PosterGridSkeleton />}>
        <Trending />
      </Suspense>
    </main>
  );
}

async function Trending() {
  const cards = await getTrending();
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-7">
      {cards.map((c, i) => (
        <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
      ))}
    </div>
  );
}
