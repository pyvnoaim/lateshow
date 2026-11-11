import type { ReactNode } from "react";
import { Loading } from "@/components/Loading";
import { BackdropHeroSkeleton } from "@/components/BackdropHero";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { BecauseYouWatched } from "@/features/discover/BecauseYouWatched";
import { ContinueRow } from "@/features/discover/ContinueRow";
import { Decide } from "@/features/discover/Decide";
import { HiddenGems } from "@/features/discover/HiddenGems";
import { HomeHero } from "@/features/discover/HomeHero";
import { NewEpisodes } from "@/features/discover/NewEpisodes";
import { NewOnStreaming } from "@/features/discover/NewOnStreaming";
import { TopTen } from "@/features/discover/TopTen";
import { Trending } from "@/features/discover/Trending";
import { Upcoming } from "@/features/discover/Upcoming";
import { WatchlistStreaming } from "@/features/discover/WatchlistStreaming";

/** Every row loads on its own. Personal rows render nothing when you're signed out or have nothing there yet. */
const Row = ({ children, skeleton = false }: { children: ReactNode; skeleton?: boolean }) => (
  <Loading fallback={skeleton ? <PosterGridSkeleton count={6} heading /> : null}>{children}</Loading>
);

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <>
      <Loading fallback={<BackdropHeroSkeleton />}>
        <HomeHero />
      </Loading>
      <Container as="main" className="flex flex-col gap-section pt-section">
        <Row>
          <ContinueRow />
        </Row>
        <Row>
          <NewEpisodes />
        </Row>
        <Row>
          <Decide searchParams={searchParams} />
        </Row>
        <Row>
          <WatchlistStreaming />
        </Row>
        <Row skeleton>
          <TopTen />
        </Row>
        <Row skeleton>
          <Trending searchParams={searchParams} />
        </Row>
        <Row>
          <BecauseYouWatched />
        </Row>
        <Row skeleton>
          <NewOnStreaming />
        </Row>
        <Row skeleton>
          <Upcoming />
        </Row>
        <Row skeleton>
          <HiddenGems />
        </Row>
      </Container>
    </>
  );
}
