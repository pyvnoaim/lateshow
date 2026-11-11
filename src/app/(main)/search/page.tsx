import { Loading } from "@/components/Loading";
import { Container } from "@/components/ui/Container";
import { PosterGridSkeleton } from "@/components/ui/PosterGrid";
import { SearchResults } from "@/features/search/SearchResults";

export const metadata = { title: "Search · Lateshow" };

// The field itself is the top bar search, which stays open on this page.
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Container as="main" className="flex flex-col gap-8 pt-page-top">
      <Loading fallback={<PosterGridSkeleton />}>
        <SearchResults searchParams={searchParams} />
      </Loading>
    </Container>
  );
}
