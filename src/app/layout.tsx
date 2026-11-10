import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { Dock } from "@/components/Dock";
import { TopBar } from "@/components/TopBar";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lateshow",
  description: "Everything you watch. One place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={interTight.variable}>
      <body className="relative min-h-dvh bg-bg text-fg">
        <TopBar />
        {children}
        <footer className="mx-auto max-w-[1280px] px-4 pt-24 pb-32 text-xs text-muted sm:px-12">Data and images from TMDB</footer>
        <Dock />
      </body>
    </html>
  );
}
