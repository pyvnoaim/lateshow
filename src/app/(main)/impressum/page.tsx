import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { OPERATOR } from "@/lib/legal";

export const metadata = { title: "Impressum · Lateshow" };

// § 5 DDG (Digitale-Dienste-Gesetz) and § 18 (2) MStV. German headings, because that's where they're required.
export default function ImpressumPage() {
  return (
    <Container as="main" size="narrow" className="flex flex-col gap-12 pt-page-top">
      <h1 className="text-page leading-none font-bold">Impressum</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-small font-semibold text-muted">Angaben gemäß § 5 DDG</h2>
        <address className="text-body leading-relaxed not-italic">
          {OPERATOR.name}
          <br />
          {OPERATOR.co}
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.city}
          <br />
          {OPERATOR.country}
        </address>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-small font-semibold text-muted">Kontakt</h2>
        <p className="text-body">
          E-Mail:{" "}
          <a href={`mailto:${OPERATOR.email}`} className="glass-hover -mx-1 rounded-thumb px-1">
            {OPERATOR.email}
          </a>
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-small font-semibold text-muted">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
        <p className="text-body leading-relaxed">{OPERATOR.name}, Anschrift wie oben.</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-small font-semibold text-muted">About this site</h2>
        <p className="text-body leading-relaxed text-muted">
          Lateshow is a private, non-commercial project.
          <br />
          No ads, no paid features, nothing for sale.
        </p>
        <p className="text-body leading-relaxed text-muted">
          Film and series data come from TMDB, streaming offers from JustWatch.
          <br />
          We link to legal streaming services only. Details on the{" "}
          <Link href="/about" className="text-fg hover:underline">
            About
          </Link>{" "}
          page.
        </p>
      </section>
    </Container>
  );
}
