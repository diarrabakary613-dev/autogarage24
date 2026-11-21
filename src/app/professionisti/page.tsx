import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, Car, Cog, LayoutDashboard, Megaphone, MessagesSquare, Package, LifeBuoy, Truck, ClipboardCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type ProfessionalRole } from "@/lib/auth/roles";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/professionisti", {
  title: "Per i professionisti dell'automobile",
  description:
    "Officine, meccanici indipendenti, venditori di auto e di ricambi: presenta la tua attività su AutoGarage24 e raggiungi nuovi clienti a Milano e provincia. Iscrizione gratuita.",
  alternates: { canonical: "/professionisti" },
});
}

const PROFILES: { role: Exclude<ProfessionalRole, "intermediario_assicurativo">; icon: typeof Building2; cta: string }[] = [
  { role: "officina", icon: Building2, cta: "Registra la mia officina" },
  { role: "meccanico", icon: Cog, cta: "Registrati come meccanico" },
  { role: "venditore_auto", icon: Car, cta: "Registrati come venditore" },
  { role: "venditore_ricambi", icon: Package, cta: "Registrati come venditore" },
  { role: "soccorritore", icon: LifeBuoy, cta: "Registrati come soccorritore" },
  { role: "trasportatore", icon: Truck, cta: "Registrati come trasportatore" },
  { role: "centro_revisione", icon: ClipboardCheck, cta: "Registra il centro revisioni" },
];

const BENEFITS = [
  { icon: Megaphone, title: "Visibilità", text: "Un profilo pubblico con servizi, specializzazioni, zona e contatti." },
  { icon: MessagesSquare, title: "Richieste strutturate", text: "Preventivi, appuntamenti e richieste di informazioni in un unico posto." },
  { icon: LayoutDashboard, title: "Dashboard", text: "Gestisci annunci, servizi, richieste e messaggi dalla tua area." },
  { icon: BadgeCheck, title: "Fiducia verificabile", text: "Badge di verifica assegnati solo dopo un controllo reale dei documenti." },
];

export default function ProfessionalsPage() {
  return (
    <>
      <PageHero
        eyebrow="Per i professionisti"
        title="Sei un professionista dell'automobile?"
        description="Fai conoscere la tua attività, raggiungi nuovi clienti e sviluppa la tua presenza online con AutoGarage24. Nella fase iniziale l'iscrizione e il profilo professionale sono gratuiti."
        crumbs={[{ name: "Professionisti", href: "/professionisti" }]}
        actions={
          <ButtonLink href="#scegli-profilo" size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>
            Scegli il tuo profilo
          </ButtonLink>
        }
      />

      <Section id="scegli-profilo" tone="mist" labelledBy="profili-title">
        <SectionHeading id="profili-title" eyebrow="Registrazione" title="Che tipo di attività hai?" />
        <ul className="grid gap-5 md:grid-cols-2">
          {PROFILES.map(({ role, icon: Icon, cta }) => (
            <li key={role} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-7 shadow-card">
              <span className="grid size-12 place-items-center rounded-xl bg-orange text-white">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-xl font-extrabold">{ROLE_LABELS[role]}</h3>
              <p className="text-muted">{ROLE_DESCRIPTIONS[role]}</p>
              <ButtonLink href={`/registrati?ruolo=${role}`} className="mt-auto w-full sm:w-fit">
                {cta}
              </ButtonLink>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted">
          Hai già un account?{" "}
          <Link href="/accedi" className="font-semibold text-orange-700 hover:underline">
            Accedi alla tua area
          </Link>
        </p>
      </Section>

      <Section tone="white" labelledBy="vantaggi-title">
        <SectionHeading id="vantaggi-title" eyebrow="Cosa offre AutoGarage24" title="Strumenti pensati per chi lavora con le auto" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-orange-50 text-orange-700">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 rounded-xl bg-mist p-5 text-sm leading-relaxed text-graphite">
          <strong>Trasparenza sulle tempistiche:</strong> oggi puoi creare il tuo account professionale. Il
          completamento del profilo pubblico, la verifica dei documenti, la pubblicazione di annunci e servizi e la
          gestione delle richieste vengono attivati progressivamente nelle prossime fasi di sviluppo.
        </p>
      </Section>
    </>
  );
}
