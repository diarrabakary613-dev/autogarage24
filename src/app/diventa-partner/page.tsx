import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { BadgeCheck, CalendarDays, Cog, FileText, MapPin, MessagesSquare, Package, UserRound, Wrench } from "lucide-react";
import { BETA_NOTE, FaqList, FeatureGrid, FormSection, LandingHero, Steps } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PartnerApplicationForm } from "@/components/partner/forms";
import { Alert } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import type { BusinessType } from "@/lib/crm";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/diventa-partner", {
  title: "Diventa partner — officine, meccanici e professionisti",
  description: "Officine, meccanici indipendenti, centri specializzati e venditori di ricambi: visibilità locale, richieste, preventivi e appuntamenti su AutoGarage24 a Milano. Iscrizione gratuita in Beta.",
  alternates: { canonical: "/diventa-partner" },
});
}

const TRACKS: { key: string; type: BusinessType; icon: typeof Wrench; title: string; text: string; register: string }[] = [
  { key: "officine", type: "officina", icon: Wrench, title: "Officine", text: "Servizi, marche trattate, orari e sede. Ricevi richieste di preventivo e appuntamento.", register: "/professionisti/registrazione-garage" },
  { key: "meccanici", type: "meccanico", icon: Cog, title: "Meccanici indipendenti", text: "Zone servite e modalità di intervento; l'indirizzo resta privato se lavori a domicilio.", register: "/professionisti/registrazione-meccanico" },
  { key: "centri", type: "centro_specializzato", icon: BadgeCheck, title: "Centri specializzati", text: "Gommisti, elettrauto, carrozzerie, centri revisione: valorizza la tua specializzazione.", register: "/professionisti/registrazione-garage" },
  { key: "altri", type: "venditore_ricambi", icon: Package, title: "Ricambi e altri professionisti", text: "Catalogo ricambi cercabile per codice OEM e per auto, o profilo per altri servizi auto.", register: "/professionisti/registrazione-ricambi" },
];

export default function BecomePartnerPage() {
  return (
    <>
      <LandingHero
        eyebrow="Per i professionisti"
        title="Fai conoscere la tua attività a nuovi automobilisti."
        subtitle="Un profilo professionale verificabile, richieste di preventivo e appuntamento ordinate, contatto diretto con chi cerca un professionista nella tua zona. Non promettiamo clienti: ti diamo gli strumenti per farti trovare."
        crumbs={[{ name: "Diventa partner", href: "/diventa-partner" }]}
        ctas={[{ href: "#percorsi", label: "Scegli il tuo percorso" }, { href: "#candidatura", label: "Parla con il team" }]}
      />
      <Section id="percorsi" tone="mist" labelledBy="percorsi-t">
        <SectionHeading id="percorsi-t" eyebrow="Percorsi" title="Quattro percorsi, una piattaforma" description="Puoi registrarti subito in autonomia oppure inviare una candidatura e farti aiutare dal team nella configurazione." />
        <ul className="grid gap-5 md:grid-cols-2">
          {TRACKS.map(({ key, icon: Icon, title, text, register }) => (
            <li key={key} id={key} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="grid size-11 place-items-center rounded-xl bg-orange text-ink"><Icon className="size-5" aria-hidden /></span>
              <h3 className="text-xl font-extrabold">{title}</h3>
              <p className="text-muted">{text}</p>
              <div className="mt-auto flex flex-wrap gap-2">
                <ButtonLink href={register} data-track="cta" data-track-label={`Registrazione ${title}`}>Registrati ora</ButtonLink>
                <ButtonLink href="#candidatura" variant="outline" data-track="cta" data-track-label={`Candidatura ${title}`}>Voglio essere aiutato</ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      </Section>
      <FeatureGrid id="cosa-offre" eyebrow="Cosa offre" title="Strumenti concreti, senza promesse" columns={3} items={[
        { icon: MapPin, title: "Visibilità locale", text: "Compari nelle ricerche per città, CAP, servizio e marca, anche sulla mappa." },
        { icon: FileText, title: "Richieste strutturate", text: "Problema, auto, foto e disponibilità del cliente arrivano già ordinati." },
        { icon: MessagesSquare, title: "Preventivi", text: "Manodopera, ricambi, tempi e validità: preventivi chiari e confrontabili." },
        { icon: CalendarDays, title: "Appuntamenti", text: "Proponi data e orario, il cliente conferma o chiede un'alternativa." },
        { icon: UserRound, title: "Profilo professionale", text: "Servizi, specializzazioni, orari dichiarati e certificazioni verificate." },
        { icon: BadgeCheck, title: "Verifica documentale", text: "Badge solo dopo il controllo dei documenti: fiducia dimostrabile." },
      ]} />
      <Steps id="onboarding" eyebrow="Onboarding" title="Come entri in AutoGarage24" steps={[
        { title: "Compili il modulo", text: "Candidatura o registrazione diretta." },
        { title: "Riceviamo la candidatura", text: "Il team la vede subito nel pannello." },
        { title: "Verifichiamo i dati", text: "Una telefonata o una visita per conoscerci." },
        { title: "Ricevi le istruzioni", text: "Accesso e guida passo passo." },
        { title: "Completi il profilo", text: "La checklist nella tua area ti dice cosa manca." },
        { title: "Pubblichi servizi o annunci", text: "E inizi a ricevere richieste." },
      ]} />
      <FormSection id="candidatura" eyebrow="Candidatura" title="Parla con il team AutoGarage24" description={<>Preferisci registrarti da solo? Usa i pulsanti dei percorsi. Per concessionari c&apos;è la pagina <Link className="underline" href="/partner">AutoGarage24 Partner</Link>.</>} side={<Alert tone="info">{BETA_NOTE}</Alert>}>
        <PartnerApplicationForm program="partner_professionisti" types={["officina", "meccanico", "centro_specializzato", "venditore_ricambi", "altro"]} idPrefix="pa-pro" />
      </FormSection>
      <FaqList id="faq" title="Domande dei professionisti" items={[
        { q: "È gratuito?", a: "Sì, durante la Beta. Nessun piano a pagamento viene attivato senza il tuo consenso esplicito." },
        { q: "Riceverò sicuramente nuovi clienti?", a: "Non possiamo garantirlo. La piattaforma è in fase di lancio a Milano: offriamo visibilità e strumenti, non risultati garantiti." },
        { q: "Come funzionano le recensioni?", a: "Un cliente può recensirti solo dopo una richiesta conclusa sulla piattaforma. Puoi rispondere una volta, pubblicamente, a ogni recensione." },
        { q: "Cosa sono i Founding Partners?", a: "Il programma per i primi 20 partner di Milano: assistenza iniziale, configurazione del profilo e canale diretto per dare feedback. Il badge è assegnato solo ai partner effettivamente ammessi." },
      ]} />
    </>
  );
}
