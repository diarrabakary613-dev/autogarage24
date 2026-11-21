import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { Suspense } from "react";
import { BatteryCharging, KeyRound, LifeBuoy, ShieldCheck, Truck, Wrench } from "lucide-react";
import { FaqList, FeatureGrid, LandingHero, Steps } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { EmergencyNotice } from "@/components/services/emergency-notice";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { createPublicClient } from "@/lib/supabase/public";
import { ROADSIDE_SERVICES } from "@/lib/services/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/soccorso-stradale", {
  title: "Assistenza stradale a Milano — soccorso, traino, batteria, foratura",
  description: "Chiedi assistenza stradale agli operatori verificati di AutoGarage24: carro attrezzi, avviamento batteria, cambio gomma, apertura veicolo. Preventivo prima dell'intervento.",
  alternates: { canonical: "/soccorso-stradale" },
});
}

export default function RoadsidePage() {
  return (
    <>
      <LandingHero eyebrow="Assistenza stradale" title="Auto ferma? Chiedi aiuto in un minuto." subtitle="Descrivi il problema, condividi la posizione solo se vuoi e ricevi i preventivi degli operatori verificati disponibili ora. Paghi solo l'operatore che scegli, alle sue condizioni."
        crumbs={[{ name: "Assistenza stradale", href: "/soccorso-stradale" }]} ctas={[{ href: "/soccorso-stradale/richiesta", label: "HO BISOGNO DI ASSISTENZA" }, { href: "#operatori", label: "Operatori attivi", variant: "outline" }]} />
      <Section tone="white" labelledBy="emergenza-t">
        <h2 id="emergenza-t" className="sr-only">Emergenze</h2>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <EmergencyNotice />
          <Link href="/soccorso-stradale/richiesta" className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-orange p-8 text-center text-ink shadow-card hover:brightness-95">
            <LifeBuoy className="size-10" aria-hidden />
            <span className="text-2xl font-extrabold">HO BISOGNO DI ASSISTENZA</span>
            <span className="text-sm font-semibold">Richiesta in 3 passaggi · gratuita</span>
          </Link>
        </div>
      </Section>
      <FeatureGrid id="servizi" eyebrow="Interventi" title="Cosa puoi chiedere" columns={3} tone="mist" items={[
        { icon: Truck, title: "Traino e carro attrezzi", text: "Auto incidentata o non marciante, trasferimento in officina o recupero." },
        { icon: BatteryCharging, title: "Batteria e avviamento", text: "Avviamento di emergenza o sostituzione della batteria sul posto." },
        { icon: Wrench, title: "Foratura e soccorso meccanico", text: "Cambio gomma, piccoli guasti riparabili sul posto, rifornimento." },
        { icon: KeyRound, title: "Apertura veicolo", text: "Chiavi chiuse in auto: apertura senza danni da operatori abilitati." },
        { icon: ShieldCheck, title: "Operatori verificati", text: "Ogni operatore è controllato dallo staff prima di ricevere richieste." },
        { icon: LifeBuoy, title: "Fino alla riparazione", text: "Dopo il soccorso puoi chiedere i preventivi alle officine con un clic." },
      ]} />
      <Steps id="come" title="Come funziona" steps={[
        { title: "Descrivi", text: "Tipo di problema, auto e zona. La posizione GPS è facoltativa e richiede il tuo consenso." },
        { title: "Scegli", text: "Vedi solo operatori che hanno dichiarato disponibilità adesso e coprono la tua zona." },
        { title: "Confronta", text: "Ogni operatore invia prezzo, tempo di arrivo stimato e condizioni. Nessun costo è definitivo finché non accetti." },
        { title: "Segui l'intervento", text: "Stati aggiornati dall'operatore e, se la condivide, la sua posizione durante il tragitto." },
      ]} />
      <Section id="operatori" tone="white" labelledBy="op-t">
        <SectionHeading id="op-t" eyebrow="Milano e provincia" title="Operatori attivi sulla piattaforma" description="Solo operatori verificati dallo staff. «Disponibile ora» compare solo se l'operatore lo ha dichiarato e la dichiarazione non è scaduta." />
        <Suspense fallback={<Skeleton className="h-40" />}><Operators /></Suspense>
      </Section>
      <FaqList id="faq" title="Domande frequenti" items={[
        { q: "Quanto costa?", a: "La richiesta è gratuita. Il prezzo dell'intervento è quello del preventivo dell'operatore che accetti; il pagamento avviene direttamente con lui, non tramite AutoGarage24." },
        { q: "Chi vede la mia posizione?", a: "Gli operatori contattati vedono solo la zona approssimata (circa 1 km). Indirizzo esatto, coordinate e telefono arrivano solo all'operatore di cui accetti il preventivo e smettono di essere visibili a intervento chiuso." },
        { q: "Ho l'assistenza stradale nella polizza o dal costruttore.", a: "In quel caso chiama prima il numero della tua polizza o del costruttore: l'intervento potrebbe essere già coperto." },
        { q: "Sono un soccorritore: come mi iscrivo?", a: "Registrati come professionista, completa il profilo aziendale e attiva il servizio di soccorso dalla tua area. Lo staff verifica i dati prima dell'attivazione." },
      ]} />
      <Section tone="mist" labelledBy="pro-t">
        <div className="flex flex-col items-start gap-3">
          <h2 id="pro-t" className="text-2xl font-extrabold">Offri assistenza stradale?</h2>
          <p className="max-w-2xl text-graphite">Ricevi richieste dalla tua zona solo quando ti dichiari disponibile. Nessun costo di iscrizione durante il lancio a Milano.</p>
          <ButtonLink href="/registrati?ruolo=soccorritore">Registrati come soccorritore</ButtonLink>
        </div>
      </Section>
    </>
  );
}

async function Operators() {
  const supabase = createPublicClient();
  const { data } = supabase ? await supabase.rpc("public_roadside_operators", {}) : { data: null };
  if (!data?.length) return <EmptyState title="Gli operatori verificati compariranno qui" description="Stiamo verificando i primi soccorritori di Milano. Puoi già inviare una richiesta: vedrai gli operatori disponibili in quel momento, se ce ne sono." />;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.map((o) => (
      <li key={o.profile_id}><Card className="flex h-full flex-col gap-1 p-4">
        <p className="font-bold"><Link className="hover:underline" href={`/professionisti/${o.slug}`}>{o.display_name}</Link></p>
        <p className="text-sm text-muted">{o.city}</p>
        <div className="flex flex-wrap gap-1">{o.h24 ? <Badge tone="success">H24 dichiarato</Badge> : o.available_now ? <Badge tone="success">Disponibile ora</Badge> : <Badge tone="neutral">Non disponibile ora</Badge>}{o.verified && <Badge tone="dark">Azienda verificata</Badge>}</div>
        <p className="text-sm">{o.services.map((s) => ROADSIDE_SERVICES[s] ?? s).join(" · ")}</p>
        {o.hours_text && <p className="text-xs text-muted">Orari dichiarati: {o.hours_text}</p>}
      </Card></li>))}</ul>
  );
}
