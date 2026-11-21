import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import { BarChart3, Handshake, Repeat2, ShieldCheck } from "lucide-react";
import { FaqList, FeatureGrid, LandingHero } from "@/components/marketing/landing";
import { Section } from "@/components/marketing/section";
import { ValuationWizard } from "@/components/services/valuation-wizard";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { DISCLAIMER } from "@/lib/valuation/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/valuta-la-tua-auto", {
  title: "Valuta la tua auto, vendila o proponila in permuta",
  description: "Stima preliminare trasparente basata sugli annunci reali di AutoGarage24, valutazioni e offerte dai professionisti verificati, permuta sulle auto in vendita.",
  alternates: { canonical: "/valuta-la-tua-auto" },
});
}

export default function ValuationPage(props: PageProps<"/valuta-la-tua-auto">) {
  return (
    <>
      <LandingHero eyebrow="Valuta, vendi, permuta" title="Quanto vale la tua auto?" subtitle="Una stima preliminare trasparente, poi le valutazioni e le offerte dei professionisti verificati. E se hai visto un'auto su AutoGarage24, proponi la tua in permuta."
        crumbs={[{ name: "Valuta la tua auto", href: "/valuta-la-tua-auto" }]} ctas={[{ href: "#valuta", label: "Inizia la valutazione" }]} />
      <Section id="valuta" tone="mist" labelledBy="v-t">
        <h2 id="v-t" className="sr-only">Valutazione</h2>
        <Suspense fallback={<Skeleton className="h-96" />}><Body searchParams={props.searchParams} /></Suspense>
      </Section>
      <FeatureGrid id="come" eyebrow="Come funziona" title="Dal valore indicativo all'accordo" columns={4} items={[
        { icon: BarChart3, title: "Stima preliminare", text: "Confronto con annunci comparabili reali della piattaforma, con metodo e affidabilità sempre visibili." },
        { icon: ShieldCheck, title: "Valutazione professionale", text: "Concessionari e officine verificati esaminano i dati e le foto che decidi di condividere." },
        { icon: Handshake, title: "Offerte e controproposte", text: "Confronta le proposte, controproponi, accetta: ogni passaggio resta nello storico." },
        { icon: Repeat2, title: "Permuta", text: "Proponi la tua auto come parte del pagamento di un'auto pubblicata su AutoGarage24." },
      ]} />
      <FaqList id="faq" title="Domande frequenti" items={[
        { q: "Da dove arriva la stima?", a: "Dai prezzi richiesti negli annunci comparabili pubblicati o venduti su AutoGarage24, corretti per età, chilometri e condizioni con parametri pubblici. Non usiamo listini di terzi non autorizzati." },
        { q: "Perché a volte non ricevo un valore?", a: "Se sulla piattaforma non ci sono abbastanza auto comparabili non mostriamo numeri: ti chiediamo altri dati o di chiedere una valutazione a un professionista." },
        { q: "La stima è un'offerta?", a: DISCLAIMER },
      ]} />
    </>
  );
}

async function Body({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const trade = typeof sp.permuta === "string" && /^[0-9a-f-]{36}$/.test(sp.permuta) ? sp.permuta : null;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: listing } = trade ? await supabase.from("vehicle_listings").select("id, title, price_cents, slug").eq("id", trade).eq("status", "pubblicato").maybeSingle() : { data: null };
  if (!user) {
    const next = `/valuta-la-tua-auto${trade ? `?permuta=${trade}` : ""}`;
    return <Card className="mx-auto flex max-w-xl flex-col items-center gap-3 p-6 text-center"><p className="font-bold">Accedi per valutare la tua auto</p><p className="text-sm text-muted">Le valutazioni restano private nella tua area.</p><ButtonLink href={`/accedi?next=${encodeURIComponent(next)}`}>Accedi</ButtonLink></Card>;
  }
  const { data: vehicles } = await supabase.from("user_vehicles").select("id, make, model, version, year, current_mileage_km, fuel, transmission, power_kw, engine_cc").eq("owner_id", user.id).is("deleted_at", null);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {listing && <Alert tone="info">Permuta per <strong>{listing.title}</strong> ({formatPrice(listing.price_cents)}): dopo la stima potrai inviare la proposta al venditore.</Alert>}
      <Card className="p-4 sm:p-6"><ValuationWizard userId={user.id} vehicles={(vehicles ?? []).map((v) => ({ ...v, fuel: v.fuel as string | null, transmission: v.transmission as string | null }))} tradeListingId={listing?.id ?? null} /></Card>
      <p className="text-xs text-muted">{DISCLAIMER}</p>
    </div>
  );
}
