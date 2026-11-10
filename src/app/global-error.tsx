"use client";

import { Inter_Tight } from "next/font/google";
import { useEffect } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import "./globals.css";

const interTight = Inter_Tight({ variable: "--font-inter-tight", subsets: ["latin"] });

// Last resort when the root layout itself fails. Replaces the whole document, so it needs html, body, fonts and styles.
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={interTight.variable}>
      <body className="min-h-dvh bg-bg text-fg">
        <Container as="main" className="pt-page-top">
          <StatusMessage title="Something went wrong." detail="Lateshow couldn't load. Try again in a moment.">
            <button type="button" onClick={retry} className={buttonStyles("primary")}>
              Try again
            </button>
          </StatusMessage>
        </Container>
      </body>
    </html>
  );
}
