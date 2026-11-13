import "server-only";
import { ImageResponse } from "next/og";
import { getList } from "@/lib/lists/queries";
import { img } from "@/lib/tmdb";

export const ogSize = { width: 1200, height: 630 };

/**
 * Link preview for a list: the first four posters as a 2 by 2 mosaic, the name, who made it and how many titles.
 * A crawler is never signed in, so only "Anyone with the link" lists get it. Private and friends lists (and wrong
 * ids) get the plain card, their name never leaves. Colors are --color-bg, --color-fg, --color-muted.
 */
export async function listOgImage(id: string) {
  const l = /^[a-z0-9]{16}$/.test(id) ? await getList(id, null) : null;
  const posters = (l?.items ?? []).flatMap((i) => img(i.posterPath, "w342") ?? []).slice(0, 4);
  const count = l ? `${l.items.length} ${l.items.length === 1 ? "title" : "titles"}` : "";
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#000000", padding: 60, gap: 60 }}>
      {posters.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            width: 340,
            height: 510,
            borderRadius: 16,
            overflow: "hidden",
            background: "#1c1c1e",
          }}
        >
          {posters.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} width={170} height={255} style={{ objectFit: "cover" }} alt="" />
          ))}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 20 }}>
        <div style={{ fontSize: 36, color: "#86868b" }}>{l ? `A list by ${l.owner}` : "A list on Lateshow"}</div>
        {l && (
          <div style={{ fontSize: l.name.length > 30 ? 56 : 76, fontWeight: 700, color: "#f5f5f7", lineHeight: 1.05 }}>
            {l.name}
          </div>
        )}
        {count && <div style={{ fontSize: 36, color: "#86868b" }}>{count}</div>}
      </div>
      <div style={{ position: "absolute", right: 60, bottom: 50, fontSize: 28, color: "#86868b" }}>Lateshow</div>
    </div>,
    // not the default year-long immutable cache: a list made private must drop its card within minutes, at
    // Cloudflare too
    { ...ogSize, headers: { "Cache-Control": "public, max-age=300, must-revalidate" } },
  );
}
