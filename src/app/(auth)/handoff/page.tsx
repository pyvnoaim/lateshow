import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Handoff } from "@/features/rooms/Handoff";

export const metadata = { title: "Continue · Lateshow", robots: { index: false } };

export default function HandoffPage({ searchParams }: PageProps<"/handoff">) {
  return (
    <Container as="main" className="flex min-h-dvh items-center py-16">
      <div className="flex w-full max-w-form flex-col gap-14">
        <Link href="/" className="w-fit text-logo font-bold tracking-tight">
          Lateshow
        </Link>
        <Suspense>
          <Handoff searchParams={searchParams} />
        </Suspense>
      </div>
    </Container>
  );
}
