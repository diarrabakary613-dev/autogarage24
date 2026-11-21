import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import { FaqList, LandingHero } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { createPublicClient } from "@/lib/supabase/public";
import { COVERAGES, PARTNER_TYPES } from "@/lib/insurance/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/assicurazione-auto", {
  title: "Assicurazione auto — coperture spiegate e richiesta di preventivo",
  description: "RC auto, furto e incendio, kasko, cristalli e altre garanzie spiegate in modo semplice. Richiedi un preventivo a intermediari e compagnie verificati, con il tuo consenso.",
  alternates: { canonical: "/assicurazione-auto" },
});
}

export default function InsurancePage() {
  return (
    <>
      <LandingHero eyebrow="Assicurazione auto" title="Capire le coperture prima di scegliere." subtitle="Ti spieghiamo cosa copre ogni garanzia e, se vuoi, inoltriamo la tua richiesta di preventivo ai partner verificati che scegli tu. AutoGarage24 non vende polizze."
        crumbs={[{ name: "Assicurazione auto", href: "/assicurazione-auto" }]} ctas={[{ href: "/assicurazione-auto/richiesta", label: "Richiedi un preventivo" }, { href: "#coperture", label: "Le coperture", variant: "outline" }]} />
      <Section id="coperture" tone="white" labelledBy="cov-t">
        <SectionHeading id="cov-t" title="Le coperture in breve" description="Descrizioni generali: ciò che è coperto, i massimali, le franchigie e le esclusioni dipendono sempre dal singolo contratto e dal suo set informativo." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(COVERAGES).map(([k, c]) => (
          <Card key={k} className="p-4"><p className="font-bold">{c.label}{k === "rca" && <Badge tone="dark" className="ml-2">Obbligatoria</Badge>}</p><p className="mt-1 text-sm text-graphite">{c.text}</p></Card>
        ))}</div>
      </Section>
      <Section tone="mist" labelledBy="ruolo-t">
        <SectionHeading id="ruolo-t" title="Il ruolo di AutoGarage24" />
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <Card className="p-4"><p className="font-bold">Informiamo e mettiamo in contatto</p><p className="mt-1 text-graphite">Non proponiamo, non consigliamo e non concludiamo contratti assicurativi: queste attività sono riservate agli intermediari iscritti al RUI e alle compagnie autorizzate da IVASS.</p></Card>
          <Card className="p-4"><p className="font-bold">Solo partner verificati</p><p className="mt-1 text-graphite">Ogni partner è controllato dallo staff sul Registro Unico degli Intermediari o sull&apos;Albo delle imprese IVASS prima di poter ricevere richieste.</p></Card>
          <Card className="p-4"><p className="font-bold">Decidi tu a chi vanno i dati</p><p className="mt-1 text-graphite">I dati arrivano solo ai partner che selezioni, con consenso esplicito per ciascuno. Puoi ritirare la richiesta e cancellare i dati dalla piattaforma.</p></Card>
        </div>
      </Section>
      <Section id="partner" tone="white" labelledBy="par-t">
        <SectionHeading id="par-t" title="Partner verificati" description="Nessun preventivo è generato da AutoGarage24: prezzi e condizioni arrivano solo dai partner." />
        <Suspense fallback={<Skeleton className="h-32" />}><Partners /></Suspense>
      </Section>
      <FaqList id="faq" title="Domande frequenti" items={[
        { q: "Il servizio è gratuito?", a: "Sì, la richiesta è gratuita. L'eventuale polizza si sottoscrive direttamente con il partner, che ti consegna l'informativa precontrattuale e il set informativo." },
        { q: "Quali dati vengono inviati?", a: "Solo quelli necessari al preventivo che inserisci nel modulo (auto, coperture, provincia, contatto). La targa è facoltativa e non viene mai pubblicata." },
        { q: "Perché non vedo un confronto dei prezzi?", a: "Mostriamo solo preventivi inviati da partner verificati o da integrazioni ufficiali attive. Non stimiamo né simuliamo premi assicurativi." },
        { q: "Dove verifico un intermediario?", a: "Sul Registro Unico degli Intermediari (RUI) pubblicato da IVASS, cercando nome o numero di iscrizione." },
      ]} />
    </>
  );
}

async function Partners() {
  const supabase = createPublicClient();
  const { data } = supabase ? await supabase.from("insurance_partners").select("id, name, partner_type, rui_section, rui_number, ivass_company_code, website_url, coverages").order("name") : { data: null };
  if (!data?.length) return <EmptyState title="Nessun partner ancora attivo" description="Stiamo verificando i primi intermediari. Finché non ci sono partner attivi la richiesta di preventivo non è disponibile." />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map((p) => (
      <li key={p.id}><Card className="flex h-full flex-col gap-1 p-4">
        <p className="font-bold">{p.name}</p><p className="text-sm text-muted">{PARTNER_TYPES[p.partner_type]}</p>
        <p className="text-xs">{p.rui_number ? `RUI ${p.rui_section ?? ""} ${p.rui_number}` : p.ivass_company_code ? `Albo imprese IVASS ${p.ivass_company_code}` : ""}</p>
        <p className="text-sm">{p.coverages.map((c) => COVERAGES[c]?.label).filter(Boolean).join(" · ")}</p>
        {p.website_url && <a className="text-sm font-semibold text-orange-700 underline" href={p.website_url} target="_blank" rel="noreferrer noopener">Sito del partner</a>}
      </Card></li>))}</ul>
  );
}
