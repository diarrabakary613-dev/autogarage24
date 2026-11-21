import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { Suspense } from "react";
import { ClipboardCheck, Home, MapPinned, Scale, ShieldCheck, Truck } from "lucide-react";
import { FaqList, FeatureGrid, LandingHero, Steps } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { createPublicClient } from "@/lib/supabase/public";
import { TRANSPORT_SERVICES } from "@/lib/services/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/trasporto-auto", {
  title: "Trasporto auto e consegna a domicilio — preventivi da trasportatori verificati",
  description: "Trasporto con bisarca o carro attrezzi, auto non marcianti, consegna dell'auto acquistata. Confronta i preventivi dei trasportatori verificati di AutoGarage24.",
  alternates: { canonical: "/trasporto-auto" },
});
}

export default function TransportPage() {
  return (
    <>
      <LandingHero eyebrow="Trasporto auto" title="La tua auto, consegnata dove serve." subtitle="Descrivi il trasporto una volta sola e ricevi preventivi trasparenti dai trasportatori verificati che coprono le tue zone. Verbali fotografici di ritiro e consegna."
        crumbs={[{ name: "Trasporto auto", href: "/trasporto-auto" }]} ctas={[{ href: "/trasporto-auto/richiesta", label: "Richiedi preventivi" }, { href: "#trasportatori", label: "Trasportatori", variant: "outline" }]} />
      <FeatureGrid id="servizi" eyebrow="Servizi" title="Cosa puoi trasportare" columns={3} items={[
        { icon: Truck, title: "Bisarca e carro attrezzi", text: "Trasferimenti tra città, anche per auto non marcianti." },
        { icon: Home, title: "Consegna a domicilio", text: "Collega la richiesta all'auto che hai comprato su AutoGarage24." },
        { icon: MapPinned, title: "Programmato o urgente", text: "Indica il periodo e la flessibilità: i trasportatori propongono le date." },
        { icon: Scale, title: "Preventivi confrontabili", text: "Prezzo totale, date, costi aggiuntivi, condizioni e validità in un'unica vista." },
        { icon: ClipboardCheck, title: "Verbale di ritiro e consegna", text: "Foto, chilometri, danni già presenti e accessori, con data e ora." },
        { icon: ShieldCheck, title: "Trasportatori verificati", text: "Profilo e copertura dichiarata controllati dallo staff prima dell'attivazione." },
      ]} />
      <Steps id="come" title="Come funziona" steps={[
        { title: "Richiesta", text: "Ritiro, consegna, date e tipo di veicolo. Gli indirizzi restano privati fino alla scelta." },
        { title: "Preventivi", text: "I trasportatori attivi nelle regioni interessate rispondono con prezzo e date." },
        { title: "Scelta", text: "Accetti un preventivo: si apre la pratica con conversazione dedicata." },
        { title: "Ritiro e consegna", text: "Il trasportatore compila i verbali fotografici; tu confermi la consegna o segnali un problema." },
      ]} />
      <Section id="trasportatori" tone="white" labelledBy="tr-t">
        <SectionHeading id="tr-t" title="Trasportatori attivi" description="Solo profili verificati. Le coperture assicurative sono dichiarate dal trasportatore e controllate dallo staff." />
        <Suspense fallback={<Skeleton className="h-40" />}><Operators /></Suspense>
      </Section>
      <FaqList id="faq" title="Domande frequenti" items={[
        { q: "Come si paga?", a: "Il pagamento si concorda direttamente con il trasportatore scelto. AutoGarage24 non incassa, non trattiene somme e non offre depositi a garanzia." },
        { q: "Il veicolo è assicurato durante il trasporto?", a: "Dipende dal trasportatore: ogni preventivo indica se include la copertura dichiarata. Chiedi sempre i dettagli (compagnia, massimale, franchigia) prima di accettare." },
        { q: "Posso seguire il camion in tempo reale?", a: "No: la piattaforma mostra gli stati aggiornati dal trasportatore e i verbali con foto. Non mostriamo posizioni o percorsi stimati." },
      ]} />
      <Section tone="mist" labelledBy="pro-t">
        <div className="flex flex-col items-start gap-3">
          <h2 id="pro-t" className="text-2xl font-extrabold">Sei un trasportatore?</h2>
          <p className="max-w-2xl text-graphite">Ricevi richieste nelle regioni che servi e invia preventivi. Iscrizione gratuita durante il lancio.</p>
          <ButtonLink href="/registrati?ruolo=trasportatore">Registrati come trasportatore</ButtonLink>
        </div>
      </Section>
    </>
  );
}

async function Operators() {
  const supabase = createPublicClient();
  const { data } = supabase ? await supabase.from("transport_operators").select("profile_id, services, regions, insurance_declared, verified_at, professional_profiles(display_name, slug, city)").limit(60) : { data: null };
  if (!data?.length) return <EmptyState title="I trasportatori verificati compariranno qui" description="Stiamo verificando i primi trasportatori. Puoi già inviare una richiesta: la riceveranno appena attivi." />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map((o) => {
      const p = o.professional_profiles as unknown as { display_name: string; slug: string; city: string | null };
      return (
        <li key={o.profile_id}><Card className="flex h-full flex-col gap-1 p-4">
          <p className="font-bold"><Link className="hover:underline" href={`/professionisti/${p.slug}`}>{p.display_name}</Link></p>
          <p className="text-sm text-muted">{p.city}</p>
          <div className="flex flex-wrap gap-1"><Badge tone="success">Verificato</Badge>{o.insurance_declared && <Badge tone="neutral">Copertura dichiarata</Badge>}</div>
          <p className="text-sm">{o.services.map((s) => TRANSPORT_SERVICES[s]).join(" · ")}</p>
          <p className="text-xs text-muted">Regioni: {o.regions.join(", ")}</p>
        </Card></li>
      );
    })}</ul>
  );
}
