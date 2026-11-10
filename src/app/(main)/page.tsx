import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { Section } from "@/components/ui/Section";
import { Trending } from "@/features/discover/Trending";

// ponytail: home is just trending for now, enough to reach title pages. The full home from the canvas needs the TMDB token.
export default function HomePage() {
  return (
    <Container as="main" className="pt-page-top">
      <Section title="Trending this week">
        <Suspense fallback={<PosterGridSkeleton />}>
          <Trending />
        </Suspense>
      </Section>
    </Container>
  );
}
