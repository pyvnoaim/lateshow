import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lateshow",
    short_name: "Lateshow",
    description: "Everything you watch. One place.",
    start_url: "/",
    display: "standalone",
    // --color-bg in globals.css
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      // transparent around the rounded tile: apple-icon.png is full bleed for iOS's mask and showed as a square elsewhere
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
