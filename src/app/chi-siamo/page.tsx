import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/chi-siamo", {
  title: "Chi siamo",
  description:
    "AutoGarage24 è un ecosistema digitale di servizi automobilistici che mette in contatto automobilisti, neopatentati e professionisti a Milano e provincia.",
  alternates: { canonical: "/chi-siamo" },
});
}

const VALUES = [
  { title: "Trasparenza", text: "Mostriamo solo dati reali. Se un'informazione manca, lo diciamo." },
  { title: "Fiducia", text: "Badge e controlli hanno sempre una data e un responsabile." },
  { title: "Semplicità", text: "Trovare un'auto o un professionista deve richiedere pochi passaggi." },
  { title: "Competenza", text: "Lavoriamo a contatto diretto con officine, meccanici e venditori." },
];

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Chi siamo"
        title="Un ecosistema di servizi automobilistici, non un semplice sito di annunci."
        description="AutoGarage24 nasce per rendere più semplice e trasparente tutto ciò che riguarda la vita di un'automobile: dalla prima auto di un neopatentato alla manutenzione di tutti i giorni."
        crumbs={[{ name: "Chi siamo", href: "/chi-siamo" }]}
      />
      <Section tone="white" labelledBy="missione-title">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="missione-title" eyebrow="La missione" title="Mettere in contatto le persone giuste." className="mb-6 sm:mb-8" />
            <div className="flex flex-col gap-4 text-lg leading-relaxed text-graphite">
              <p>
                Chi possiede un&apos;automobile, chi cerca la prima auto, le officine, i meccanici indipendenti e i
                venditori di auto e ricambi hanno bisogno gli uni degli altri. AutoGarage24 li riunisce in un unico
                posto.
              </p>
              <p>
                Partiamo da Milano e provincia, visitando di persona officine, concessionari e venditori, con
                l&apos;obiettivo di estendere il servizio ad altre città italiane.
              </p>
              <p className="text-base text-muted">
                AutoGarage24 mette in contatto utenti e professionisti: non vende direttamente veicoli e non
                garantisce le auto o gli interventi dei professionisti, salvo servizi che lo prevedano espressamente.
              </p>
            </div>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {VALUES.map((v) => (
              <li key={v.title} className="rounded-2xl border border-line bg-mist p-6">
                <h3 className="mb-1.5 text-lg font-bold">{v.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{v.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/auto-per-neopatentati">Scopri AutoGarage24 Neopatentati</ButtonLink>
          <ButtonLink href="/contatti" variant="outline">
            Contattaci
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
