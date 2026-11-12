import { ImageResponse } from "next/og";

export const ogSize = { width: 1200, height: 630 };

/**
 * Link preview for /u/[username]: only the name from the URL and "on Lateshow". No database lookup on purpose:
 * the profile 404s for anyone who isn't a friend, so a crawler (no session) must not learn whether the name
 * exists, its avatar or any activity. shareActivity only opens activity to friends, never to the public.
 */
export function profileOgImage(username: string) {
  const name = `@${username.toLowerCase().slice(0, 30)}`;
  // colors are --color-bg, --color-fg, --color-muted from globals.css
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "#000000",
        padding: 80,
        gap: 16,
      }}
    >
      <div style={{ fontSize: 88, fontWeight: 700, color: "#f5f5f7" }}>{name}</div>
      <div style={{ fontSize: 40, color: "#86868b" }}>on Lateshow</div>
    </div>,
    ogSize,
  );
}
