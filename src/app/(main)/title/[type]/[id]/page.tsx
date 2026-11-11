import { Loading } from "@/components/Loading";
import { TitleSkeleton, TitleView } from "@/features/titles/TitleView";

export default function TitlePage({ params }: PageProps<"/title/[type]/[id]">) {
  return (
    <Loading fallback={<TitleSkeleton />}>
      {params.then(({ type, id }) => (
        <TitleView type={type} id={id} />
      ))}
    </Loading>
  );
}
