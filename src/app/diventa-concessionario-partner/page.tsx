import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Car, Inbox, KeyRound, ShieldCheck } from "lucide-react";
import { BETA_NOTE, FeatureGrid, FormSection, LandingHero } from "@/components/marketing/landing";
import { PartnerApplicationForm } from "@/components/partner/forms";
import { Alert } from "@/components/ui/feedback";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/diventa-concessionario-partner", {
  title: "Diventa concessionario partner AutoGarage24 a Milano",
  description: "Pubblica le tue auto dove le cercano anche i neopatentati. Annunci controllati, richieste ordinate, profilo professionale. Gratuito durante la Beta.",
  alternates: { canonical: "/diventa-concessionario-partner" },
});
}

export default function DealerPartnerLanding() {
  return (
    <>
      <LandingHero eyebrow="Concessionari partner" title="Pubblica le tue auto dove le cercano davvero." subtitle="Annunci controllati, compatibilità neopatentati calcolata dai dati tecnici, richieste di informazioni e appuntamenti collegati a ogni auto."
        crumbs={[{ name: "Concessionario partner", href: "/diventa-concessionario-partner" }]}
        ctas={[{ href: "#candidatura", label: "Diventa concessionario partner" }, { href: "/partner", label: "Scopri il programma" }]} />
      <FeatureGrid id="cosa" eyebrow="Per il tuo salone" title="Strumenti per vendere meglio, non promesse" columns={4} items={[
        { icon: Car, title: "Annunci completi", text: "Galleria, scheda tecnica, manutenzione e difetti noti." },
        { icon: KeyRound, title: "Neopatentati", text: "Il pubblico della prima auto filtra per compatibilità." },
        { icon: Inbox, title: "Richieste collegate", text: "Ogni contatto arriva con l'auto di riferimento." },
        { icon: ShieldCheck, title: "Fiducia", text: "Controllo dello staff e badge verificati." },
      ]} />
      <FormSection id="candidatura" eyebrow="Candidatura" title="Candida il tuo salone" side={<Alert tone="info">{BETA_NOTE}</Alert>}>
        <PartnerApplicationForm program="partner_auto" types={["concessionario", "venditore_auto"]} showCars idPrefix="lp-dea" />
      </FormSection>
    </>
  );
}
