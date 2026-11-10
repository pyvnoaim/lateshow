import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { CinemaCalendar } from "@/features/discover/CinemaCalendar";

export const metadata = { title: "Coming to cinemas · Lateshow" };

export default function CinemasPage() {
  return (
    <Container as="main" className="flex flex-col gap-section pt-page-top">
      <div className="flex rise flex-col gap-3">
        <h1 className="text-page leading-none font-bold">Coming to cinemas</h1>
        <p className="text-body text-muted">Upcoming releases in German cinemas, by release day.</p>
      </div>
      <Suspense fallback={<PosterGridSkeleton />}>
        <CinemaCalendar />
      </Suspense>
    </Container>
  );
}
