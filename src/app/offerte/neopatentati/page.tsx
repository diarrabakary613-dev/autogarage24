import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Container } from "@/components/ui/feedback";
import { Breadcrumbs } from "@/components/marketing/page-hero";
import { OfferSearch } from "@/components/offers/offer-search";
import { NEO_TOPICS } from "@/lib/offers/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/offerte/neopatentati", {
  title: "Offerte per neopatentati — prima auto, prima manutenzione",
  description: "Prima manutenzione, controlli pre-acquisto, pneumatici, assistenza e accessori: offerte dei partner AutoGarage24 dedicate a chi ha appena preso la patente.",
  alternates: { canonical: "/offerte/neopatentati" },
});
}

export default function NeoOffersPage(props: PageProps<"/offerte/neopatentati">) {
  return (
    <Container className="flex flex-col gap-6 py-8">
      <Breadcrumbs items={[{ name: "Offerte", href: "/offerte" }, { name: "Neopatentati", href: "/offerte/neopatentati" }]} />
      <div className="rounded-2xl bg-ink p-6 text-white sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-widest text-orange">Neopatentati</p>
        <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Offerte per la tua prima auto</h1>
        <p className="mt-2 max-w-3xl text-white/75">Servizi utili per chi ha appena acquistato la prima automobile: {Object.values(NEO_TOPICS).join(", ").toLowerCase()}.</p>
      </div>
      <OfferSearch searchParams={props.searchParams} neo base="/offerte/neopatentati" />
    </Container>
  );
}
