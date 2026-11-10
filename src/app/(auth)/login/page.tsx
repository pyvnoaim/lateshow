import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PosterWall } from "@/features/auth/components/PosterWall";
import { SignIn } from "@/features/auth/SignIn";

export const metadata = { title: "Sign in · Lateshow" };

// The poster wall fills the page behind everything, so the glass field and button have color to pick up.
// Name and form are one centered block on the same page column as every other page.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Suspense>
        <PosterWall />
      </Suspense>
      <Container as="main" className="relative flex min-h-dvh items-center py-16">
        {/* the name belongs to the form block instead of floating alone in a corner */}
        <div className="flex w-full max-w-form flex-col gap-14">
          <Link href="/" className="w-fit text-logo font-bold tracking-tight">
            Lateshow
          </Link>
          <Suspense>
            <SignIn searchParams={searchParams} />
          </Suspense>
        </div>
      </Container>
    </div>
  );
}
