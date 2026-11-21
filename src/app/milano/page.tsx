import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import { Car, Cog, KeyRound, Package, Warehouse, Wrench, Handshake } from "lucide-react";
import { BETA_NOTE, CheckList, FeatureGrid, FormSection, LandingHero } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { BetaSignupForm } from "@/components/partner/forms";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Alert } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { latestNeoListingsCached } from "@/lib/data/listings";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/milano", {
  title: "AutoGarage24 Milano — auto, officine, meccanici e ricambi in un unico posto",
  description: "Trova la tua prossima auto, scopri professionisti del settore, cerca ricambi e gestisci la manutenzione della tua automobile con AutoGarage24. Beta a Milano e provincia.",
  alternates: { canonical: "/milano" },
});
}

export default function MilanoPage() {
  return (
    <>
      <LandingHero
        eyebrow="Beta · Milano e provincia"
        title="Il mondo dell'automobile, finalmente tutto in un unico posto."
        subtitle="Trova la tua prossima auto, scopri professionisti del settore, cerca ricambi e gestisci la manutenzione della tua automobile con AutoGarage24."
        crumbs={[{ name: "Milano", href: "/milano" }]}
        ctas={[
          { href: "/auto-usate", label: "Cerca un'auto" },
          { href: "/garages", label: "Trova un'officina" },
          { href: "/diventa-partner", label: "Diventa partner" },
          { href: "#beta", label: "Entra nella Beta" },
        ]}
      />
      <FeatureGrid id="servizi" eyebrow="Cosa trovi" title="Sei servizi, un solo account" items={[
        { icon: KeyRound, title: "Auto per neopatentati", text: "Compatibilità calcolata dai dati del veicolo secondo il Codice della strada; i casi incerti sono segnalati.", href: "/prima-auto", cta: "Cerca la prima auto" },
        { icon: Car, title: "Auto usate", text: "Annunci controllati dallo staff, filtri completi e confronto fino a tre auto.", href: "/auto-usate", cta: "Cerca un'auto" },
        { icon: Wrench, title: "Officine", text: "Ricerca per zona, servizio e marca; preventivi e appuntamenti online.", href: "/trova-officina", cta: "Trova un'officina" },
        { icon: Cog, title: "Meccanici", text: "Meccanici indipendenti, anche a domicilio, con le zone servite.", href: "/meccanici", cta: "Trova un meccanico" },
        { icon: Package, title: "Ricambi", text: "Ricerca per codice OEM o per la tua auto, con compatibilità trasparente.", href: "/trova-ricambi", cta: "Cerca ricambi" },
        { icon: Warehouse, title: "Manutenzione", text: "Il mio Garage: scadenze, promemoria, storico interventi e documenti privati.", href: "/dashboard/garage-auto", cta: "Apri il mio Garage" },
      ]} />
      <Section id="neopatentati" tone="mist" labelledBy="neo-t">
        <SectionHeading id="neo-t" eyebrow="Neopatentati" title="Prime auto compatibili, appena pubblicate" description="Solo auto con esito «compatibile» calcolato dalla piattaforma. Verifica sempre i dati del libretto prima dell'acquisto." action={<ButtonLink href="/auto-per-neopatentati" variant="outline" data-track="cta" data-track-label="Tutte le auto neopatentati">Vedi tutte</ButtonLink>} />
        <Suspense fallback={<p className="text-muted">Caricamento…</p>}><NeoShowcase /></Suspense>
      </Section>
      <FeatureGrid id="partner" eyebrow="Per i professionisti" title="Diventa partner a Milano" tone="white" columns={2} items={[
        { icon: Handshake, title: "Officine, meccanici e ricambi", text: "Visibilità locale, richieste, preventivi e appuntamenti. Gratuito in Beta.", href: "/diventa-partner", cta: "Diventa partner" },
        { icon: Car, title: "Concessionari e venditori", text: "Pubblica le tue auto e ricevi richieste ordinate con AutoGarage24 Partner.", href: "/partner", cta: "Scopri AutoGarage24 Partner" },
      ]} />
      <FormSection id="beta" eyebrow="Beta" title="Entra nella Beta di AutoGarage24" description="Lasciaci la tua email: ti scriviamo noi quando la tua area è pronta. Nessuna newsletter promozionale senza un consenso separato." side={<><Alert tone="info">{BETA_NOTE}</Alert><CheckList items={["Accesso anticipato alle funzioni", "Possibilità di dare feedback al team", "Puoi cancellare l'iscrizione quando vuoi"]} /></>}>
        <BetaSignupForm idPrefix="milano-beta" />
      </FormSection>
    </>
  );
}

async function NeoShowcase() {
  const items = await latestNeoListingsCached(3);
  if (!items.length) return <p className="rounded-2xl border border-dashed border-line-strong bg-white p-6 text-muted">Non ci sono ancora auto compatibili pubblicate: stiamo raccogliendo i primi annunci autorizzati dai partner. Torna presto o iscriviti alla Beta.</p>;
  return <ul className="grid gap-5 md:grid-cols-3">{items.map((i) => <li key={i.id}><ListingCard item={i} favorite={null} showNeo /></li>)}</ul>;
}
