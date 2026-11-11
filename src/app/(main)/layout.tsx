import { Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopBar />
      {children}
      <Footer />
    </>
  );
}
