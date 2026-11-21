import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { BadgeCheck, Car, Hash, MessagesSquare } from "lucide-react";
import { FeatureGrid, FormSection, LandingHero } from "@/components/marketing/landing";
import { PartsSearchForm } from "@/components/partner/search-forms";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/trova-ricambi", {
  title: "Trova ricambi auto per codice OEM o per la tua auto",
  description: "Cerca ricambi nuovi, usati e ricondizionati a Milano per codice OEM o per marca, modello e anno della tua auto. Compatibilità indicata in modo trasparente.",
  alternates: { canonical: "/trova-ricambi" },
});
}

export default function FindPartsPage() {
  return (
    <>
      <LandingHero eyebrow="Ricambi" title="Il pezzo giusto per la tua auto." subtitle="Cerca per codice OEM o per la tua automobile. Ti diciamo chiaramente se la compatibilità è verificata, potenziale o da verificare."
        crumbs={[{ name: "Trova ricambi", href: "/trova-ricambi" }]}
        ctas={[{ href: "#cerca", label: "Cerca ricambi" }, { href: "/dashboard/garage-auto", label: "Salva la tua auto" }]} />
      <FormSection id="cerca" eyebrow="Ricerca" title="Cerca un ricambio" description="Con il codice OEM ottieni i risultati più precisi.">
        <PartsSearchForm />
      </FormSection>
      <FeatureGrid id="come" eyebrow="Trasparenza" title="Cosa significa «compatibile»" columns={4} items={[
        { icon: Hash, title: "Verificata", text: "Solo con codice OEM o numero di telaio corrispondenti." },
        { icon: Car, title: "Potenziale", text: "Marca, modello e anni coincidono, ma serve una conferma." },
        { icon: BadgeCheck, title: "Da verificare", text: "Dati insufficienti: chiedi al venditore prima di acquistare." },
        { icon: MessagesSquare, title: "Chiedi al venditore", text: "Informazioni, disponibilità, spedizione o ritiro con un messaggio." },
      ]} />
    </>
  );
}
