import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { searchTitles } from "@/lib/tmdb";

export async function SearchResults({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const raw = (await searchParams).q;
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? "";
  if (!q) return <p className="text-muted">Type a movie, series or person.</p>;

  const results = await searchTitles(q.slice(0, 100));
  if (!results.length) return <p className="text-muted">Nothing found for &ldquo;{q}&rdquo;.</p>;

  return (
    <>
      <h1 className="text-section font-bold">Results for &ldquo;{q}&rdquo;</h1>
      <PosterGrid>
        {results.map((c, i) => (
          <PosterLink key={`${c.media_type}-${c.id}`} card={c} index={i} />
        ))}
      </PosterGrid>
    </>
  );
}
