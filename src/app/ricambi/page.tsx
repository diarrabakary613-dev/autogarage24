import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { QuickSearchBar } from "@/components/professionals/quick-search";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { Pagination } from "@/components/ui/misc";
import { PageHero } from "@/components/marketing/page-hero";
import { Section, SectionHeading } from "@/components/marketing/section";
import { JsonLd } from "@/components/marketing/json-ld";
import { PartCard, type PartCardData } from "@/components/parts/part-card";
import { BRANDS } from "@/config/brands";
import { SERVICES } from "@/content/services";
import { PARTS_FAQ } from "@/content/parts";
import { getPartCategories, parsePartFilters, PART_PAGE, PART_SORTS, partHref, searchParts, type PartFilters } from "@/lib/data/parts";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PART_CONDITION_LABELS } from "@/lib/labels";

const s = SERVICES.ricambi;

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/ricambi", {
  title: "Ricambi auto nuovi e usati: cerca per codice OEM, marca e modello",
  description: "Cerca ricambi auto nuovi, usati e ricondizionati a Milano: per categoria, codice OEM o del produttore, marca e modello della tua auto. Contatta i venditori e richiedi un preventivo.",
  alternates: { canonical: s.href },
  keywords: ["ricambi auto", "ricambi auto usati", "ricambi auto online", "ricambi per marca e modello", "codice OEM", "ricambi auto Milano"],
});
}

export default function PartsPage(props: PageProps<"/ricambi">) {
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: PARTS_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />
      <PageHero
        eyebrow={s.eyebrow}
        title="Il ricambio giusto per la tua auto, senza perdere tempo."
        description="Cerca ricambi nuovi e usati, confronta i venditori e trova il componente adatto alla tua automobile."
        crumbs={[{ name: s.name, href: s.href }]}
        serviceKey={s.key}
        actions={<>
          <ButtonLink href="#cerca" size="lg" icon={<Search className="size-5" aria-hidden />}>Cerca un ricambio</ButtonLink>
          <ButtonLink href="/professionisti/registrazione-ricambi" size="lg" variant="outline" className="border-white/25 bg-transparent text-white hover:border-white hover:bg-white/10">Vendi ricambi</ButtonLink>
        </>}
      />
      <Section id="cerca" tone="mist" labelledBy="cerca-t">
        <SectionHeading id="cerca-t" eyebrow="Marketplace ricambi" title="Cerca per nome, codice o automobile" />
        <Suspense fallback={<Skeleton className="h-[600px] rounded-2xl" />}><Results searchParams={props.searchParams} /></Suspense>
      </Section>
      <Suspense fallback={null}><Categories /></Suspense>
      <Section tone="white" labelledBy="how-t">
        <SectionHeading id="how-t" eyebrow="Come funziona" title="Compatibilità trasparente, contatto diretto" />
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            ["Cerca", "Per codice OEM o del produttore (anche con trattini o spazi), per categoria o selezionando un'auto del tuo garage virtuale."],
            ["Controlla la compatibilità", "Ti diciamo se è «verificata», «potenziale» o «da verificare», e perché. Marca e modello da soli non bastano."],
            ["Contatta il venditore", "Chiedi informazioni o un preventivo. Nessun pagamento avviene su AutoGarage24: prezzo e consegna li concordi direttamente."],
          ].map(([t, d], i) => <li key={t} className="flex flex-col gap-2 rounded-2xl border border-line p-6 shadow-card"><span className="font-display text-3xl font-extrabold text-orange">0{i + 1}</span><h3 className="text-lg font-bold">{t}</h3><p className="text-sm text-muted">{d}</p></li>)}
        </ol>
      </Section>
      <Section tone="ink" labelledBy="sell-t">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 id="sell-t" className="text-3xl font-extrabold text-white">Sei un ricambista o un rivenditore?</h2>
            <p className="mt-2 text-white/70">Profilo commerciale, pubblicazione con codici OEM e compatibilità, richieste e preventivi in un&apos;unica dashboard. Iscrizione gratuita.</p>
          </div>
          <ButtonLink href="/professionisti/registrazione-ricambi" size="lg" icon={<ArrowRight className="size-5" aria-hidden />}>Registrati come venditore</ButtonLink>
        </div>
      </Section>
      <Section tone="mist" labelledBy="faq-t">
        <SectionHeading id="faq-t" eyebrow="Domande frequenti" title="Ricambi: le risposte essenziali" />
        <div className="mx-auto flex max-w-3xl flex-col gap-3">{PARTS_FAQ.map((f) => <details key={f.q} className="rounded-2xl border border-line bg-white p-5 shadow-card"><summary className="cursor-pointer font-semibold">{f.q}</summary><p className="mt-3 text-graphite">{f.a}</p></details>)}</div>
      </Section>
    </>
  );
}

