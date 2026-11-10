import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { getTrending } from "@/lib/tmdb";

export async function Trending() {
  const cards = await getTrending();
  return (
    <PosterGrid>
      {cards.map((c, i) => (
        <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
      ))}
    </PosterGrid>
  );
}
