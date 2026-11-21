import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { getBusinessContext } from "@/lib/business/context";

export const metadata: Metadata = { title: "Servizi e annunci" };

export default function ManagePage() {
  return (
    <>
      <PageHeader title="Servizi, annunci e disponibilità" description="Tutto ciò che pubblichi su AutoGarage24, in un unico punto. Le modifiche seguono le regole di moderazione della piattaforma." />
      <Suspense fallback={<Skeleton className="h-64" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const { supabase, current, isOwner } = await getBusinessContext("/business/gestione");
  const pid = current.profile_id;
  const t = current.professional_type;
  const [listings, parts, offers, services, plan] = await Promise.all([
    supabase.from("vehicle_listings").select("status").eq("professional_profile_id", pid),
    supabase.from("part_listings").select("status").eq("professional_profile_id", pid),
    supabase.from("promotional_offers").select("status").eq("profile_id", pid),
    supabase.from("professional_services").select("id", { count: "exact", head: true }).eq("profile_id", pid),
    supabase.rpc("business_plan", { profile_id: pid }),
  ]);
  const n = (rows: { status: string }[] | null, s: string) => (rows ?? []).filter((r) => r.status === s).length;
  const p = plan.data as { max_active_offers: number | null; offers_used: number; max_vehicle_listings: number | null; listings_used: number } | null;
  const cards: { title: string; text: string; href: string; show: boolean }[] = [
    { title: "Profilo aziendale", text: "Descrizione, foto, orari, contatti, posizione.", href: "/dashboard/profilo-professionale", show: true },
    { title: `Servizi (${services.count ?? 0})`, text: "Servizi offerti con descrizione e prezzi indicativi.", href: "/dashboard/servizi", show: true },
    { title: `Automobili: ${n(listings.data, "pubblicato")} pubblicate, ${n(listings.data, "bozza")} bozze`, text: p?.max_vehicle_listings ? `Limite del piano: ${p.listings_used}/${p.max_vehicle_listings}` : "Nessun limite nel piano attuale.", href: "/dashboard/annunci", show: t === "venditore_auto" || t === "officina" || (listings.data?.length ?? 0) > 0 },
    { title: `Ricambi: ${n(parts.data, "pubblicato")} pubblicati`, text: "Catalogo ricambi e disponibilità.", href: "/dashboard/ricambi", show: t === "venditore_ricambi" || (parts.data?.length ?? 0) > 0 },
    { title: `Offerte: ${n(offers.data, "pubblicata")} pubblicate, ${n(offers.data, "in_revisione")} in revisione`, text: p?.max_active_offers ? `Limite del piano: ${p.offers_used}/${p.max_active_offers} attive` : "", href: "/dashboard/offerte", show: true },
    { title: "Disponibilità e orari prenotabili", text: "Fasce orarie, durata degli appuntamenti, chiusure.", href: "/dashboard/disponibilita", show: true },
    { title: "Soccorso stradale", text: "Servizi, zona coperta e disponibilità dichiarata.", href: "/dashboard/soccorso/operatore", show: ["soccorritore", "officina", "meccanico"].includes(t) },
    { title: "Trasporto auto", text: "Servizi, regioni servite, copertura dichiarata.", href: "/dashboard/trasporti/operatore", show: ["trasportatore", "soccorritore", "venditore_auto"].includes(t) },
    { title: "Centro revisioni", text: "Categorie, autorizzazione, richieste.", href: "/dashboard/revisioni/centro", show: ["centro_revisione", "officina"].includes(t) },
    { title: "Valutazioni ricevute", text: "Richieste di valutazione e permute.", href: "/dashboard/valutazioni/professionista", show: ["venditore_auto", "officina"].includes(t) },
    { title: "Recensioni", text: "Rispondi alle recensioni verificate.", href: "/dashboard/recensioni", show: true },
  ];
  return (
    <>
      {!isOwner && <p className="mb-3 text-sm text-muted">Le pagine di gestione si aprono nell&apos;area personale del titolare: come collaboratore puoi gestire contatti, prenotazioni e attività dal Business Center.</p>}
      <div className="grid gap-3 sm:grid-cols-2">{cards.filter((c) => c.show).map((c) => (
        <Card key={c.href} className="flex flex-col gap-1 p-4">{isOwner ? <Link className="font-bold hover:underline" href={c.href}>{c.title}</Link> : <p className="font-bold">{c.title}</p>}{c.text && <p className="text-sm text-muted">{c.text}</p>}</Card>
      ))}</div>
    </>
  );
}
