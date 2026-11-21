import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { CalendarDays, FileText, MapPin, UserRound } from "lucide-react";
import { BETA_NOTE, FeatureGrid, FormSection, LandingHero } from "@/components/marketing/landing";
import { PartnerApplicationForm } from "@/components/partner/forms";
import { Alert } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/diventa-officina-partner", {
  title: "Diventa officina partner AutoGarage24 a Milano",
  description: "Fai conoscere la tua officina a nuovi automobilisti: profilo, richieste, preventivi e appuntamenti. Gratuito durante la Beta, senza risultati garantiti.",
  alternates: { canonical: "/diventa-officina-partner" },
});
}

export default function WorkshopPartnerLanding() {
  return (
    <>
      <LandingHero eyebrow="Officine partner" title="Fai conoscere la tua officina a nuovi automobilisti." subtitle="Richieste già descritte, foto del problema, preventivi chiari e appuntamenti: tutto in un'area pensata per l'officina. Gratuito in Beta."
        crumbs={[{ name: "Officina partner", href: "/diventa-officina-partner" }]}
        ctas={[{ href: "#candidatura", label: "Diventa officina partner" }, { href: "/professionisti/registrazione-garage", label: "Registrati subito" }]} />
      <FeatureGrid id="cosa" eyebrow="Per la tua officina" title="Meno telefonate a vuoto, richieste più chiare" columns={4} items={[
        { icon: MapPin, title: "Visibilità locale", text: "Nelle ricerche per zona, servizio e marca." },
        { icon: FileText, title: "Richieste complete", text: "Auto, chilometri, problema, foto e disponibilità." },
        { icon: CalendarDays, title: "Agenda", text: "Proponi e conferma appuntamenti dalla tua area." },
        { icon: UserRound, title: "Profilo verificato", text: "Badge solo dopo la verifica dei documenti." },
      ]} />
      <FormSection id="candidatura" eyebrow="Candidatura" title="Candida la tua officina" side={<Alert tone="info">{BETA_NOTE}</Alert>}>
        <PartnerApplicationForm program="partner_professionisti" types={["officina", "centro_specializzato", "meccanico"]} idPrefix="lp-off" />
      </FormSection>
    </>
  );
}
