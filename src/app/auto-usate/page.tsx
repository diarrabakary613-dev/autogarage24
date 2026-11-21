import Link from "next/link";
import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { ListingSearch } from "@/components/marketplace/listing-search";
import { BRANDS } from "@/config/brands";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/auto-usate", {
  title: "Auto usate a Milano: annunci di professionisti e privati",
  description:
    "Trova la tua prossima automobile: annunci verificati di concessionari, officine e privati a Milano e provincia. Filtra per marca, modello, prezzo, chilometraggio e contatta direttamente il venditore.",
  alternates: { canonical: "/auto-usate" },
});
}

export default function UsedCarsPage(props: PageProps<"/auto-usate">) {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50%_80%_at_90%_0%,rgb(244_123_32/0.25),transparent_65%)]" />
        <Container className="flex flex-col gap-5 py-10 sm:py-14">
          <Breadcrumbs items={[{ name: "Auto usate", href: "/auto-usate" }]} inverted />
          <p className="text-sm font-semibold tracking-widest text-orange uppercase">Trova la tua auto</p>
          <h1 className="text-4xl leading-[1.05] font-extrabold text-white sm:text-5xl">Trova la tua prossima automobile.</h1>
          <Link href="/auto-usate?neo=compatibili" className="w-fit rounded-full border-2 border-orange px-4 py-1.5 text-sm font-bold text-white hover:bg-orange hover:text-ink" data-track="cta" data-track-label="Auto per neopatentati">Auto per neopatentati: solo idonee verificate</Link>
          <p className="max-w-2xl text-lg text-white/70">
            Esplora le automobili disponibili, confronta caratteristiche e prezzi e contatta direttamente i venditori presenti su AutoGarage24.
          </p>
          <form action="/auto-usate" method="get" className="grid gap-2 rounded-2xl bg-white p-3 text-ink shadow-lift sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]" role="search" aria-label="Cerca automobile">
            <label className="sr-only" htmlFor="h-marca">Marca</label>
            <select id="h-marca" name="marca" className="h-12 rounded-lg border border-line-strong px-3">
              <option value="">Tutte le marche</option>
              {BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="h-modello">Modello</label>
            <input id="h-modello" name="modello" placeholder="Modello" className="h-12 rounded-lg border border-line-strong px-3" />
            <label className="sr-only" htmlFor="h-citta">Località</label>
            <input id="h-citta" name="citta" placeholder="Località (es. Milano)" className="h-12 rounded-lg border border-line-strong px-3" />
            <label className="sr-only" htmlFor="h-prezzo">Prezzo massimo</label>
            <input id="h-prezzo" name="prezzo_max" inputMode="numeric" placeholder="Prezzo max (€)" className="h-12 rounded-lg border border-line-strong px-3" />
            <Button type="submit" size="lg" icon={<Search className="size-5" aria-hidden />}>Cerca automobile</Button>
          </form>
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            <span>Vendi un&apos;auto?</span>
            <ButtonLink href="/dashboard/annunci/nuovo" size="sm" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10">Pubblica un annuncio</ButtonLink>
          </div>
        </Container>
      </section>
      <div className="bg-mist">
        <Container className="py-10">
          <Suspense fallback={<SearchSkeleton />}>
            <Results searchParams={props.searchParams} />
          </Suspense>
        </Container>
      </div>
    </>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/auto-usate">["searchParams"] }) {
  return <ListingSearch base="/auto-usate" params={await searchParams} />;
}

function SearchSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[290px_1fr]">
      <Skeleton className="h-[520px] rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
      </div>
    </div>
  );
}
