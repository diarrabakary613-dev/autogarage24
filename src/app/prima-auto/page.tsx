import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Scale, Search, ShieldCheck, UserRound } from "lucide-react";
import { BETA_NOTE, FaqList, FeatureGrid, FormSection, LandingHero } from "@/components/marketing/landing";
import { NeoSearchForm } from "@/components/partner/search-forms";
import { BetaSignupForm } from "@/components/partner/forms";
import { Alert } from "@/components/ui/feedback";
import { NEO_DISCLAIMER } from "@/lib/neopatentati/engine";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/prima-auto", {
  title: "La tua prima auto — auto per neopatentati a Milano",
  description: "La tua prima auto merita una scelta intelligente: cerca auto compatibili con la patente da neopatentato, confrontale e trova venditori professionali a Milano.",
  alternates: { canonical: "/prima-auto" },
});
}

export default function FirstCarPage() {
  return (
    <>
      <LandingHero eyebrow="Neopatentati" title="La tua prima auto merita una scelta intelligente." subtitle="Cerca auto compatibili con i limiti per neopatentati, confrontale con calma e conosci chi te le vende. Anche insieme alla tua famiglia."
        crumbs={[{ name: "Prima auto", href: "/prima-auto" }]}
        ctas={[{ href: "#cerca", label: "Cerca la prima auto" }, { href: "/auto-per-neopatentati#calcolatore", label: "Verifica un'auto" }]} />
      <FeatureGrid id="come" eyebrow="Come ti aiutiamo" title="Quattro controlli prima di decidere" columns={4} items={[
        { icon: Search, title: "Cerca", text: "Filtra per prezzo, alimentazione e zona solo tra le auto compatibili." },
        { icon: ShieldCheck, title: "Controlla la compatibilità", text: "Calcolata da potenza e tara secondo il Codice della strada; se mancano dati l'auto è «da verificare»." },
        { icon: Scale, title: "Confronta", text: "Fino a tre auto affiancate: prezzo, chilometri, consumi, costi." },
        { icon: UserRound, title: "Conosci il venditore", text: "Profilo del venditore professionale e, se presente, il controllo AutoGarage24." },
      ]} />
      <FormSection id="cerca" eyebrow="Ricerca" title="Trova auto compatibili" description="La ricerca apre il marketplace con il filtro neopatentati già attivo." side={<Alert tone="warning">{NEO_DISCLAIMER}</Alert>}>
        <NeoSearchForm />
      </FormSection>
      <FormSection id="beta" eyebrow="Beta" title="Avvisami quando arrivano nuove auto" description={BETA_NOTE}>
        <BetaSignupForm defaultAudience="neopatentato" idPrefix="pa-beta" />
      </FormSection>
      <FaqList id="faq" title="Domande sulla prima auto" items={[
        { q: "Quali auto può guidare un neopatentato?", a: "Dipende dalla data della patente: per le patenti dal 14/12/2024 valgono limiti di 75 kW/t e 105 kW per i primi 36 mesi; per quelle precedenti 55 kW/t e 70 kW per 12 mesi. La nostra pagina dedicata riporta le fonti ufficiali." },
        { q: "L'esito «compatibile» è una garanzia?", a: "No: è un calcolo sui dati dichiarati nell'annuncio. Prima dell'acquisto verifica sempre la carta di circolazione." },
        { q: "Posso farmi aiutare dai miei genitori?", a: "Certo: puoi salvare le auto nei preferiti e condividerne il link, oppure confrontarle insieme." },
      ]} />
    </>
  );
}
