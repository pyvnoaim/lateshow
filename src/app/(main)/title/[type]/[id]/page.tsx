import { TitleSkeleton, TitleView } from "@/features/titles/TitleView";
import { Suspense } from "react";

export default function TitlePage({ params }: PageProps<"/title/[type]/[id]">) {
  return (
    <Suspense fallback={<TitleSkeleton />}>
      {params.then(({ type, id }) => (
        <TitleView type={type} id={id} />
      ))}
    </Suspense>
  );
}
