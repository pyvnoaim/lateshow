import Image from "next/image";
import { Container } from "@/components/ui/Container";

export const metadata = { title: "About · Lateshow" };

// TMDB attribution lives here (their terms: logo + notice in an About or Credits section, logo less prominent than ours).
export default function AboutPage() {
  return (
    <Container as="main" size="narrow" className="flex flex-col gap-12 pt-page-top">
      <div className="flex flex-col gap-4">
        <h1 className="text-page leading-none font-bold">About Lateshow</h1>
        <p className="text-body leading-relaxed text-muted">
          Find what to watch, where to watch it,
          <br />
          and keep track of everything you&apos;ve seen.
        </p>
      </div>

      <section className="flex flex-col gap-5">
        <h2 className="text-small font-semibold text-muted">Data</h2>
        <Image src="/tmdb-logo.svg" alt="The Movie Database (TMDB)" width={160} height={21} />
        <p className="text-body leading-relaxed">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
          <br />
          <span className="text-muted">Streaming availability comes from JustWatch.</span>
        </p>
      </section>
    </Container>
  );
}
