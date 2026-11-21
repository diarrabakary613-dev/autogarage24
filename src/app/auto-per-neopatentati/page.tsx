import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { connection } from "next/server";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, CircleDashed, ClipboardCheck, Eye, FileSearch, MinusCircle, Search, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { JsonLd } from "@/components/marketing/json-ld";
import { ListingSearch } from "@/components/marketplace/listing-search";
import { ListingCard } from "@/components/marketplace/listing-card";
import { NeoCalculator } from "@/components/neopatentati/calculator";
import { NEOPATENTATI_PAGE } from "@/content/pages";
import { NEO_FAQ } from "@/content/neopatentati";
import { SERVICES } from "@/content/services";
import { getPublishedRuleVersions } from "@/lib/data/neo";
import { favoriteListingIds, fieldManagerListings, latestListings } from "@/lib/data/listings";

const s = SERVICES["auto-per-neopatentati"];
const c = NEOPATENTATI_PAGE;

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/auto-per-neopatentati", {
  title: "Auto per neopatentati: verifica compatibilità e annunci a Milano",
  description:
    "Trova la tua prima auto: annunci con verifica della compatibilità per neopatentati basata su potenza e rapporto potenza/tara, calcolatore gratuito e confronto tra automobili.",
  alternates: { canonical: s.href },
  keywords: ["auto per neopatentati", "macchine per neopatentati", "prima auto neopatentati", "auto usate per neopatentati", "verifica auto neopatentati", "auto compatibili neopatentati"],
});
}

const STATUS_ICONS = [CheckCircle2, Eye, Wrench, CircleDashed, MinusCircle];

export default function NeopatentatiPage(props: PageProps<"/auto-per-neopatentati">) {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: NEO_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero
        eyebrow={s.eyebrow}
        title="La tua prima auto merita una scelta intelligente."
        description="Trova la tua prima automobile, confronta le caratteristiche e verifica la compatibilità con le regole per neopatentati."
        crumbs={[{ name: s.name, href: s.href }]}
        serviceKey={s.key}
        actions={
          <>
            <ButtonLink href="#ricerca" size="lg" icon={<Search className="size-5" aria-hidden />}>Trova la mia prima auto</ButtonLink>
            <ButtonLink href="#calcolatore" size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10" icon={<Calculator className="size-5" aria-hidden />}>
              Verifica un&apos;auto
            </ButtonLink>
          </>
        }
      />

      <Section id="calcolatore" tone="white" labelledBy="neo-calc">
        <SectionHeading id="neo-calc" eyebrow="Calcolatore" title="Questa auto posso guidarla?" description="Inserisci la data in cui hai preso la patente e i dati tecnici dell'auto: ti diciamo quali limiti si applicano e perché." />
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}><Calc /></Suspense>
      </Section>

      <Section id="ricerca" tone="mist" labelledBy="neo-search">
        <SectionHeading id="neo-search" eyebrow="Marketplace" title="Automobili per neopatentati" description="Annunci reali con verifica automatica sulla regola in vigore per chi prende la patente oggi. Puoi includere anche quelle da verificare." />
        <Suspense fallback={<Skeleton className="h-[600px] rounded-2xl" />}><SearchResults searchParams={props.searchParams} /></Suspense>
      </Section>

      <Suspense fallback={null}><Highlights /></Suspense>

      <Section id="come-funziona" tone="white" labelledBy="neo-how">
        <SectionHeading id="neo-how" eyebrow="Il servizio" title="Come funziona la verifica" />
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {c.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="font-display text-3xl font-extrabold text-orange">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="ink" labelledBy="neo-rules">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading id="neo-rules" eyebrow="Compatibilità normativa" title={c.rules.title} inverted className="mb-6 sm:mb-8" />
            <div className="flex flex-col gap-4 leading-relaxed text-white/75">{c.rules.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
          </div>
          <div className="flex flex-col gap-3">
            {c.rules.outcomes.map((o) => (
              <div key={o.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <p className="mb-1 font-bold text-white">{o.label}</p>
                <p className="text-sm leading-relaxed text-white/65">{o.text}</p>
              </div>
            ))}
            <Alert tone="warning" className="mt-2">{c.rules.disclaimer}</Alert>
          </div>
        </div>
      </Section>

      <Section tone="white" labelledBy="neo-check">
        <SectionHeading id="neo-check" eyebrow="Trasparenza" title="Controllo AutoGarage24" description={c.inspection.intro} />
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="rounded-2xl border border-line bg-mist p-6 sm:p-8">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold"><ClipboardCheck className="size-5 text-orange-700" aria-hidden /> Cosa contiene la scheda</h3>
            <ul className="grid gap-2 text-sm text-graphite">{c.inspection.fields.map((f) => <li key={f} className="flex items-start gap-2"><FileSearch className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />{f}</li>)}</ul>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-bold">Gli esiti possibili di ogni controllo</h3>
            <ul className="flex flex-col gap-3">
              {c.inspection.statuses.map((st, i) => {
                const Icon = STATUS_ICONS[i] ?? CircleDashed;
                return <li key={st.label} className="flex gap-4 rounded-xl border border-line p-4"><Icon className="mt-0.5 size-5 shrink-0 text-orange-700" aria-hidden /><div><p className="font-semibold text-ink">{st.label}</p><p className="text-sm text-muted">{st.text}</p></div></li>;
              })}
            </ul>
            <p className="mt-5 flex items-start gap-2 text-sm text-muted"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />{c.inspection.disclaimer}</p>
          </div>
        </div>
      </Section>

      <Section tone="mist" labelledBy="neo-faq">
        <SectionHeading id="neo-faq" eyebrow="Domande frequenti" title="Neopatentati: le risposte essenziali" />
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {NEO_FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-white p-5 shadow-card">
              <summary className="cursor-pointer font-semibold">{f.q}</summary>
              <p className="mt-3 leading-relaxed text-graphite">{f.a}</p>
            </details>
          ))}
          <p className="text-sm text-muted">Fonti e dettagli: <a className="underline" href="https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2024-11-25;177" target="_blank" rel="noopener noreferrer">Legge 25 novembre 2024, n. 177 (Normattiva)</a>. Le informazioni non costituiscono consulenza legale.</p>
        </div>
      </Section>

      <Section tone="white" labelledBy="neo-cta">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-orange p-8 text-ink sm:p-12 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="neo-cta" className="text-3xl font-extrabold text-ink">Vendi auto adatte ai neopatentati?</h2>
            <p className="mt-2 text-ink/85">Pubblica le tue automobili con potenza e tara: la verifica viene calcolata in automatico e mostrata ai neopatentati che cercano la prima auto.</p>
          </div>
          <ButtonLink href="/registrati?ruolo=venditore_auto" variant="secondary" size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>Registrati come venditore</ButtonLink>
        </div>
      </Section>
    </>
  );
}

