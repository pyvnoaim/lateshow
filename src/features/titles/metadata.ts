import "server-only";
import type { Metadata } from "next";
import { getRegion } from "@/lib/region";
import { getTitle, img } from "@/lib/tmdb";

/** Cuts at a word boundary and adds "…", for link preview descriptions. Pure. */
export function clip(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 0 ? cut.lastIndexOf(" ") : cut.length).trimEnd()}…`;
}

/** Title, year, overview and backdrop for a title page's tab and link previews (Discord, iMessage, WhatsApp). */
export async function titleMetadata(type: string, id: string): Promise<Metadata> {
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) return {};
  const { lang } = await getRegion();
  const t = await getTitle(type, id, lang).catch(() => null);
  if (!t) return {};
  const name = t.title ?? t.name ?? "";
  const year = (t.release_date ?? t.first_air_date ?? "").slice(0, 4);
  const title = year ? `${name} (${year})` : name;
  const description = clip(t.overview, 200);
  const backdrop = img(t.backdrop_path, "w1280");
  // through our image server like every picture on the site, so whoever opens the preview never talks to TMDB
  const images = backdrop
    ? [{ url: `/_next/image?url=${encodeURIComponent(backdrop)}&w=1200&q=75`, width: 1200, height: 675, alt: name }]
    : undefined;
  return {
    title: `${title} · Lateshow`,
    description,
    openGraph: {
      title,
      description,
      siteName: "Lateshow",
      type: type === "movie" ? "video.movie" : "video.tv_show",
      images,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
