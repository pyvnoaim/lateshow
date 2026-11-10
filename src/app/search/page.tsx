import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { SearchField } from "@/components/SearchField";
import { SearchResults } from "@/features/search/SearchResults";

export const metadata = { title: "Search · Lateshow" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Container as="main" className="flex flex-col gap-8 pt-page-top">
      <div className="max-w-search">
        <SearchField autoFocus />
      </div>
      <Suspense fallback={<PosterGridSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
