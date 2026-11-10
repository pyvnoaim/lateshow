import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { PosterWall } from "@/features/auth/components/PosterWall";
import { SignIn } from "@/features/auth/SignIn";

export const metadata = { title: "Sign in · Lateshow" };

// The poster wall fills the page behind everything, so the glass field and button have color to pick up.
// Logo and form sit on the same page column as every other page.
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <Suspense>
        <PosterWall />
      </Suspense>
      <div className="relative flex min-h-dvh flex-col">
        <Container as="header" className="flex h-bar items-center">
          <Link href="/" className="text-logo font-bold tracking-tight">
            Lateshow
          </Link>
        </Container>
        <Container as="main" className="flex flex-1 items-center py-12">
          <div className="w-full max-w-form">
            <Suspense>
              <SignIn searchParams={searchParams} />
            </Suspense>
          </div>
        </Container>
      </div>
    </div>
  );
}
