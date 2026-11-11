import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Settings } from "@/features/settings/Settings";

export const metadata = { title: "Settings · Lateshow" };

export default function SettingsPage() {
  return (
    <Container as="main" className="pt-page-top">
      <Suspense>
        <Settings />
      </Suspense>
    </Container>
  );
}
