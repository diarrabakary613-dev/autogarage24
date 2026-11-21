import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Container, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/marketing/page-hero";
import { ListingCard } from "@/components/marketplace/listing-card";
import { neoBandListings } from "@/lib/data/neo-bands";
import { NEO_BANDS, type NeoBand } from "@/lib/seo/sitemap-data";

export async function generateMetadata(props: PageProps<"/auto-per-neopatentati/prezzo/[fascia]">): Promise<Metadata> {
  const { fascia } = await props.params;
  if (!(fascia in NEO_BANDS)) return { title: "Pagina non trovata", robots: { index: false } };
  const d = await neoBandListings(fascia as NeoBand);
  const b = NEO_BANDS[fascia as NeoBand];
  return {
    title: `Auto per neopatentati ${b.label}`,
    description: `Auto usate compatibili con i limiti per neopatentati, prezzo ${b.label}: annunci reali di venditori su AutoGarage24, con verifica dei dati tecnici.`,
    alternates: { canonical: `/auto-per-neopatentati/prezzo/${fascia}` },
    robots: d.indexable ? undefined : { index: false, follow: true },
  };
}

export default function NeoBandPage(props: PageProps<"/auto-per-neopatentati/prezzo/[fascia]">) {
  return <Suspense fallback={<Container className="py-16"><Skeleton className="h-96" /></Container>}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ fascia: string }> }) {
  const { fascia } = await params;
  if (!(fascia in NEO_BANDS)) notFound();
  const b = NEO_BANDS[fascia as NeoBand];
  const d = await neoBandListings(fascia as NeoBand);
  return (
    <>
      <PageHero eyebrow="Neopatentati" title={`Auto per neopatentati ${b.label}`}
        description="La compatibilità è calcolata dai dati tecnici dell'annuncio con le regole configurate. Verifica sempre potenza e rapporto potenza/peso sulla carta di circolazione prima dell'acquisto."
        crumbs={[{ name: "Auto per neopatentati", href: "/auto-per-neopatentati" }, { name: b.label, href: `/auto-per-neopatentati/prezzo/${fascia}` }]} />
      <Container className="py-10">
        {!d.items.length ? <EmptyState title="Nessuna auto compatibile in questa fascia di prezzo" action={<ButtonLink href="/auto-per-neopatentati">Tutte le auto per neopatentati</ButtonLink>} /> : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.items.map((i) => <li key={i.id}><ListingCard item={i} favorite={null} showNeo /></li>)}</ul>
        )}
        <nav aria-label="Altre fasce di prezzo" className="mt-10 flex flex-wrap gap-2">{(Object.keys(NEO_BANDS) as NeoBand[]).filter((k) => k !== fascia).map((k) => <Link key={k} className="rounded-full border border-line-strong px-3 py-1 text-sm hover:border-ink" href={`/auto-per-neopatentati/prezzo/${k}`}>{NEO_BANDS[k].label}</Link>)}</nav>
      </Container>
    </>
  );
}
