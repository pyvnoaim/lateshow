import { getHiddenGems } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";
import { getRegion } from "@/lib/region";

export async function HiddenGems() {
  const { code } = await getRegion();
  const cards = await getHiddenGems(code).catch(() => []);
  return (
    <PosterSection
      title="Hidden gems"
      description="Loved by the few who found them. New ones every day."
      cards={cards}
    />
  );
}
