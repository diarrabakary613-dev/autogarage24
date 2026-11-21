import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BOOKING_KINDS, BOOKING_STATUS, formatSlot, nowMs } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Prenotazioni auto", robots: { index: false } };

export default function BookingsPage(props: PageProps<"/dashboard/prenotazioni">) {
  return (
    <>
      <PageHeader title="Prenotazioni di visione e test drive" description="Le prenotazioni che hai richiesto e quelle ricevute sui tuoi annunci." actions={<ButtonLink href="/dashboard/disponibilita" variant="outline">I miei orari</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-64" />}><List searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser("/dashboard/prenotazioni");
  const sp = await searchParams;
  const tab = sp.vista === "ricevute" || sp.vista === "venditore" ? "ricevute" : "richieste";
  const supabase = await createClient();
  const { data } = await supabase.from("vehicle_bookings").select("id, kind, status, starts_at, proposed_starts_at, created_at, vehicle_listings(title, slug)")
    .eq(tab === "ricevute" ? "seller_id" : "buyer_id", user.id).order("starts_at", { ascending: false }).limit(200);
  const now = nowMs();
  const upcoming = (data ?? []).filter((b) => new Date(b.starts_at).getTime() >= now && ["in_attesa", "confermato", "modifica_proposta"].includes(b.status)).reverse();
  const past = (data ?? []).filter((b) => !upcoming.includes(b));
  return (
    <>
      <TabLinks current={tab} items={[{ key: "richieste", label: "Richieste da me", href: "/dashboard/prenotazioni" }, { key: "ricevute", label: "Ricevute sui miei annunci", href: "/dashboard/prenotazioni?vista=ricevute" }]} />
      {!data?.length ? (
        <EmptyState title={tab === "ricevute" ? "Nessuna prenotazione ricevuta" : "Nessuna prenotazione"} description={tab === "ricevute" ? "Configura i tuoi orari: gli acquirenti potranno prenotare solo negli orari che indichi." : "Prenota una visione o un test drive dalla scheda di un'auto."}
          action={<ButtonLink href={tab === "ricevute" ? "/dashboard/disponibilita" : "/auto-usate"}>{tab === "ricevute" ? "Configura i tuoi orari" : "Trova la tua auto"}</ButtonLink>} />
      ) : (
        <div className="flex flex-col gap-6">
          <section><h2 className="mb-2 font-bold">Prossimi ({upcoming.length})</h2>{upcoming.length ? <ul className="flex flex-col gap-2">{upcoming.map((b) => <Row key={b.id} b={b} />)}</ul> : <p className="text-sm text-muted">Nessun appuntamento in programma.</p>}</section>
          {past.length > 0 && <section><h2 className="mb-2 font-bold">Storico</h2><ul className="flex flex-col gap-2">{past.map((b) => <Row key={b.id} b={b} />)}</ul></section>}
        </div>
      )}
    </>
  );
}

type BookingRow = { id: string; kind: string; status: string; starts_at: string; proposed_starts_at: string | null; vehicle_listings: unknown };
function Row({ b }: { b: BookingRow }) {
    const l = b.vehicle_listings as unknown as { title: string; slug: string } | null;
    const st = BOOKING_STATUS[b.status];
    return (
      <li><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0"><p className="font-bold"><Link href={`/dashboard/prenotazioni/${b.id}`} className="hover:underline">{l?.title ?? "Annuncio"}</Link></p>
          <p className="text-sm text-graphite">{BOOKING_KINDS[b.kind]} · <span className="capitalize">{formatSlot(b.starts_at)}</span></p>
          {b.status === "modifica_proposta" && b.proposed_starts_at && <p className="text-sm text-orange-700">Proposto: {formatSlot(b.proposed_starts_at)}</p>}</div>
        <Badge tone={st.tone}>{st.label}</Badge>
      </Card></li>
    );
}
