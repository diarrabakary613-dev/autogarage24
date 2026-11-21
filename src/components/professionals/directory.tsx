import { Suspense } from "react";
import { ArrowRight, Search } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { JsonLd } from "@/components/marketing/json-ld";
import type { ServiceArea } from "@/content/services";
import { ProSearch } from "./pro-search";

type Content = { title: string; description: string; steps: { title: string; text: string }[]; pros: string[]; drivers?: string[]; faq: { q: string; a: string }[] };

/** Pagina principale di un marketplace di professionisti (officine o meccanici). */
export function ProDirectory({ service, type, content, searchParams, registerHref, searchCta, registerCta }: {
  service: ServiceArea; type: "officina" | "meccanico"; content: Content; searchParams: Promise<Record<string, string | string[] | undefined>>;
  registerHref: string; searchCta: string; registerCta: string;
}) {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: content.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero
        eyebrow={service.eyebrow}
        title={content.title}
        description={content.description}
        crumbs={[{ name: service.name, href: service.href }]}
        serviceKey={service.key}
        actions={<>
          <ButtonLink href="#cerca" size="lg" icon={<Search className="size-5" aria-hidden />}>{searchCta}</ButtonLink>
          <ButtonLink href={registerHref} size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10">{registerCta}</ButtonLink>
        </>}
      />
      <Section id="cerca" tone="mist" labelledBy="cerca-t">
        <SectionHeading id="cerca-t" eyebrow="Milano e provincia" title={type === "officina" ? "Officine sul marketplace" : "Professionisti sulla piattaforma"} />
        <Suspense fallback={<Skeleton className="h-[600px] rounded-2xl" />}><Results type={type} base={service.href} searchParams={searchParams} register={registerHref} /></Suspense>
      </Section>
      <Section tone="white" labelledBy="how-t">
        <SectionHeading id="how-t" eyebrow="Come funziona" title="Dalla ricerca all'appuntamento, in modo trasparente" />
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {content.steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-3 rounded-2xl border border-line p-6 shadow-card">
              <span className="font-display text-3xl font-extrabold text-orange">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-bold">{s.title}</h3><p className="text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section tone="ink" labelledBy="pro-t">
        <div className="grid gap-10 lg:grid-cols-2">
          {content.drivers && (
            <div>
              <SectionHeading id="drv-t" eyebrow="Per gli automobilisti" title="Perché usare AutoGarage24" inverted />
              <ul className="flex flex-col gap-2 text-white/80">{content.drivers.map((d) => <li key={d}>• {d}</li>)}</ul>
            </div>
          )}
          <div>
            <SectionHeading id="pro-t" eyebrow="Per i professionisti" title={type === "officina" ? "Porta la tua officina online" : "Fatti trovare da chi ha bisogno"} inverted />
            <ul className="flex flex-col gap-2 text-white/80">{content.pros.map((d) => <li key={d}>• {d}</li>)}</ul>
            <ButtonLink href={registerHref} className="mt-6" icon={<ArrowRight className="size-4" aria-hidden />}>{registerCta}</ButtonLink>
          </div>
        </div>
      </Section>
      <Section tone="mist" labelledBy="faq-t">
        <SectionHeading id="faq-t" eyebrow="Domande frequenti" title="Le risposte essenziali" />
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {content.faq.map((f) => <details key={f.q} className="rounded-2xl border border-line bg-white p-5 shadow-card"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-3 text-graphite">{f.a}</p></details>)}
        </div>
      </Section>
    </>
  );
}

async function Results({ type, base, searchParams, register }: { type: "officina" | "meccanico"; base: string; searchParams: Promise<Record<string, string | string[] | undefined>>; register: string }) {
  return <ProSearch type={type} base={base} params={await searchParams} register={register} />;
}
