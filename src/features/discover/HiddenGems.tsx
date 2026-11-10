import { getHiddenGems } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";

export async function HiddenGems() {
  const cards = await getHiddenGems().catch(() => []);
  return (
    <PosterSection
      title="Hidden gems"
      description="Loved by the few who found them. New ones every day."
      cards={cards}
    />
  );
}
