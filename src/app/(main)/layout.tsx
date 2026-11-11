import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";

// The page grows to fill the screen, so the footer sits at the bottom even when a page is short.
export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
