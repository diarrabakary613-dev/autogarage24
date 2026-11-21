import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { Container, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { ListingCard } from "@/components/marketplace/listing-card";
import { LpTracker } from "@/components/growth/lp-tracker";
import { createPublicClient } from "@/lib/supabase/public";
import { latestListings } from "@/lib/data/listings";
import { pickVariant } from "@/lib/growth/labels";

async function load(slug: string) {
  if (!/^[a-z0-9-]{3,60}$/.test(slug)) return null;
  const supabase = createPublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("landing_pages").select("*").eq("slug", slug).eq("status", "pubblicata").maybeSingle();
  return data;
}

export async function generateMetadata(props: PageProps<"/lp/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const lp = await load(slug);
  if (!lp) return { title: "Pagina non trovata", robots: { index: false } };
  return {
    title: lp.title, description: lp.meta_description ?? lp.subheadline ?? undefined,
    alternates: { canonical: `/lp/${lp.slug}` },
    robots: lp.indexable && !lp.experiment_active ? undefined : { index: false, follow: true },
  };
}

export default function LandingPage(props: PageProps<"/lp/[slug]">) {
  return <Suspense fallback={<Container className="py-16"><Skeleton className="h-96" /></Container>}><Content params={props.params} /></Suspense>;
}

async function Content({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lp = await load(slug);
  if (!lp) notFound();
  await connection();
  // Variante assegnata a ogni visualizzazione (nessun cookie): la statistica è per vista, non per persona.
  const variant = pickVariant(lp.experiment_active);
  const headline = variant === "b" && lp.variant_b_headline ? lp.variant_b_headline : lp.headline;
  const cta = variant === "b" && lp.variant_b_cta_label ? lp.variant_b_cta_label : lp.cta_label;
  return (
    <>
      <LpTracker slug={lp.slug} variant={variant} />
      <section className="bg-ink text-white">
        <Container className="py-14 sm:py-20">
          <h1 className="max-w-3xl text-3xl font-extrabold sm:text-5xl">{headline}</h1>
          {lp.subheadline && <p className="mt-4 max-w-2xl text-lg text-white/80">{lp.subheadline}</p>}
          <ButtonLink href={lp.cta_path} size="lg" className="mt-8" data-lp-cta data-track="cta" data-track-label={`lp:${lp.slug}`}>{cta}</ButtonLink>
        </Container>
      </section>
      <Container className="flex flex-col gap-10 py-12">
        {(lp.body || lp.bullets.length > 0) && (
          <div className="max-w-3xl">
            {lp.body?.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-4 leading-relaxed text-graphite">{p}</p>)}
            {lp.bullets.length > 0 && <ul className="mt-2 flex flex-col gap-2">{lp.bullets.map((b) => <li key={b} className="flex gap-2"><Check className="mt-0.5 size-5 shrink-0 text-orange-700" aria-hidden />{b}</li>)}</ul>}
          </div>
        )}
        {lp.section !== "nessuna" && <Section kind={lp.section} />}
        <div><ButtonLink href={lp.cta_path} size="lg" data-lp-cta data-track="cta" data-track-label={`lp:${lp.slug}`}>{cta}</ButtonLink></div>
      </Container>
    </>
  );
}

/** Sezioni con dati reali dal database. Se non ci sono contenuti lo diciamo, senza riempitivi. */
async function Section({ kind }: { kind: string }) {
  if (kind === "auto_neopatentati" || kind === "auto_usate") {
    const items = await latestListings(6, kind === "auto_neopatentati" ? ["compatibile"] : undefined);
    const href = kind === "auto_neopatentati" ? "/auto-per-neopatentati" : "/auto-usate";
    return (
      <section>
        <h2 className="text-2xl font-bold">{kind === "auto_neopatentati" ? "Auto compatibili con i limiti per neopatentati" : "Ultime auto pubblicate"}</h2>
        {kind === "auto_neopatentati" && <p className="mt-1 text-sm text-muted">Compatibilità calcolata sui dati dell&apos;annuncio e sulle regole configurate: verifica sempre la carta di circolazione prima dell&apos;acquisto.</p>}
        {!items.length ? <EmptyState className="mt-4" title="Nessuna auto disponibile al momento" description="Stiamo raccogliendo gli annunci dei venditori verificati." action={<ButtonLink href={href} variant="outline">Vai alla ricerca</ButtonLink>} /> : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map((i) => <li key={i.id}><ListingCard item={i} favorite={null} showNeo={kind === "auto_neopatentati"} /></li>)}</ul>
        )}
        {items.length > 0 && <Link href={href} className="mt-4 inline-block font-semibold underline">Vedi tutte</Link>}
      </section>
    );
  }
  const supabase = createPublicClient();
  if (!supabase) return null;
  if (kind === "officine") {
    const { data } = await supabase.from("professional_profiles").select("slug, display_name, city").eq("is_published", true).eq("review_status", "approvato").eq("professional_type", "officina").order("updated_at", { ascending: false }).limit(9);
    return (
      <section><h2 className="text-2xl font-bold">Officine verificate</h2>
        {!data?.length ? <EmptyState className="mt-4" title="Le prime officine sono in fase di verifica" action={<ButtonLink href="/trova-officina" variant="outline">Cerca officine</ButtonLink>} /> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">{data.map((p) => <li key={p.slug}><Link className="block rounded-xl border border-line p-4 font-semibold hover:border-ink" href={`/professionisti/${p.slug}`}>{p.display_name}<span className="block text-sm font-normal text-muted">{p.city}</span></Link></li>)}</ul>
        )}
      </section>
    );
  }
  if (kind === "offerte") {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase.from("promotional_offers").select("slug, title, ends_on").eq("status", "pubblicata").gte("ends_on", today).order("published_at", { ascending: false }).limit(6);
    return (
      <section><h2 className="text-2xl font-bold">Offerte dei partner</h2>
        {!data?.length ? <EmptyState className="mt-4" title="Nessuna offerta attiva" action={<ButtonLink href="/offerte" variant="outline">Vai alle offerte</ButtonLink>} /> : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">{data.map((o) => <li key={o.slug}><Link className="block rounded-xl border border-line p-4 font-semibold hover:border-ink" href={`/offerte/${o.slug}`}>{o.title}</Link></li>)}</ul>
        )}
      </section>
    );
  }
  return null;
}
