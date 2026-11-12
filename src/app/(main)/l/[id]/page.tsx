import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { ListPage, ListSkeleton, listMetadata } from "@/features/lists/ListPage";

export async function generateMetadata({ params }: PageProps<"/l/[id]">) {
  return listMetadata((await params).id);
}

export default function ListRoute({ params }: PageProps<"/l/[id]">) {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense fallback={<ListSkeleton />}>
        {params.then(({ id }) => (
          <ListPage id={id} />
        ))}
      </Suspense>
    </Container>
  );
}
