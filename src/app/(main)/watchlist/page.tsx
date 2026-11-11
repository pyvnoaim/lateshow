import { Suspense } from "react";
import { WatchlistRedirect } from "@/features/auth/WatchlistRedirect";

export const metadata = { title: "Watchlist · Lateshow" };

// The top bar's "Watchlist": your profile's watchlist tab, or sign in first and come back to it.
export default function WatchlistPage() {
  return (
    <Suspense>
      <WatchlistRedirect />
    </Suspense>
  );
}
