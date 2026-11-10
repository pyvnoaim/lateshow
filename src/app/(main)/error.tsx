"use client";

import Link from "next/link";
import { useEffect } from "react";
import { StatusMessage } from "@/components/StatusMessage";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";

// Inside the main layout, so the top bar stays and you can navigate away.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container as="main" className="pt-page-top pb-24">
      <StatusMessage title="Something went wrong." detail="It's on our side. Try again in a moment.">
        <button type="button" onClick={retry} className={buttonStyles("primary")}>
          Try again
        </button>
        <Link href="/" className={buttonStyles("quiet", "md")}>
          Go home
        </Link>
      </StatusMessage>
    </Container>
  );
}
