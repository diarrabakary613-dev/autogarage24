import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PeriodFilter, pct, type Stats } from "@/components/business/period-filter";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/misc";
import { getBusinessContext, LEAD_SOURCES, LEAD_STATUS, readPeriod } from "@/lib/business/context";
import { nowMs } from "@/lib/bookings/time";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Panoramica" };

export default function BusinessHome(props: PageProps<"/business">) {
  return (
    <>
      <PageHeader title="AutoGarage24 Business Center" description="Il centro di controllo della tua attività: dati reali dalle richieste, dalle prenotazioni e dalle visite registrate sulla piattaforma." />
      <Suspense fallback={<Skeleton className="h-96" />}><Overview searchParams={props.searchParams} /></Suspense>
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card className="p-4"><p className="text-sm text-muted">{label}</p><p className="text-2xl font-extrabold tabular-nums">{value}</p>{hint && <p className="text-xs text-muted">{hint}</p>}</Card>;
}

async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can } = await getBusinessContext();
  const sp = await searchParams;
  const per = readPeriod(sp, nowMs());
  const pid = current.profile_id;
  const [stats, comp, leads, tasks, plan] = await Promise.all([
    can("statistiche") ? supabase.rpc("business_stats", { profile_id: pid, p_from: per.from.toISOString(), p_to: per.to.toISOString() }) : Promise.resolve({ data: null }),
    supabase.rpc("business_profile_completeness", { profile_id: pid }),
    can("lead") ? supabase.rpc("business_leads", { profile_id: pid, p_from: per.from.toISOString(), p_to: per.to.toISOString() }) : Promise.resolve({ data: null }),
    can("attivita") ? supabase.from("business_tasks").select("id, title, priority, due_at").eq("profile_id", pid).eq("status", "aperta").order("due_at", { ascending: true, nullsFirst: false }).limit(5) : Promise.resolve({ data: null }),
    supabase.rpc("business_plan", { profile_id: pid }),
  ]);
  const s = stats.data as Stats | null;
  const c = comp.data as { score: number; items: { key: string; ok: boolean; tip: string; href: string }[] } | null;
  const p = plan.data as { plan_name: string; analytics_days: number } | null;
  return (
    <div className="flex flex-col gap-5">
      {s && <PeriodFilter base="/business" current={per.key} da={per.da} a={per.a} maxDays={s.max_days} />}
      {s ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Visualizzazioni del profilo" value={s.profile_views} hint={s.views_tracked_since ? `registrate dal ${s.views_tracked_since}` : "registrazione avviata da oggi"} />
            <Kpi label="Visualizzazioni annunci" value={s.listing_views} />
            <Kpi label="Nuovi contatti" value={s.contacts} />
            <Kpi label="Richieste di preventivo" value={s.quote_requests} />
            <Kpi label="Prenotazioni ricevute" value={s.bookings} hint={`${s.bookings_confirmed} confermate`} />
            <Kpi label="Appuntamenti" value={s.appointments} />
            <Kpi label="Da gestire" value={s.pending} />
            <Kpi label="Servizi completati" value={s.completed} />
            <Kpi label="Recensioni" value={s.reviews} hint={s.reviews_avg ? `media ${String(s.reviews_avg).replace(".", ",")}` : undefined} />
            <Kpi label="Contatti → appuntamenti" value={pct(s.conv_contact_appt)} hint={s.conv_contact_appt === null ? "servono almeno 5 contatti" : undefined} />
            <Kpi label="Appuntamenti → completati" value={pct(s.conv_appt_done)} hint={s.conv_appt_done === null ? "servono almeno 5 appuntamenti" : undefined} />
          </div>
        </>
      ) : <Alert tone="info">Il tuo ruolo non include le statistiche.</Alert>}
      <div className="grid gap-4 lg:grid-cols-2">
        {leads.data && (
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Ultimi contatti</h2><Link className="text-sm underline" href="/business/lead">Tutti</Link></div>
            {!leads.data.length ? <p className="text-sm text-muted">Nessun contatto nel periodo.</p> : <ul className="flex flex-col gap-1.5 text-sm">{leads.data.slice(0, 6).map((l) => (
              <li key={`${l.source}-${l.source_id}`} className="flex items-center justify-between gap-2"><span className="truncate"><strong>{l.customer_name}</strong> · {LEAD_SOURCES[l.source]} · {l.title}</span><Badge tone={LEAD_STATUS[l.lead_status].tone}>{LEAD_STATUS[l.lead_status].label}</Badge></li>))}</ul>}
          </Card>
        )}
        {tasks.data && (
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Attività aperte</h2><Link className="text-sm underline" href="/business/attivita">Gestisci</Link></div>
            {!tasks.data.length ? <p className="text-sm text-muted">Nessuna attività aperta.</p> : <ul className="flex flex-col gap-1.5 text-sm">{tasks.data.map((t) => <li key={t.id}>{t.priority === "alta" ? "● " : ""}{t.title}{t.due_at ? ` · entro ${formatDateTime(t.due_at)}` : ""}</li>)}</ul>}
          </Card>
        )}
        {c && (
          <Card className="p-5">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-bold">Completezza del profilo: {c.score}/100</h2><Link className="text-sm underline" href="/business/presenza">Migliora</Link></div>
            <div className="h-2 rounded-full bg-mist"><div className="h-2 rounded-full bg-orange" style={{ width: `${c.score}%` }} /></div>
            <ul className="mt-2 text-sm">{c.items.filter((i) => !i.ok).slice(0, 3).map((i) => <li key={i.key}>• <Link className="underline" href={i.href}>{i.tip}</Link></li>)}</ul>
            <p className="mt-2 text-xs text-muted">Il punteggio misura la completezza dei dati: non garantisce posizionamento né clienti.</p>
          </Card>
        )}
        {p && <Card className="p-5 text-sm"><h2 className="font-bold">Piano: {p.plan_name}</h2><p className="text-muted">Gratuito durante il lancio. Nessun abbonamento a pagamento è attivo.</p></Card>}
      </div>
    </div>
  );
}
