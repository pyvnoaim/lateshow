import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { RoomStart } from "@/features/rooms/RoomStart";

export const metadata = { title: "Rooms · Lateshow" };

export default function RoomsPage() {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense>
        <RoomStart />
      </Suspense>
    </Container>
  );
}
