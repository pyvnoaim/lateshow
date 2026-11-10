import Link from "next/link";
import { Suspense } from "react";
import { PosterWall } from "@/features/auth/components/PosterWall";
import { SignIn } from "@/features/auth/SignIn";

export const metadata = { title: "Sign in · Lateshow" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 sm:px-12">
        <header className="flex h-bar items-center">
          <Link href="/" className="text-logo font-bold tracking-tight">
            Lateshow
          </Link>
        </header>
        <main className="flex flex-1 items-center py-12 lg:pl-18">
          <div className="w-full max-w-form">
            <Suspense>
              <SignIn searchParams={searchParams} />
            </Suspense>
          </div>
        </main>
      </div>
      <Suspense fallback={<div aria-hidden className="hidden lg:block" />}>
        <PosterWall />
      </Suspense>
    </div>
  );
}
