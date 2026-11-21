import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { BarList, PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Amministrazione", robots: { index: false, follow: false } };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <>
      <PageHeader eyebrow="Pannello amministrativo" title="Panoramica" description="Dati reali dal database. Scegli l'intervallo per le statistiche del periodo." />
      <Suspense fallback={<Skeleton className="h-[600px]" />}><Stats searchParams={props.searchParams} /></Suspense>
    </>
  );
}

type Recent = {
  registrations: { id: string; name: string; email: string | null; created_at: string; roles: string[] | null }[];
  activity: { kind: string; label: string; at: string; link: string | null; status: string | null }[];
  contact_requests: number; service_requests: number; workshops: number; mechanics: number; vehicles_total: number;
};
type Stats = Record<string, unknown> & { roles?: Record<string, number>; daily?: { day: string; users: number; requests: number; listings: number }[] };

async function Stats({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const user = await requireAdmin("/admin");
  const sp = await searchParams;
  const days = [7, 30, 90, 365].includes(Number(sp.giorni)) ? Number(sp.giorni) : 30;
  if (!user.permissions.includes("stats.view")) return <Alert tone="info">Il tuo ruolo non include le statistiche. Usa il menu per le sezioni a cui hai accesso.</Alert>;
  const supabase = await createClient();
  const [{ data, error }, { data: audit }, { data: recent }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats", { days }),
    user.permissions.includes("audit.view") ? supabase.from("admin_audit_logs").select("id, action, target_table, created_at").order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    supabase.rpc("admin_recent_activity", { max_rows: 10 }),
  ]);
  const r = (recent ?? null) as unknown as Recent | null;
  if (error || !data) return <Alert tone="error">Statistiche non disponibili.</Alert>;
  const s = data as Stats;
  const n = (k: string) => Number(s[k] ?? 0);
  const roles = s.roles ?? {};
  const tiles: [string, number, string?][] = [
    ["Utenti registrati", n("users_total")], [`Nuovi utenti (${days} gg)`, n("users_new")],
    ["Automobili pubblicate", n("listings_published")], ["Annunci auto in attesa", n("listings_pending"), "/admin/moderazione"],
    ["Ricambi pubblicati", n("parts_published")], ["Ricambi in attesa", n("parts_pending"), "/admin/moderazione?tab=ricambi"],
    ["Profili da verificare", n("profiles_pending"), "/admin/verifiche"], ["Richieste di verifica", n("verifications_pending"), "/admin/verifiche?tab=richieste"],
    [`Richieste (${days} gg)`, n("requests_period")], [`Preventivi (${days} gg)`, n("quotes_period")],
    [`Appuntamenti confermati (${days} gg)`, n("appointments_confirmed_period")], ["Ticket aperti", n("tickets_open"), "/admin/supporto"],
    ["Segnalazioni aperte", n("reports_open"), "/admin/segnalazioni"], ["Recensioni pubblicate", n("reviews_published")],
    ["Email in errore", n("emails_failed"), "/admin/sistema"], ["Richieste di cancellazione", n("deletion_requests_open"), "/admin/gdpr"],
    ...(r ? ([["Officine pubblicate", r.workshops, "/admin/professionisti"], ["Meccanici pubblicati", r.mechanics, "/admin/professionisti?tipo=meccanico"],
      ["Richieste di assistenza (totale)", r.service_requests], ["Richieste di contatto (totale)", r.contact_requests]] as [string, number, string?][]) : []),
  ];
  const daily = s.daily ?? [];
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-2" aria-label="Intervallo">{[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin?giorni=${d}`} aria-current={d === days ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${d === days ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{d === 365 ? "1 anno" : `${d} giorni`}</Link>)}</nav>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, value, href]) => {
          const inner = <><span className="text-2xl font-extrabold tabular-nums">{value.toLocaleString("it-IT")}</span><span className="text-sm text-muted">{label}</span></>;
          return <li key={label}>{href ? <Link href={href} className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink">{inner}</Link> : <div className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-card">{inner}</div>}</li>;
        })}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5"><h2 className="mb-3 font-bold">Utenti per ruolo</h2><BarList items={Object.entries(roles).map(([k, v]) => ({ label: ROLE_LABELS[k as keyof typeof ROLE_LABELS] ?? k, value: Number(v) })).sort((a, b) => b.value - a.value)} format={(v) => v.toLocaleString("it-IT")} /></Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Andamento giornaliero ({days} gg)</h2>
          {daily.length === 0 ? <p className="text-sm text-muted">Nessun dato nel periodo.</p> : <DailyChart data={daily} />}
        </Card>
      </div>
      {r && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5"><h2 className="mb-3 font-bold">Ultime registrazioni</h2>
            {!r.registrations.length ? <p className="text-sm text-muted">Nessuna registrazione.</p> : <ul className="divide-y divide-line text-sm">{r.registrations.map((u) => <li key={u.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{user.permissions.includes("users.view") ? <Link className="font-semibold hover:underline" href={`/admin/utenti?q=${encodeURIComponent(u.email ?? u.name)}`}>{u.name}</Link> : u.name}{u.email ? <span className="text-muted"> · {u.email}</span> : null} <span className="text-muted">· {(u.roles ?? []).map((x) => ROLE_LABELS[x as keyof typeof ROLE_LABELS] ?? x).join(", ")}</span></span><span className="text-muted">{formatDateTime(u.created_at)}</span></li>)}</ul>}
          </Card>
          <Card className="p-5"><h2 className="mb-3 font-bold">Ultime attività sulla piattaforma</h2>
            {!r.activity.length ? <p className="text-sm text-muted">Nessuna attività.</p> : <ul className="divide-y divide-line text-sm">{r.activity.map((a, i) => <li key={i} className="flex flex-wrap justify-between gap-2 py-2"><span><span className="font-semibold capitalize">{a.kind}</span> · {a.link ? <Link className="hover:underline" href={a.link}>{a.label}</Link> : a.label} <span className="text-muted">({a.status?.replace(/_/g, " ")})</span></span><span className="text-muted">{formatDateTime(a.at)}</span></li>)}</ul>}
          </Card>
        </div>
      )}
      {(audit?.length ?? 0) > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Ultime operazioni amministrative</h2>
          <ul className="divide-y divide-line text-sm">{audit!.map((a) => <li key={a.id} className="flex justify-between gap-2 py-2"><span>{a.action} · {a.target_table}</span><span className="text-muted">{formatDateTime(a.created_at)}</span></li>)}</ul>
          <Link href="/admin/audit" className="mt-2 inline-block text-sm font-semibold text-orange-700 hover:underline">Registro completo →</Link>
        </Card>
      )}
    </div>
  );
}

function DailyChart({ data }: { data: { day: string; users: number; requests: number; listings: number }[] }) {
  const W = 600, H = 180, P = 24;
  const max = Math.max(1, ...data.flatMap((d) => [d.users, d.requests, d.listings]));
  const bw = (W - 2 * P) / data.length;
  const series: [keyof (typeof data)[number], string, string][] = [["users", "#111318", "Nuovi utenti"], ["requests", "#F47B20", "Richieste"], ["listings", "#737780", "Annunci creati"]];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Andamento giornaliero di utenti, richieste e annunci">
        {data.map((d, i) => series.map(([k, color], j) => {
          const v = Number(d[k]); const h = (v / max) * (H - 2 * P);
          return <rect key={`${i}-${k}`} x={P + i * bw + (j * bw) / 3} y={H - P - h} width={Math.max(1, bw / 3 - 1)} height={h} fill={color}><title>{`${d.day}: ${v}`}</title></rect>;
        }))}
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#d9dbe0" />
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs">{series.map(([, c, l]) => <span key={l} className="inline-flex items-center gap-1"><span className="size-3 rounded-sm" style={{ background: c }} aria-hidden />{l}</span>)}</figcaption>
    </figure>
  );
}