async function Calc() {
  await connection();
  const versions = await getPublishedRuleVersions();
  return <NeoCalculator versions={versions} today={new Date().toISOString().slice(0, 10)} />;
}

async function SearchResults({ searchParams }: { searchParams: PageProps<"/auto-per-neopatentati">["searchParams"] }) {
  return <ListingSearch base="/auto-per-neopatentati" params={await searchParams} neoMode />;
}

async function Highlights() {
  const [compatible, recent, selected, favs] = await Promise.all([latestListings(3, ["compatibile"]), latestListings(3, ["compatibile", "da_verificare"]), fieldManagerListings(3), favoriteListingIds()]);
  const groups = [
    { id: "neo-compatibili", title: "Compatibili con la regola attuale", items: compatible },
    { id: "neo-recenti", title: "Aggiunte di recente", items: recent },
    { id: "neo-selezione", title: "Selezionate da AutoGarage24", items: selected, note: "Automobili raccolte direttamente dal fondatore presso venditori che hanno autorizzato la pubblicazione." },
  ].filter((g) => g.items.length > 0);
  if (groups.length === 0) return null;
  return (
    <Section tone="white" labelledBy="neo-highlights">
      <h2 id="neo-highlights" className="sr-only">In evidenza</h2>
      <div className="flex flex-col gap-12">
        {groups.map((g) => (
          <div key={g.id}>
            <h3 className="mb-1 text-2xl font-extrabold">{g.title}</h3>
            {g.note && <p className="mb-4 text-sm text-muted">{g.note}</p>}
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{g.items.map((i) => <li key={i.id}><ListingCard item={i} favorite={favs ? favs.has(i.id!) : false} showNeo /></li>)}</ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
