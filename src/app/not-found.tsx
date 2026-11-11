import Link from "next/link";
import { Suspense } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";
import { TrendingRow } from "@/features/discover/TrendingRow";

export const metadata = { title: "Not found · Lateshow" };

// Root level, so it also catches unknown URLs. It brings its own top bar because it renders outside (main).
export default function NotFound() {
  return (
    <>
      <TopBar />
      <Container as="main" className="flex flex-col gap-section pt-page-top pb-24">
        <StatusMessage title="This page doesn't exist." detail="Maybe it moved, or the link has a typo.">
          <Link href="/" className={buttonStyles("primary")}>
            Go home
          </Link>
          <Link href="/search" className={buttonStyles("glass", "md")}>
            Search
          </Link>
        </StatusMessage>
        <Suspense>
          <TrendingRow title="Something to watch instead" />
        </Suspense>
      </Container>
      <Footer />
    </>
  );
}
