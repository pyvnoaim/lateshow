import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { getTrending } from "@/lib/tmdb";

/** One row of trending posters, for pages that would otherwise be a dead end (404). Nothing if TMDB is down. */
export async function TrendingRow({ title }: { title: string }) {
  const cards = await getTrending().catch(() => []);
  if (cards.length === 0) return null;
  return (
    <Section title={title}>
      <PosterGrid>
        {cards.slice(0, 6).map((c, i) => (
          <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
        ))}
      </PosterGrid>
    </Section>
  );
}
