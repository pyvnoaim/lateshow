import { getNewOnStreaming } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";

export async function NewOnStreaming() {
  const cards = await getNewOnStreaming().catch(() => []);
  return (
    <PosterSection
      title="New on streaming"
      description="Recent releases on a subscription in Germany."
      cards={cards}
      max={12}
    />
  );
}
