import Link from "next/link";
import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container, Skeleton } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { ListingSearch } from "@/components/marketplace/listing-search";
import { QuickSearchBar } from "@/components/professionals/quick-search";

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
          <Suspense fallback={<div className="h-32" />}>
            <HeroSearch searchParams={props.searchParams} />
          </Suspense>
          <div className="flex flex-wrap gap-3 text-sm text-white/70">
            <span>Vendi un&apos;auto?</span>
            <ButtonLink href="/dashboard/annunci/nuovo" size="sm" variant="outline" className="border-white/25 bg-transparent text-white hover:bg-white/10">Pubblica un annuncio</ButtonLink>
          </div>
        </Container>
      </section>
      <div id="cerca" className="scroll-mt-20 bg-mist">
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

async function HeroSearch({ searchParams }: { searchParams: PageProps<"/auto-usate">["searchParams"] }) {
  const sp = await searchParams;
  const cerca = typeof sp.cerca === "string" ? sp.cerca : "";
  return (
    <QuickSearchBar
      action="/auto-usate"
      label="Cerca un'auto per marca, modello o luogo"
      placeholder="Marca, modello, città o CAP"
      defaultValue={cerca}
      nearLabel="Auto vicino a me"
      nearRadius={25}
      tone="dark"
      className="max-w-3xl"
    />
  );
}
