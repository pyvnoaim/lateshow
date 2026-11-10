import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { GlassSheen } from "@/components/GlassSheen";
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
        {children}
        <GlassSheen />
      </body>
    </html>
  );
}
