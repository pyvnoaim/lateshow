import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site";
import { Inter_Tight } from "next/font/google";
import { AsciiScrollbar } from "@/components/AsciiScrollbar";
import { GlassSheen } from "@/components/GlassSheen";
import { Tooltips } from "@/components/Tooltips";
import { UpdateBar } from "@/components/UpdateBar";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Lateshow",
  description: "Everything you watch. One place.",
  // the image comes from opengraph-image.png next to this file
  openGraph: { siteName: "Lateshow", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={interTight.variable}>
      <body className="relative min-h-dvh bg-bg text-fg">
        {children}
        <GlassSheen />
        <Tooltips />
        <UpdateBar />
        <AsciiScrollbar />
      </body>
    </html>
  );
}
