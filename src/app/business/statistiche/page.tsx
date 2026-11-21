import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Bars, Daily, PeriodFilter, pct, type Stats } from "@/components/business/period-filter";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { getBusinessContext, LEAD_SOURCES, readPeriod } from "@/lib/business/context";
import { nowMs } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Statistiche" };

export default function StatsPage(props: PageProps<"/business/statistiche">) {
  return (
    <>
      <PageHeader title="Statistiche" description="Andamento di visualizzazioni, contatti e conversioni. Dati aggregati: nessun cliente è identificabile." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can } = await getBusinessContext("/business/statistiche");
  if (!can("statistiche")) return <Alert tone="info">Il tuo ruolo non include le statistiche.</Alert>;
  const sp = await searchParams;
  const per = readPeriod(sp, nowMs());
  const cat = typeof sp.categoria === "string" && sp.categoria in LEAD_SOURCES ? sp.categoria : null;
  const { data } = await supabase.rpc("business_stats", { profile_id: current.profile_id, p_from: per.from.toISOString(), p_to: per.to.toISOString() });
  const s = data as Stats;
  return (
    <div className="flex flex-col gap-4">
      <PeriodFilter base="/business/statistiche" current={per.key} da={per.da} a={per.a} maxDays={s.max_days} />
      <Card className="p-5"><h2 className="mb-3 font-bold">Andamento</h2><Daily data={s.daily} />
        {!s.views_tracked_since && <p className="mt-2 text-xs text-muted">Le visualizzazioni giornaliere sono registrate da quando è attivo il Business Center: i periodi precedenti mostrano solo i contatti.</p>}</Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-bold">Contatti per canale</h2>
          <div className="mb-2 flex flex-wrap gap-1 text-xs">{Object.keys(s.by_source).map((k) => <Link key={k} href={`/business/lead?fonte=${k}`} className="rounded-full border border-line px-2 py-0.5">{LEAD_SOURCES[k]}</Link>)}</div>
          <Bars data={cat ? { [cat]: s.by_source[cat] ?? 0 } : s.by_source} labels={LEAD_SOURCES} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Servizi e richieste più frequenti</h2><Bars data={s.by_kind} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Conversioni</h2>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt>Contatti</dt><dd className="text-right font-bold">{s.contacts}</dd>
            <dt>Appuntamenti</dt><dd className="text-right font-bold">{s.appointments}</dd>
            <dt>Servizi completati</dt><dd className="text-right font-bold">{s.completed}</dd>
            <dt>Contatti → appuntamenti</dt><dd className="text-right font-bold">{pct(s.conv_contact_appt)}</dd>
            <dt>Appuntamenti → servizi</dt><dd className="text-right font-bold">{pct(s.conv_appt_done)}</dd>
          </dl>
          <p className="mt-2 text-xs text-muted">Le percentuali compaiono solo con almeno 5 casi. Gli stati «appuntamento» e «completato» derivano dagli stati delle richieste e da quelli che imposti nel CRM.</p></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Provenienza dei contatti</h2><Bars data={s.by_city} />
          <p className="mt-2 text-xs text-muted">Solo città con almeno 3 contatti, in base alla città indicata dal cliente nel profilo.</p></Card>
        <Card className="p-5 lg:col-span-2"><h2 className="mb-3 font-bold">Annunci più visti</h2>
          {!s.top_listings.length ? <p className="text-sm text-muted">Nessun annuncio.</p> : (
            <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead className="text-left text-muted"><tr><th className="py-1">Annuncio</th><th className="text-right">Visite nel periodo</th><th className="text-right">Visite totali</th><th className="text-right">Richieste</th></tr></thead>
              <tbody className="divide-y divide-line">{s.top_listings.map((l) => <tr key={l.id}><td className="py-1"><Link className="underline" href={`/dashboard/annunci/${l.id}`}>{l.title}</Link></td><td className="text-right tabular-nums">{l.period_views}</td><td className="text-right tabular-nums">{l.total_views}</td><td className="text-right tabular-nums">{l.contacts}</td></tr>)}</tbody></table></div>
          )}</Card>
        <Card className="p-5 lg:col-span-2"><h2 className="mb-3 font-bold">Recensioni negli ultimi 12 mesi</h2>
          {!s.reviews_monthly.length ? <p className="text-sm text-muted">Nessuna recensione pubblicata.</p> : <Bars data={Object.fromEntries(s.reviews_monthly.map((r) => [`${r.month} (★ ${String(r.avg).replace(".", ",")})`, r.count]))} />}</Card>
      </div>
    </div>
  );
}
