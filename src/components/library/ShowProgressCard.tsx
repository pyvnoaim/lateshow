import Image from "next/image";
import Link from "next/link";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { img } from "@/lib/tmdb";

/** Backdrop card for a show you're watching: name, next episode, progress. Links to the title page. */
export function ShowProgressCard({
  id,
  name,
  backdropPath,
  nextLabel,
  percent,
}: {
  id: number;
  name: string;
  backdropPath: string | null;
  nextLabel: string;
  percent: number;
}) {
  const src = img(backdropPath, "w780");
  return (
    <Link href={`/title/tv/${id}`} className="group block">
      <div className="relative aspect-video lift overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
        {src && <Image src={src} alt="" fill sizes="(max-width: 1024px) 50vw, 400px" className="object-cover" />}
        <div className="absolute inset-0 bg-linear-to-t from-bg/85 via-bg/10 to-bg/0" />
        <div className="absolute inset-x-5 bottom-4 flex flex-col gap-2">
          <span className="truncate text-body font-semibold">{name}</span>
          <div className="flex items-center gap-3 text-caption text-fg/80 nums">
            <span className="shrink-0">{nextLabel}</span>
            <ProgressBar percent={percent} label={`${percent}% of ${name} watched`} />
          </div>
        </div>
      </div>
    </Link>
  );
}
