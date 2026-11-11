import { titleMetadata } from "@/features/titles/metadata";
import { TitleSkeleton, TitleView } from "@/features/titles/TitleView";
import { Suspense } from "react";

export async function generateMetadata({ params }: PageProps<"/title/[type]/[id]">) {
  const { type, id } = await params;
  return titleMetadata(type, id);
}

export default function TitlePage({ params }: PageProps<"/title/[type]/[id]">) {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      {params.then(({ type, id }) => (
        <TitleView type={type} id={id} />
      ))}
    </Suspense>
  );
}
