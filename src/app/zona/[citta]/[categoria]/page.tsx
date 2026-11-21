import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container, Skeleton } from "@/components/ui/feedback";
import { PageHero } from "@/components/marketing/page-hero";
import { ProCard } from "@/components/professionals/pro-card";
import { localPage } from "@/lib/data/local-seo";
import { categoryForType, LOCAL_CATEGORIES } from "@/lib/seo/sitemap-data";

export async function generateMetadata(props: PageProps<"/zona/[citta]/[categoria]">): Promise<Metadata> {
  const { citta, categoria } = await props.params;
  const d = await localPage(citta, categoria);
  if (!d) return { title: "Pagina non trovata", robots: { index: false } };
  return {
    title: `${d.category.label} a ${d.city}`,
    description: `${d.count} ${d.category.label.toLowerCase()} con profilo verificato a ${d.city} su AutoGarage24: servizi, orari, recensioni verificate e richieste di preventivo.`,
    alternates: { canonical: `/zona/${citta}/${categoria}` },
    // Indicizzabile solo con abbastanza profili reali: niente pagine vuote moltiplicate per città.
    robots: d.indexable ? undefined : { index: false, follow: true },
  };
}

export default function LocalPage(props: PageProps<"/zona/[citta]/[categoria]">) {
  return <Suspense fallback={<Container className="py-16"><Skeleton className="h-96" /></Container>}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ citta: string; categoria: string }> }) {
  const { citta, categoria } = await params;
  const d = await localPage(citta, categoria);
  if (!d) notFound();
  return (
    <>
      <PageHero eyebrow={d.city} title={`${d.category.label} a ${d.city}`}
        description={`${d.count} ${d.count === 1 ? "profilo pubblicato e approvato" : "profili pubblicati e approvati"} dallo staff. Le valutazioni mostrate derivano solo da recensioni verificate.`}
        crumbs={[{ name: d.category.label, href: d.category.base }, { name: d.city, href: `/zona/${citta}/${categoria}` }]} />
      <Container className="py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.items.map((p) => <li key={p.id}><ProCard p={p} base={d.category.base} categoryNames={new Map()} favorite={null} /></li>)}</ul>
        {d.others.length > 0 && (
          <nav aria-label={`Altre categorie a ${d.city}`} className="mt-10">
            <h2 className="text-lg font-bold">Altri professionisti a {d.city}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">{d.others.map((o) => { const c = categoryForType(o.professional_type); return c ? <li key={c}><Link className="rounded-full border border-line-strong px-3 py-1 text-sm hover:border-ink" href={`/zona/${citta}/${c}`}>{LOCAL_CATEGORIES[c].label}</Link></li> : null; })}</ul>
          </nav>
        )}
      </Container>
    </>
  );
}
