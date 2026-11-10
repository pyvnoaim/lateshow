import { getNewOnStreaming } from "@/lib/tmdb";
import { PosterSection } from "./PosterSection";
import { getRegion } from "@/lib/region";

export async function NewOnStreaming() {
  const { code, name } = await getRegion();
  const cards = await getNewOnStreaming(code).catch(() => []);
  return (
    <PosterSection
      title="New on streaming"
      description={`Recent releases on a subscription in ${name}.`}
      cards={cards}
      max={12}
    />
  );
}
