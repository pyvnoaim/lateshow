import Link from "next/link";

// Sign in, invites and the phone handoff have no footer, but the Impressum and privacy page must be one tap away
// from every page (§ 5 DDG), so they sit quietly at the bottom.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <nav aria-label="Legal" className="fixed right-4 bottom-4 z-10 flex gap-5 text-caption text-muted sm:right-12">
        <Link href="/privacy" className="transition-colors hover:text-fg">
          Privacy
        </Link>
        <Link href="/impressum" className="transition-colors hover:text-fg">
          Impressum
        </Link>
      </nav>
    </>
  );
}
