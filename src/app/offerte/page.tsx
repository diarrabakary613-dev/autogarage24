import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { Container } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { OfferSearch } from "@/components/offers/offer-search";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/offerte", {
  title: "Offerte per automobilisti a Milano",
  description: "Promozioni di officine e partner AutoGarage24: tagliandi, pneumatici, freni, diagnosi, carrozzeria, ricambi e accessori. Prezzi verificati in moderazione.",
  alternates: { canonical: "/offerte" },
});
}

export default function OffersPage(props: PageProps<"/offerte">) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Breadcrumbs items={[{ name: "Offerte", href: "/offerte" }]} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-3xl font-extrabold sm:text-4xl">Offerte per automobilisti</h1><p className="mt-1 max-w-3xl text-muted">Promozioni dei partner vicino a te, con condizioni chiare e scadenza indicata.</p></div>
        <Link href="/offerte/neopatentati" className="rounded-full border-2 border-orange px-4 py-2 text-sm font-bold hover:bg-orange" data-track="cta" data-track-label="Offerte neopatentati">Offerte per neopatentati</Link>
      </div>
      <OfferSearch searchParams={props.searchParams} base="/offerte" />
    </Container>
  );
}
