import Image from "next/image";
import { getRegion } from "@/lib/region";
import { getMyServiceIds } from "@/lib/settings/queries";
import { getGenreNames, getTitle, img, subscriptionServices, type Card } from "@/lib/tmdb";

/**
 * The grey line under a poster title: "Movie · 2026 · Crime", plus a small app icon
 * when it streams on a subscription in your country.
 */
export async function PosterCaption({ card }: { card: Card }) {
  const year = (card.release_date ?? card.first_air_date ?? "").slice(0, 4);
  const { code: country, lang } = await getRegion();
  // ponytail: one cached title lookup per poster (days, per language). Fine for rows of 12-24, a batch endpoint if TMDB limits bite.
  const [genres, service] = await Promise.all([
    getGenreNames(lang).catch(() => ({}) as Record<number, string>),
    Promise.all([getTitle(card.media_type, String(card.id), lang), getMyServiceIds()])
      .then(([t, mine]) => {
        const all = subscriptionServices(t, country);
        return all.find((s) => mine.includes(s.id)) ?? all[0];
      })
      .catch(() => undefined),
  ]);
  const genre = card.genre_ids?.map((id) => genres[id]).find(Boolean);
  return (
    <span className="-mt-2 flex items-center gap-1.5 text-caption text-muted">
      <span className="truncate">
        {[card.media_type === "tv" ? "Series" : "Movie", year, genre].filter(Boolean).join(" · ")}
      </span>
      {service && (
        <Image
          src={img(service.logoPath, "w92")!}
          alt={`On ${service.name}`}
          data-tip={service.name}
          width={14}
          height={14}
          className="size-3.5 shrink-0 rounded-sm"
        />
      )}
    </span>
  );
}
