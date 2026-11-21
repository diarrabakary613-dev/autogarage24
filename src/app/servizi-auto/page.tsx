import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Cog, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ComingSoon } from "@/components/marketing/coming-soon";
import { HowItWorks } from "@/components/marketing/home-sections";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { SERVICES_FEATURES } from "@/content/pages";
import { CAR_SERVICES, SERVICES } from "@/content/services";

const s = SERVICES["servizi-auto"];

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/servizi-auto", {
  title: "Manutenzione e assistenza auto a Milano",
  description:
    "Tagliando, freni, pneumatici, diagnostica, climatizzazione e altri servizi: trova i professionisti per la manutenzione ordinaria e straordinaria della tua auto.",
  alternates: { canonical: s.href },
});
}

export default function CarServicesPage() {
  return (
    <>
      <PageHero
        eyebrow={s.eyebrow}
        title={s.title}
        description={s.description}
        crumbs={[{ name: s.name, href: s.href }]}
        serviceKey={s.key}
        actions={
          <>
            <ButtonLink href="/garages" size="lg" icon={<Wrench className="size-5" aria-hidden />}>
              Trova un&apos;officina
            </ButtonLink>
            <ButtonLink
              href="/meccanici"
              size="lg"
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10"
              icon={<Cog className="size-5" aria-hidden />}
            >
              Trova un meccanico
            </ButtonLink>
          </>
        }
      />

      <Section tone="mist" labelledBy="servizi-elenco">
        <SectionHeading
          id="servizi-elenco"
          eyebrow="Servizi"
          title="Di cosa ha bisogno la tua auto?"
          description="I servizi che potrai richiedere ai professionisti di AutoGarage24. Prezzi e disponibilità saranno indicati solo dai professionisti: non pubblichiamo stime inventate."
        />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CAR_SERVICES.map((svc) => (
            <li key={svc.name} className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-6 shadow-card">
              <h3 className="text-lg font-bold">{svc.name}</h3>
              <p className="text-sm leading-relaxed text-muted">{svc.description}</p>
            </li>
          ))}
        </ul>
        <ComingSoon
          className="mt-8"
          phase={7}
          title="Richieste di preventivo e appuntamento"
          description="Potrai scegliere un servizio, vedere i professionisti che lo offrono e inviare una richiesta strutturata, seguendone lo stato dalla tua area personale."
          features={SERVICES_FEATURES}
          action={
            <ButtonLink href="/registrati" variant="outline">
              Crea un account
            </ButtonLink>
          }
        />
      </Section>

      <HowItWorks id="come-funziona-servizi" />
    </>
  );
}
