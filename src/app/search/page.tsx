import { Suspense } from "react";
import { PosterGridSkeleton } from "@/components/PosterLink";
import { SearchField } from "@/components/SearchField";
import { SearchResults } from "@/features/search/SearchResults";

export const metadata = { title: "Search · Lateshow" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-8 px-4 pt-[120px] sm:px-12">
      <div className="max-w-[560px]">
        <SearchField autoFocus />
      </div>
      <Suspense fallback={<PosterGridSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
