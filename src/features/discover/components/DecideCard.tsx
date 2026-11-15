import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PosterHoverActions } from "@/components/PosterActions";
import { PosterCaption } from "@/components/PosterCaption";
import { TmdbImage } from "@/components/TmdbImage";
import { getRegion } from "@/lib/region";
import { getTitle, img, pickLogo, type Card } from "@/lib/tmdb";

/**
 * One "Can't decide?" pick as a wide picture: the backdrop with the title's logo on it (its name when there's none),
 * the same name and caption under it as every poster. It's dealt in: the card rises after the one before it, its
 * picture opens from the bottom like a curtain while it settles from a slight zoom (deal, curtain).
 */
export async function DecideCard({ card, index }: { card: Card; index: number }) {
  const { lang } = await getRegion();
  // the title is cached (the caption reads it too), it brings the logo and a backdrop when the card has none
  const t = await getTitle(card.media_type, String(card.id), lang).catch(() => null);
  const name = card.title ?? card.name ?? "";
  const path = card.backdrop_path ?? t?.backdrop_path ?? null;
  const logo = t ? pickLogo(t, lang) : null;
  const delay = (ms: number) => ({ animationDelay: `${index * 110 + ms}ms` }) as CSSProperties;

  return (
    <div className="group relative flex deal flex-col gap-2.5" style={delay(0)}>
      <Link href={`/title/${card.media_type}/${card.id}`} className="group flex flex-col gap-2.5 rounded-poster">
        <div className="relative aspect-video lift overflow-hidden rounded-poster bg-raised outline-1 -outline-offset-1 outline-hairline">
          <div className="absolute inset-0 curtain" style={delay(60)}>
            {path && (
              <TmdbImage
                src={img(path, "w780")!}
                lowSrc={img(path, "w300")!}
                alt=""
                sizes="(max-width: 768px) 90vw, 33vw"
              />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-bg/80 via-bg/5 to-bg/0" aria-hidden />
          </div>
          <div className="absolute inset-x-5 bottom-4 flex rise items-end" style={delay(380)}>
            {logo ? (
              <Image
                src={img(logo.path, "w500")!}
                alt={name}
                width={Math.round(56 * logo.aspectRatio)}
                height={56}
                className="h-auto max-h-14 w-auto max-w-3/5 object-contain object-left-bottom drop-shadow-lg"
              />
            ) : (
              <span className="text-section leading-none font-bold tracking-tight text-balance">{name}</span>
            )}
          </div>
        </div>
        <span className="text-label font-medium">{name}</span>
      </Link>
      <PosterHoverActions card={card} />
      <PosterCaption card={card} />
    </div>
  );
}
