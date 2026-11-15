import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { ProfileSkeleton } from "@/features/profile/Profile";
import { UserProfile } from "@/features/profile/UserProfile";

export const metadata = { title: "Profile · Lateshow" };

export default function UserPage({ params, searchParams }: PageProps<"/u/[username]">) {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
