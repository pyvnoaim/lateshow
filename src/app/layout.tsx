import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lateshow",
  description: "Everything you watch. One place.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={interTight.variable}>
      <body className="min-h-dvh bg-bg text-fg">
        <header className="sticky top-0 z-20 bg-bg/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1280px] items-center gap-8 px-8 py-3.5">
            <Link href="/" className="text-xl font-bold tracking-tight">Lateshow</Link>
            <nav className="ml-auto flex gap-7 text-[15px]">
              <Link href="/" className="font-semibold">Home</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
