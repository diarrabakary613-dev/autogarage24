import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Card } from "@/components/ui/feedback";
import { BarList } from "@/components/ui/misc";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Analytics e risultati", robots: { index: false } };
const EVENTS: Record<string, string> = {
  page_view: "Pagine viste", cta_click: "Clic sulle CTA", ricerca_auto: "Ricerche auto", apertura_scheda_auto: "Schede auto aperte", ricerca_officine: "Ricerche officine",
  ricerca_ricambi: "Ricerche ricambi", apertura_profilo: "Profili aperti", calcolo_neopatentati: "Calcoli neopatentati", mappa_ricerca: "Ricerche sulla mappa",
  registrazione: "Registrazioni", candidatura_partner: "Candidature partner", iscrizione_beta: "Iscrizioni Beta", richiesta_inviata: "Richieste inviate",
};
type T = { page_views: number; entries: number; by_event: Record<string, number>; by_source: { source: string; entries: number; conversions: number }[]; by_device: Record<string, number>; daily: { day: string; page_views: number; registrations: number; applications: number }[] };
type G = { traffic: T; platform: Record<string, number>; crm: { contacted: number; registered: number; conversion_rate: number | null }; applications: { period: number; accepted: number } };

export default function AnalyticsPage(props: PageProps<"/admin/analytics">) {
  return <AdminPage title="Analytics e risultati" description="Misurazione senza cookie e senza dati personali: nessun identificativo di utente, dispositivo o indirizzo IP. Chi attiva «Do Not Track» o Global Privacy Control non viene conteggiato."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("analytics.view", "/admin/analytics");
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.giorni)) ? Number(sp.giorni) : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_growth_stats", { days });
  if (error || !data) return <Alert tone="error">Dati non disponibili.</Alert>;
  const g = data as unknown as G;
  const e = g.traffic.by_event;
  const funnel = [
    { label: "Ingressi sul sito", value: g.traffic.entries },
    { label: "Ricerche (auto, officine, ricambi)", value: (e.ricerca_auto ?? 0) + (e.ricerca_officine ?? 0) + (e.ricerca_ricambi ?? 0) },
    { label: "Schede e profili aperti", value: (e.apertura_scheda_auto ?? 0) + (e.apertura_profilo ?? 0) },
    { label: "Registrazioni", value: e.registrazione ?? 0 },
    { label: "Richieste inviate", value: e.richiesta_inviata ?? 0 },
  ];
  const maxDay = Math.max(1, ...g.traffic.daily.map((d) => d.page_views));
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">Periodo:{[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin/analytics?giorni=${d}`} className={`rounded-full border px-3 py-1 ${d === days ? "border-ink bg-ink text-white" : "border-line"}`}>{d === 365 ? "1 anno" : `${d} giorni`}</Link>)}</div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Visitatori (ingressi)", g.traffic.entries], ["Pagine viste", g.traffic.page_views], ["Registrazioni", g.platform.registrations_period], ["Candidature partner", g.applications.period],
          ["Partner approvati", g.platform.professionals_approved], ["Auto pubblicate", g.platform.vehicles_published], ["Officine presenti", g.platform.workshops], ["Meccanici presenti", g.platform.mechanics],
          ["Richieste inviate", g.platform.requests_period], ["Richieste con risposta", g.platform.requests_answered_period], ["Preventivi accettati", g.platform.quotes_accepted_period], ["Conversione CRM", g.crm.conversion_rate === null ? "—" : `${g.crm.conversion_rate}%`]]
          .map(([l, v]) => <Card key={l as string} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v}</p></Card>)}
      </div>
      <p className="text-xs text-muted">«Visitatori» conta gli ingressi (prima pagina di ogni visita), non persone uniche: senza identificativi non è possibile distinguerle, ed è una scelta di privacy.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-bold">Funnel</h2><BarList items={funnel} format={(v) => String(v)} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Sorgenti di traffico</h2>{!g.traffic.by_source.length ? <p className="text-sm text-muted">Nessun dato.</p> : <BarList items={g.traffic.by_source.map((s) => ({ label: `${s.source} (${s.conversions} conv.)`, value: s.entries }))} format={(v) => String(v)} />}</Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Eventi</h2><BarList items={Object.entries(e).map(([k, v]) => ({ label: EVENTS[k] ?? k, value: v })).sort((a, b) => b.value - a.value)} format={(v) => String(v)} /></Card>
        <Card className="p-5"><h2 className="mb-3 font-bold">Dispositivi</h2><BarList items={Object.entries(g.traffic.by_device).map(([k, v]) => ({ label: k, value: v }))} format={(v) => String(v)} /></Card>
      </div>
      <Card className="p-5"><h2 className="mb-3 font-bold">Pagine viste per giorno</h2>
        <div className="flex h-40 items-end gap-px" role="img" aria-label="Andamento giornaliero delle pagine viste">
          {g.traffic.daily.map((d) => <div key={d.day} title={`${d.day}: ${d.page_views} pagine, ${d.registrations} registrazioni`} className="flex-1 rounded-t bg-orange/80" style={{ height: `${Math.max(2, (d.page_views / maxDay) * 100)}%` }} />)}
        </div>
      </Card>
      <p className="text-sm">Risultati per campagna e landing: <Link className="underline" href="/admin/marketing/risultati">Centro marketing</Link>. Attività commerciali: <Link className="underline" href="/admin/acquisizione">Acquisizione</Link>.</p>
    </div>
  );
}
