import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Building2, Flag, LifeBuoy, MessageSquareWarning } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { PageHero } from "@/components/marketing/page-hero";
import { Section } from "@/components/marketing/section";
import { FaqList } from "@/components/marketing/landing";
import { SITE } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/assistenza", {
    title: "Assistenza e domande frequenti",
    description:
      "Come ottenere aiuto su AutoGarage24: richieste di assistenza, segnalazione di annunci e utenti, reclami, supporto ai partner e risposte alle domande più comuni.",
    alternates: { canonical: "/assistenza" },
  });
}

const CHANNELS = [
  {
    icon: LifeBuoy,
    title: "Richiesta di assistenza",
    text: "Dalla tua area personale apri una richiesta scegliendo l'argomento. Ogni richiesta ha una conversazione dedicata con lo staff, dove puoi rispondere e allegare immagini o documenti.",
    href: "/dashboard/supporto",
    cta: "Apri una richiesta",
  },
  {
    icon: Flag,
    title: "Segnalare un annuncio, un profilo o un utente",
    text: "In ogni annuncio di auto o ricambi, offerta, profilo professionale e conversazione trovi il pulsante «Segnala». La segnalazione arriva allo staff, che la esamina e può sospendere il contenuto.",
    href: "/auto-usate",
    cta: "Vai agli annunci",
  },
  {
    icon: MessageSquareWarning,
    title: "Reclami",
    text: "Se non sei soddisfatto di come è stata gestita una richiesta, un contenuto o una segnalazione, apri una richiesta di assistenza con l'argomento «Reclamo»: viene trattata con priorità e riceve una risposta scritta.",
    href: "/dashboard/supporto",
    cta: "Invia un reclamo",
  },
  {
    icon: Building2,
    title: "Supporto per officine e partner",
    text: "Profilo, verifiche, annunci, preventivi, prenotazioni, Business Center: apri una richiesta con l'argomento «Supporto partner». Se non sei ancora registrato, parti dalla pagina per i professionisti.",
    href: "/professionisti",
    cta: "Area professionisti",
  },
];

const FAQ = [
  { q: "AutoGarage24 vende automobili o esegue riparazioni?", a: "No. AutoGarage24 mette in contatto automobilisti e professionisti. Vendite, riparazioni e pagamenti avvengono direttamente tra te e il professionista o il venditore." },
  { q: "Come contatto un venditore o un'officina?", a: "Dalla scheda dell'auto o dal profilo del professionista invii una richiesta di informazioni, di preventivo o di appuntamento. La conversazione prosegue nei Messaggi della tua area personale. Serve un account gratuito." },
  { q: "Come funziona la verifica per neopatentati?", a: "Ogni auto viene confrontata con le regole in vigore per i neopatentati usando i dati tecnici del veicolo (potenza e rapporto potenza/tara). Se un dato manca, l'auto risulta «da verificare»: controlla sempre la carta di circolazione prima dell'acquisto." },
  { q: "Gli annunci sono controllati?", a: "Gli annunci e i profili professionali sono pubblicati solo dopo l'approvazione dello staff. I badge di verifica indicano cosa è stato controllato e quando." },
  { q: "Le recensioni sono vere?", a: "Si può recensire solo dopo un servizio completato o un acquisto confermato da entrambe le parti. Il professionista può rispondere ma non modificare o cancellare la recensione." },
  { q: "Come cambio o cancello i miei dati?", a: "Da Impostazioni › Privacy puoi scaricare una copia dei tuoi dati e chiedere la cancellazione dell'account. Le richieste vengono gestite dallo staff nel rispetto degli obblighi di legge." },
  { q: "Ho dimenticato la password.", a: "Usa «Password dimenticata?» nella pagina di accesso: ricevi un'email con il link per impostarne una nuova." },
  { q: "Sono un'officina: quanto costa entrare?", a: "La registrazione e il profilo sono gratuiti durante il lancio a Milano. Eventuali piani a pagamento saranno comunicati prima di essere attivati e non sono obbligatori." },
];

export default function HelpPage() {
  const hasDirect = Boolean(SITE.contactEmail || SITE.contactPhone);
  return (
    <>
      <PageHero
        eyebrow="Assistenza"
        title="Come possiamo aiutarti?"
        description="Richieste di assistenza, segnalazioni, reclami e supporto per i professionisti: ecco come raggiungere lo staff di AutoGarage24."
        crumbs={[{ name: "Assistenza", href: "/assistenza" }]}
      />
      <Section tone="mist" labelledBy="canali-t">
        <h2 id="canali-t" className="sr-only">Canali di assistenza</h2>
        <div className="grid gap-5 md:grid-cols-2">
          {CHANNELS.map((c) => (
            <div key={c.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
                <c.icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-extrabold">{c.title}</h3>
              <p className="text-muted">{c.text}</p>
              <ButtonLink href={c.href} variant="outline" className="mt-auto w-fit">{c.cta}</ButtonLink>
            </div>
          ))}
        </div>
        {!hasDirect && (
          <Alert tone="info" className="mt-6">
            Email e telefono dell&apos;assistenza saranno pubblicati qui prima del lancio pubblico. Nel frattempo usa la richiesta di assistenza dalla tua area personale.
          </Alert>
        )}
      </Section>
      <FaqList id="faq" title="Le domande più comuni" items={FAQ} />
    </>
  );
}
