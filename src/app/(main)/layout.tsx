import { TopBar } from "@/components/TopBar";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <TopBar />
      {children}
      <div aria-hidden className="h-24" />
    </>
  );
}
