import type { Metadata } from "next";
import { seoMetadata } from "@/lib/seo/overrides";
import Link from "next/link";
import { Suspense } from "react";
import { LandingHero } from "@/components/marketing/landing";
import { Section, SectionHeading } from "@/components/marketing/section";
import { LocateButton } from "@/components/maps/locate-button";
import { MapView } from "@/components/maps/map-view";
import { DueCalculator } from "@/components/services/due-calculator";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { createPublicClient } from "@/lib/supabase/public";
import { INSPECTION_CATEGORIES, INSPECTION_SERVICES } from "@/lib/inspection/labels";

export async function generateMetadata(): Promise<Metadata> {
  return seoMetadata("/revisione-auto", {
  title: "Revisione auto a Milano — centri autorizzati e calcolo della scadenza",
  description: "Trova un centro revisione con autorizzazione verificata, calcola la scadenza secondo l'art. 80 del Codice della Strada e richiedi un appuntamento.",
  alternates: { canonical: "/revisione-auto" },
});
}

export default function InspectionPage(props: PageProps<"/revisione-auto">) {
  return (
    <>
      <LandingHero eyebrow="Revisione auto" title="La revisione, senza sorprese." subtitle="Calcola quando scade, trova un centro con autorizzazione verificata vicino a te e chiedi l'appuntamento. Il promemoria arriva da solo in «Il mio Garage»."
        crumbs={[{ name: "Revisione auto", href: "/revisione-auto" }]} ctas={[{ href: "#centri", label: "Trova un centro revisione" }, { href: "#calcolo", label: "Calcola la scadenza", variant: "outline" }]} />
      <Section id="centri" tone="mist" labelledBy="centri-t">
        <SectionHeading id="centri-t" title="Trova un centro revisione" description="«Autorizzazione verificata» compare solo dopo il controllo della concessione da parte dello staff." />
        <Suspense fallback={<Skeleton className="h-96" />}><Centers searchParams={props.searchParams} /></Suspense>
      </Section>
      <Section id="calcolo" tone="white" labelledBy="calc-t">
        <SectionHeading id="calc-t" title="Quando scade la revisione?" description="Prima revisione dopo 4 anni dall'immatricolazione, poi ogni 2 anni; annuale per taxi, NCC, ambulanze, autobus e veicoli oltre 3,5 t. Il calcolo tiene conto di categoria, uso ed esito." />
        <Suspense fallback={<Skeleton className="h-64" />}><Calc searchParams={props.searchParams} /></Suspense>
        <p className="mt-3 text-sm"><Link className="font-semibold text-orange-700 underline" href="/dashboard/revisioni/garage">Salva le date in Il mio Garage</Link> per ricevere il promemoria 30 giorni prima.</p>
      </Section>
      <Section tone="mist" labelledBy="pro-t">
        <div className="flex flex-col items-start gap-3">
          <h2 id="pro-t" className="text-2xl font-extrabold">Gestisci un centro revisioni?</h2>
          <p className="max-w-2xl text-graphite">Pubblica orari e disponibilità reali, ricevi le richieste e conferma gli appuntamenti. L&apos;esito che registri arriva nello storico dell&apos;auto del cliente.</p>
          <ButtonLink href="/registrati?ruolo=centro_revisione">Registra il tuo centro</ButtonLink>
        </div>
      </Section>
    </>
  );
}

async function Calc({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <DueCalculator params={await searchParams} />;
}

async function Centers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const lat = Number(sp.lat), lng = Number(sp.lng);
  const hasPos = typeof sp.lat === "string" && Number.isFinite(lat) && Number.isFinite(lng);
  const city = typeof sp.citta === "string" && sp.citta.trim() ? sp.citta.trim().slice(0, 80) : hasPos ? undefined : "Milano";
  const cat = typeof sp.categoria === "string" && sp.categoria in INSPECTION_CATEGORIES ? sp.categoria : undefined;
  const radius = Math.min(Math.max(Number(sp.raggio) || 15, 1), 100);
  const supabase = createPublicClient();
  const { data } = supabase ? await supabase.rpc("search_inspection_centers", { p_lat: hasPos ? lat : undefined, p_lng: hasPos ? lng : undefined, p_radius_km: radius, p_city: city, p_category: cat }) : { data: null };
  const points = (data ?? []).filter((c) => c.latitude !== null).map((c) => ({ id: c.profile_id, lat: c.latitude!, lng: c.longitude!, label: c.display_name, href: `/revisione-auto/${c.slug}` }));
  return (
    <div className="flex flex-col gap-4">
      <form className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" action="/revisione-auto#centri">
        <Field id="rc-c" label="Città"><Input id="rc-c" name="citta" defaultValue={city ?? ""} /></Field>
        <Field id="rc-k" label="Veicolo"><Select id="rc-k" name="categoria" defaultValue={cat ?? ""}><option value="">Tutti</option>{Object.entries(INSPECTION_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <div className="flex items-end gap-2"><button className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white" type="submit">Cerca</button></div>
        <div className="sm:col-span-3"><LocateButton /></div>
      </form>
      {points.length > 0 && <MapView points={points} user={hasPos ? { lat, lng } : null} />}
      {!data?.length ? <EmptyState title="Nessun centro revisione trovato" description="Stiamo verificando i primi centri di Milano. Prova un'altra città o allarga il raggio." /> : (
        <ul className="grid gap-3 md:grid-cols-2">{data.map((c) => (
          <li key={c.profile_id}><Card className="flex h-full flex-col gap-1 p-4">
            <p className="text-lg font-bold"><Link className="hover:underline" href={`/revisione-auto/${c.slug}`}>{c.display_name}</Link></p>
            <p className="text-sm text-muted">{[c.address, c.city].filter(Boolean).join(", ")}{c.distance_km !== null ? ` · ${String(c.distance_km).replace(".", ",")} km` : ""}</p>
            <div className="flex flex-wrap gap-1">{c.authorized ? <Badge tone="success">Autorizzazione verificata</Badge> : <Badge tone="warning">Autorizzazione in verifica</Badge>}{c.online_booking && <Badge tone="dark">Prenotazione online</Badge>}{c.review_count > 0 && <Badge tone="neutral">★ {String(c.rating_avg).replace(".", ",")} ({c.review_count})</Badge>}</div>
            <p className="text-sm">{c.vehicle_categories.map((x) => INSPECTION_CATEGORIES[x]).join(" · ")}</p>
            <p className="text-xs text-muted">{c.services.map((x) => INSPECTION_SERVICES[x]).join(", ")}{c.hours_text ? ` · Orari dichiarati: ${c.hours_text}` : ""}</p>
            {c.phone && <a className="text-sm font-semibold underline" href={`tel:${c.phone.replace(/[^0-9+]/g, "")}`}>{c.phone}</a>}
          </Card></li>))}</ul>
      )}
    </div>
  );
}
