import { Suspense } from "react";
import { BackdropHeroSkeleton } from "@/components/BackdropHero";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { Decide } from "@/features/discover/Decide";
import { HomeHero } from "@/features/discover/HomeHero";
import { Trending } from "@/features/discover/Trending";
import { Upcoming } from "@/features/discover/Upcoming";

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Suspense fallback={<BackdropHeroSkeleton />}>
        <HomeHero />
      </Suspense>
      <Container as="main" className="flex flex-col gap-section pt-section">
        <Suspense fallback={<div className="h-24 sk rounded-banner" />}>
          <Decide searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<PosterGridSkeleton />}>
          <Trending searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<PosterGridSkeleton count={6} />}>
          <Upcoming />
        </Suspense>
      </Container>
    </>
  );
}