async function Categories() {
  const cats = (await getPartCategories()).filter((c) => !c.parent_id);
  if (!cats.length) return null;
  return (
    <Section tone="white" labelledBy="cat-t">
      <SectionHeading id="cat-t" eyebrow="Categorie" title="Sfoglia per categoria" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cats.map((c) => <li key={c.id}><Link href={`/ricambi?categoria=${c.slug}#cerca`} className="block rounded-xl border border-line bg-white p-4 text-center font-semibold shadow-card hover:border-ink">{c.name}</Link></li>)}
      </ul>
    </Section>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/ricambi">["searchParams"] }) {
  const f = parsePartFilters(await searchParams);
  const user = await getCurrentUser();
  let vehicles: { id: string; make_slug: string | null; make: string; model: string; version: string | null; year: number | null; engine_code: string | null }[] = [];
  let favs = new Set<string>();
  if (user) {
    const supabase = await createClient();
    const [v, fv] = await Promise.all([
      supabase.from("user_vehicles").select("id, make_slug, make, model, version, year, engine_code").is("deleted_at", null).order("is_primary", { ascending: false }),
      supabase.from("favorites").select("part_id").not("part_id", "is", null),
    ]);
    vehicles = v.data ?? [];
    favs = new Set((fv.data ?? []).map((x) => x.part_id as string));
    // Ricerca per automobile del garage: i dati del veicolo non vanno reinseriti.
    const chosen = f.auto ? vehicles.find((x) => x.id === f.auto) : undefined;
    if (chosen) Object.assign(f, { auto_marca: chosen.make_slug ?? undefined, auto_modello: chosen.model, anno: chosen.year ?? undefined, versione: chosen.version ?? undefined, motore: chosen.engine_code ?? undefined });
  }
  const [{ items, total, error }, cats] = await Promise.all([searchParts(f), getPartCategories()]);
  const roots = cats.filter((c) => !c.parent_id);
  const chosenVehicle = f.auto ? vehicles.find((x) => x.id === f.auto) : undefined;
  const chips = ([
    ["q", f.q && `“${f.q}”`], ["codice", f.codice && `Codice ${f.codice}`], ["categoria", f.categoria && cats.find((c) => c.slug === f.categoria)?.name],
    ["marca", f.marca && `Produttore: ${f.marca}`], ["auto", chosenVehicle && `Per la mia ${chosenVehicle.make} ${chosenVehicle.model}`],
    ["auto_marca", !chosenVehicle && f.auto_marca && (BRANDS.find((b) => b.slug === f.auto_marca)?.name ?? f.auto_marca)], ["auto_modello", !chosenVehicle && f.auto_modello], ["anno", !chosenVehicle && f.anno && `Anno ${f.anno}`],
    ["condizione", f.condizione && PART_CONDITION_LABELS[f.condizione]], ["prezzo_min", f.prezzo_min !== undefined && `Da ${f.prezzo_min} €`], ["prezzo_max", f.prezzo_max !== undefined && `Fino a ${f.prezzo_max} €`],
    ["citta", f.citta], ["cap", f.cap && `CAP ${f.cap}`], ["venditore", f.venditore && (f.venditore === "privato" ? "Privati" : "Professionisti")], ["disponibili", f.disponibili && "Solo disponibili"],
  ] as [keyof PartFilters, string | false | undefined][]).filter(([, l]) => l) as [keyof PartFilters, string][];
  const base = "/ricambi";
  const linkFilters: Partial<PartFilters> = chosenVehicle ? { ...f, auto_marca: undefined, auto_modello: undefined, anno: undefined, versione: undefined, motore: undefined } : f;

  return (
    <div className="flex flex-col gap-6">
      <QuickSearchBar action={base} param="q" label="Cerca un ricambio per nome o codice" placeholder="Nome o codice del ricambio" defaultValue={f.q ?? ""} />
      <details className="group rounded-2xl border border-line bg-white shadow-card">
        <summary className="flex cursor-pointer items-center justify-between px-5 py-4 font-semibold">
          <span>Filtri avanzati <span className="font-normal text-muted">(facoltativi: codice OEM, categoria, la tua auto, prezzo…)</span></span>
          <span className="text-sm text-orange-700 group-open:hidden">Mostra</span>
        </summary>
      <form action={`${base}#cerca`} method="get" className="grid gap-4 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-3" role="search" aria-label="Filtri avanzati">
        {f.q && <input type="hidden" name="q" value={f.q} />}
        <Field id="rf-code" label="Codice OEM o del produttore" optional><Input id="rf-code" name="codice" defaultValue={f.codice} /></Field>
        <Field id="rf-cat" label="Categoria"><Select id="rf-cat" name="categoria" defaultValue={f.categoria ?? ""}><option value="">Tutte</option>{roots.map((r) => <optgroup key={r.id} label={r.name}><option value={r.slug}>{r.name} (tutto)</option>{cats.filter((c) => c.parent_id === r.id).map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}</optgroup>)}</Select></Field>
        <Field id="rf-brand" label="Marca del produttore" optional><Input id="rf-brand" name="marca" defaultValue={f.marca} placeholder="Es. Bosch, Brembo" /></Field>
        <fieldset className="flex flex-col gap-3 rounded-xl bg-mist p-3">
          <legend className="px-1 text-sm font-semibold">La tua automobile</legend>
          {vehicles.length > 0 && <Field id="rf-auto" label="Dal mio garage"><Select id="rf-auto" name="auto" defaultValue={f.auto ?? ""}><option value="">Nessuna</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year ?? ""}</option>)}</Select></Field>}
          {!chosenVehicle && <>
            <Field id="rf-mk" label="Marca"><Select id="rf-mk" name="auto_marca" defaultValue={f.auto_marca ?? ""}><option value="">—</option>{BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}</Select></Field>
            <div className="grid grid-cols-[1fr_90px] gap-2">
              <Field id="rf-md" label="Modello"><Input id="rf-md" name="auto_modello" defaultValue={f.auto_modello} /></Field>
              <Field id="rf-y" label="Anno"><Input id="rf-y" name="anno" inputMode="numeric" defaultValue={f.anno} /></Field>
            </div>
          </>}
        </fieldset>
        <Field id="rf-cond" label="Condizione"><Select id="rf-cond" name="condizione" defaultValue={f.condizione ?? ""}><option value="">Tutte</option>{Object.entries(PART_CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="rf-pmin" label="Prezzo min (€)"><Input id="rf-pmin" name="prezzo_min" inputMode="numeric" defaultValue={f.prezzo_min} /></Field>
          <Field id="rf-pmax" label="Prezzo max (€)"><Input id="rf-pmax" name="prezzo_max" inputMode="numeric" defaultValue={f.prezzo_max} /></Field>
        </div>
        <div className="grid grid-cols-[1fr_100px] gap-3">
          <Field id="rf-city" label="Città"><Input id="rf-city" name="citta" defaultValue={f.citta} /></Field>
          <Field id="rf-cap" label="CAP"><Input id="rf-cap" name="cap" inputMode="numeric" defaultValue={f.cap} /></Field>
        </div>
        <Field id="rf-sel" label="Venditore"><Select id="rf-sel" name="venditore" defaultValue={f.venditore ?? ""}><option value="">Tutti</option><option value="professionista">Professionisti</option><option value="privato">Privati</option></Select></Field>
        <Checkbox id="rf-av" name="disponibili" value="1" defaultChecked={f.disponibili} label="Solo disponibili (non esauriti)" />
        <Field id="rf-o" label="Ordina per"><Select id="rf-o" name="ordina" defaultValue={f.ordina}>{Object.entries(PART_SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
        <Button type="submit" className="w-full self-end">Applica i filtri</Button>
      </form>
      </details>
      <section aria-labelledby="pr-t" className="flex min-w-0 flex-col gap-5">
        <h2 id="pr-t" className="text-lg font-bold" aria-live="polite">{error ? "Risultati non disponibili" : `${total} ${total === 1 ? "ricambio" : "ricambi"}`}</h2>
        {chips.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Filtri attivi">
            {chips.map(([k, l]) => <li key={k}><Link href={partHref(base, linkFilters, { [k]: undefined, pagina: 1 })} className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm">{l} <X className="size-3.5" aria-label="rimuovi" /></Link></li>)}
            <li><Link href={base} className="px-2 py-1.5 text-sm font-semibold text-orange-700">Azzera filtri</Link></li>
          </ul>
        )}
        {(f.auto_marca || chosenVehicle) && <Alert tone="info">Mostriamo i ricambi per cui il venditore ha indicato compatibilità con questa automobile. Nella scheda trovi l&apos;esito dettagliato: se la versione non è abbastanza precisa, chiedi conferma al venditore.</Alert>}
        {error ? <Alert tone="error">Ricerca non riuscita. Riprova tra poco.</Alert> : items.length === 0 ? (
          <EmptyState title="Nessun ricambio trovato" description={chips.length ? "Prova con meno filtri o con un codice diverso." : "Non ci sono ancora ricambi pubblicati: i primi venditori stanno entrando nella piattaforma."} />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{(items as PartCardData[]).map((p) => <li key={p.id}><PartCard p={p} favorite={favs.has(p.id)} /></li>)}</ul>
        )}
        <Pagination page={f.pagina} pageSize={PART_PAGE} total={total} hrefFor={(n) => partHref(base, linkFilters, { pagina: n })} />
      </section>
    </div>
  );
}
