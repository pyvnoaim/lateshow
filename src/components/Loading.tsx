import { cookies } from "next/headers";
import { Suspense, type ReactNode } from "react";
import { isProduction } from "@/lib/env";
import { SKELETON_COOKIE } from "./devFlags";

async function Gate({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  if (!isProduction && (await cookies()).get(SKELETON_COOKIE)?.value === "1") return fallback;
  return children;
}

/** A loading boundary: shows `fallback` (a skeleton) while `children` load. Use instead of a bare Suspense. */
export function Loading({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  return (
    <Suspense fallback={fallback}>
      <Gate fallback={fallback}>{children}</Gate>
    </Suspense>
  );
}
