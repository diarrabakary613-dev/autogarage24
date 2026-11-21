import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import { Suspense } from "react";
import Link from "next/link";
import { FileText, ListChecks, MessagesSquare, Scale } from "lucide-react";
import { FeatureGrid, LandingHero } from "@/components/marketing/landing";
import { Section } from "@/components/marketing/section";
import { RepairRequestForm } from "@/components/repair/repair-form";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PROBLEM_LABELS } from "@/lib/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/richiedi-intervento", {
  title: "Richiedi un intervento — preventivi dalle officine di Milano",
  description: "Descrivi il problema della tua auto una volta sola, inviala alle officine compatibili della tua zona e confronta i preventivi indicativi. Gratuito.",
  alternates: { canonical: "/richiedi-intervento" },
});
}

export default function RepairRequestPage(props: PageProps<"/richiedi-intervento">) {
  return (
    <>
      <LandingHero eyebrow="Officine e meccanici" title="Richiedi un intervento." subtitle="Descrivi il problema una volta sola, scegli le officine compatibili vicino a te e confronta i preventivi. Gratuito per gli automobilisti."
        crumbs={[{ name: "Richiedi un intervento", href: "/richiedi-intervento" }]} ctas={[{ href: "#modulo", label: "Inizia ora" }]} />
      <Section id="modulo" tone="mist" labelledBy="modulo-t">
        <h2 id="modulo-t" className="sr-only">Modulo di richiesta</h2>
        <Suspense fallback={<Skeleton className="h-96" />}><FormOrLogin searchParams={props.searchParams} /></Suspense>
      </Section>
      <FeatureGrid id="come" eyebrow="Come funziona" title="Quattro passaggi" columns={4} items={[
        { icon: FileText, title: "Descrivi", text: "Auto, chilometri, problema, disponibilità. Foto e video al passo successivo." },
        { icon: ListChecks, title: "Scegli le officine", text: "Ti mostriamo solo officine pubblicate e compatibili con il tipo di intervento." },
        { icon: Scale, title: "Confronta", text: "Preventivi indicativi con manodopera, ricambi, tempi e validità." },
        { icon: MessagesSquare, title: "Accordati", text: "Accetta un preventivo, scrivi all'officina e fissa l'appuntamento." },
      ]} />
    </>
  );
}

async function FormOrLogin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const auto = typeof sp.auto === "string" && /^[0-9a-f-]{36}$/.test(sp.auto) ? sp.auto : undefined;
  const cat = typeof sp.tipo === "string" && sp.tipo in PROBLEM_LABELS ? sp.tipo : undefined;
  if (!user) {
    const next = `/richiedi-intervento${auto ? `?auto=${auto}` : ""}`;
    return (
      <Card className="mx-auto flex max-w-2xl flex-col gap-4 p-6 text-center">
        <p className="text-lg font-bold">Accedi o registrati per inviare la richiesta</p>
        <p className="text-muted">Serve un account per ricevere i preventivi, scrivere alle officine e ritrovare tutto nella tua area. È gratuito.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <ButtonLink href={`/accedi?next=${encodeURIComponent(next)}`}>Accedi</ButtonLink>
          <ButtonLink href={`/registrati?next=${encodeURIComponent(next)}`} variant="outline">Crea un account</ButtonLink>
        </div>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("user_vehicles").select("id, make, model, year, current_mileage_km").eq("owner_id", user.id).is("deleted_at", null).order("is_primary", { ascending: false });
  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Alert tone="info">Le officine vedono la tua richiesta solo dopo che le avrai scelte. I preventivi sono indicativi: il prezzo definitivo può richiedere un controllo dell&apos;auto. Le tue richieste: <Link className="underline" href="/dashboard/richieste-intervento">Le mie richieste di intervento</Link>.</Alert>
      <Card className="p-6"><RepairRequestForm vehicles={vehicles ?? []} defaultVehicle={auto} defaultCategory={cat} today={new Date().toISOString().slice(0, 10)} /></Card>
    </div>
  );
}
