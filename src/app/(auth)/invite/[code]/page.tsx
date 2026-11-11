import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { SignInForm } from "@/features/auth/components/SignInForm";
import { InviteView } from "@/features/friends/InviteView";
import { LOGIN_CODE_MINUTES } from "@/lib/auth";

export const metadata = { title: "Invite · Lateshow", robots: { index: false } };

// Same frame as sign in: the name on top, one block on the page column, nothing else.
export default function InvitePage({ params }: PageProps<"/invite/[code]">) {
  return (
    <Container as="main" className="flex min-h-dvh items-center py-16">
      <div className="flex w-full max-w-form flex-col gap-14">
        <Link href="/" className="w-fit text-logo font-bold tracking-tight">
          Lateshow
        </Link>
        <Suspense>
          <Invite params={params} />
        </Suspense>
      </div>
    </Container>
  );
}

async function Invite({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <InviteView
      code={code}
      signIn={(heading, intro) => (
        <SignInForm
          minutes={LOGIN_CODE_MINUTES}
          next={`/invite/${encodeURIComponent(code)}`}
          heading={heading}
          intro={intro}
        />
      )}
    />
  );
}
