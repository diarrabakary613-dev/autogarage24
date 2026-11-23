import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { CalendarDays, FileText, MapPin, Star } from "lucide-react";
import Link from "next/link";
import { FaqList, FeatureGrid, LandingHero } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ProQuickSearch } from "@/components/professionals/quick-search";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/trova-officina", {
  title: "Trova un'officina a Milano — preventivi e appuntamenti",
  description: "Cerca officine e meccanici a Milano e provincia per zona, servizio e marca. Richiedi un preventivo, confronta le offerte e fissa un appuntamento.",
  alternates: { canonical: "/trova-officina" },
});
}

export default function FindWorkshopPage() {
  return (
    <>
      <LandingHero eyebrow="Officine e meccanici" title="L'officina giusta, vicino a te." subtitle="Cerca per nome, indirizzo o vicino a te. Descrivi il problema una volta sola, ricevi preventivi indicativi e scegli con calma."
        crumbs={[{ name: "Trova un'officina", href: "/trova-officina" }]}
        ctas={[{ href: "#cerca", label: "Trova un'officina" }, { href: "/richiedi-intervento", label: "Richiedi un intervento" }]} />
      <Section id="cerca" tone="mist" labelledBy="cerca-t">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          <SectionHeading id="cerca-t" eyebrow="Ricerca" title="Cerca un'officina" description="Scrivi il nome di un'officina oppure un indirizzo, una città o un CAP: ti mostriamo le officine più vicine sulla mappa. Oppure premi «Officine vicino a me»." className="mb-0" />
          <ProQuickSearch base="/garages" kind="officina" />
          <p className="text-sm text-muted">
            Esempi: «Autofficina Rossi», «Via Padova 120 Milano», «Sesto San Giovanni», «20135». Cerchi un meccanico che viene da te?{" "}
            <Link href="/meccanici#cerca" className="font-semibold text-orange-700 hover:underline">Cerca tra i meccanici</Link>.
          </p>
        </div>
      </Section>
      <FeatureGrid id="come" eyebrow="Come funziona" title="Dalla ricerca all'appuntamento" columns={4} items={[
        { icon: MapPin, title: "Zona e servizio", text: "Elenco e mappa delle officine pubblicate, con servizi e orari dichiarati." },
        { icon: FileText, title: "Una richiesta, più officine", text: "Descrivi il problema e inviala alle officine compatibili che scegli tu." },
        { icon: CalendarDays, title: "Preventivo e appuntamento", text: "Confronta i preventivi, accettane uno e concorda data e orario." },
        { icon: Star, title: "Recensioni reali", text: "Solo chi ha concluso un intervento tramite la piattaforma può recensire." },
      ]} />
      <FaqList id="faq" title="Domande frequenti" items={[
        { q: "I preventivi sono definitivi?", a: "No: sono indicativi. Molti interventi richiedono un controllo in officina prima del prezzo finale; l'officina lo indica nel preventivo." },
        { q: "Quanto costa usare AutoGarage24?", a: "Per gli automobilisti è gratuito." },
      ]} />
    </>
  );
}
