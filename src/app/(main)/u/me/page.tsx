import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Profile } from "@/features/profile/Profile";

export const metadata = { title: "You · Lateshow" };

export default function MyProfilePage({ searchParams }: PageProps<"/u/me">) {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense>
        <Profile searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}
