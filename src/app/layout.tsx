import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
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
        <div aria-hidden className="h-24" />
      </body>
    </html>
  );
}
