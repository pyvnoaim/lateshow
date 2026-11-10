import type { ReactNode } from "react";
import { PosterLink } from "@/components/PosterLink";
import { PosterGrid } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import type { Card, Service } from "@/lib/tmdb";

/**
 * A titled poster row. Shows full rows of 6 (6 or 12) when there's enough, everything otherwise.
 * Nothing at all when empty, so a section never shows up blank.
 */
export function PosterSection({
  title,
  description,
  aside,
  cards,
  max = 6,
  caption,
  service,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
  cards: Card[];
  max?: 6 | 12;
  caption?: (card: Card) => string | undefined;
  service?: (card: Card) => Service | undefined;
}) {
  const fullRows = Math.floor(Math.min(cards.length, max) / 6) * 6;
  const shown = cards.slice(0, fullRows || Math.min(cards.length, max));
  if (shown.length === 0) return null;
  return (
    <Section title={title} description={description} aside={aside}>
      <PosterGrid>
        {shown.map((c, i) => (
          <PosterLink
            key={`${c.media_type}-${c.id}`}
            card={c}
            index={i}
            morph={false}
            caption={caption?.(c)}
            service={service?.(c)}
          />
        ))}
      </PosterGrid>
    </Section>
  );
}
