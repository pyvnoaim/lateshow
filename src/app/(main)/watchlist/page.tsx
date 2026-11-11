import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { WatchlistPage } from "@/features/watchlist/WatchlistPage";

export const metadata = { title: "Watchlist · Lateshow" };

export default function Page({ searchParams }: PageProps<"/watchlist">) {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense fallback={<PosterGridSkeleton page />}>
        <WatchlistPage searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
