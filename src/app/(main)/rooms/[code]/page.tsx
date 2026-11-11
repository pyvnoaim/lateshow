import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { RoomLobby } from "@/features/rooms/RoomLobby";

export const metadata = { title: "Room · Lateshow", robots: { index: false } };

export default function RoomPage({ params }: PageProps<"/rooms/[code]">) {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense>
        <Lobby params={params} />
      </Suspense>
    </Container>
  );
}

async function Lobby({ params }: { params: Promise<{ code: string }> }) {
  return <RoomLobby code={(await params).code} />;
}
