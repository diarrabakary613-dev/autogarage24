import type { Metadata } from "next";
import { Suspense } from "react";
import { PeriodFilter, pct, type Stats } from "@/components/business/period-filter";
import { PrintButton } from "@/components/business/print-button";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { getBusinessContext, LEAD_SOURCES, LEAD_STATUS, readPeriod } from "@/lib/business/context";
import { nowMs } from "@/lib/bookings/time";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Report ed esportazioni" };

export default function ReportPage(props: PageProps<"/business/report">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>;
}

const EXPORTS: [string, string][] = [["richieste", "Richieste ricevute"], ["preventivi", "Preventivi"], ["appuntamenti", "Appuntamenti"], ["completati", "Servizi completati"], ["mensile", "Andamento mensile"], ["annunci", "Performance degli annunci"]];

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can } = await getBusinessContext("/business/report");
  if (!can("esportazioni")) return <Alert tone="info">Il tuo ruolo non include report ed esportazioni.</Alert>;
  const sp = await searchParams;
  const per = readPeriod(sp, nowMs());
  const [{ data: stats }, { data: leads }] = await Promise.all([
    can("statistiche") ? supabase.rpc("business_stats", { profile_id: current.profile_id, p_from: per.from.toISOString(), p_to: per.to.toISOString() }) : Promise.resolve({ data: null }),
    can("lead") ? supabase.rpc("business_leads", { profile_id: current.profile_id, p_from: per.from.toISOString(), p_to: per.to.toISOString() }) : Promise.resolve({ data: null }),
  ]);
  const s = (stats ?? null) as Stats | null;
  const qs = `da=${per.da}&a=${per.a}`;
  return (
    <>
      <PageHeader title="Report ed esportazioni" description={`${current.display_name} · dal ${formatDate(per.da)} al ${formatDate(per.a)}`} actions={<PrintButton />} />
      <div className="print:hidden"><PeriodFilter base="/business/report" current={per.key} da={per.da} a={per.a} maxDays={s?.max_days ?? 90} /></div>
      <Card className="mb-4 p-5 print:hidden">
        <h2 className="mb-2 font-bold">Esporta in CSV (apribile con Excel)</h2>
        <div className="flex flex-wrap gap-2">{EXPORTS.map(([k, l]) => <a key={k} href={`/business/esporta?tipo=${k}&${qs}`} className="rounded-full border border-line-strong bg-white px-3 py-1.5 text-sm font-semibold">{l}</a>)}</div>
        <p className="mt-2 text-xs text-muted">I file contengono solo dati della tua azienda e il nome visualizzato dei clienti. Ogni esportazione è registrata.</p>
      </Card>
      {s && (
        <Card className="mb-4 p-5">
          <h2 className="mb-2 font-bold">Sintesi del periodo</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
            {([["Visualizzazioni profilo", s.profile_views], ["Visualizzazioni annunci", s.listing_views], ["Contatti", s.contacts], ["Richieste di preventivo", s.quote_requests],
              ["Prenotazioni", s.bookings], ["Appuntamenti", s.appointments], ["Servizi completati", s.completed], ["Recensioni", s.reviews],
              ["Contatti → appuntamenti", pct(s.conv_contact_appt)], ["Appuntamenti → servizi", pct(s.conv_appt_done)]] as [string, string | number][]).map(([l, v]) => <div key={l}><dt className="text-muted">{l}</dt><dd className="font-bold">{v}</dd></div>)}
          </dl>
        </Card>
      )}
      {leads && (
        <Card className="p-5">
          <h2 className="mb-2 font-bold">Richieste ricevute ({leads.length})</h2>
          <table className="w-full text-sm"><thead className="text-left text-muted"><tr><th className="py-1">Data</th><th>Canale</th><th>Oggetto</th><th>Cliente</th><th>Stato</th></tr></thead>
            <tbody className="divide-y divide-line">{leads.map((l) => <tr key={`${l.source}-${l.source_id}`}><td className="py-1">{formatDateTime(l.received_at)}</td><td>{LEAD_SOURCES[l.source]}</td><td>{l.title}</td><td>{l.customer_name}</td><td>{LEAD_STATUS[l.lead_status].label}</td></tr>)}</tbody></table>
        </Card>
      )}
      <p className="mt-3 text-xs text-muted">Report generato il {formatDateTime(new Date(nowMs()).toISOString())} da AutoGarage24 Business Center con dati registrati sulla piattaforma.</p>
    </>
  );
}
