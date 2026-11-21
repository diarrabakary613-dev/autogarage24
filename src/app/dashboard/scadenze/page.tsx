import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatKm } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Scadenze delle mie auto", robots: { index: false } };
const MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
const DOW = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
const CAT: Record<string, string> = { revisione: "Revisione", assicurazione: "Assicurazione", bollo: "Bollo", cambio_olio: "Cambio olio", tagliando: "Tagliando", pneumatici: "Pneumatici", batteria: "Batteria", manutenzione: "Manutenzione", altro: "Altro" };

export default function DeadlinesPage(props: PageProps<"/dashboard/scadenze">) {
  return (
    <>
      <PageHeader title="Scadenze" description="Revisione, assicurazione, bollo, tagliandi e cambio gomme di tutte le tue auto. Le date sono quelle che inserisci tu." actions={<ButtonLink href="/dashboard/manutenzione">Aggiungi o modifica</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Calendar searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Calendar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser("/dashboard/scadenze");
  const sp = await searchParams;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(new Date());
  const m = typeof sp.mese === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mese) ? sp.mese : today.slice(0, 7);
  const [y, mo] = m.split("-").map(Number);
  const days = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
  const prev = new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
  const supabase = await createClient();
  const [{ data: rem }, { data: vehicles }] = await Promise.all([
    supabase.from("maintenance_reminders").select("id, user_vehicle_id, title, category, due_date, due_mileage_km, status").in("status", ["attivo", "in_scadenza", "scaduto"]).order("due_date", { nullsFirst: false }),
    supabase.from("user_vehicles").select("id, make, model, current_mileage_km").is("deleted_at", null),
  ]);
  if (!vehicles?.length) return <EmptyState title="Nessuna automobile nel garage" description="Aggiungi un'auto per inserire le scadenze." action={<ButtonLink href="/dashboard/garage-auto?nuova=1">Aggiungi automobile</ButtonLink>} />;
  const car = (id: string) => { const v = vehicles.find((x) => x.id === id); return v ? `${v.make} ${v.model}` : ""; };
  const byDay = new Map<string, NonNullable<typeof rem>>();
  for (const r of rem ?? []) if (r.due_date?.startsWith(m)) byDay.set(r.due_date, [...(byDay.get(r.due_date) ?? []), r]);
  const kmOnly = (rem ?? []).filter((r) => !r.due_date && r.due_mileage_km !== null);
  const overdue = (rem ?? []).filter((r) => r.status === "scaduto");
  return (
    <div className="flex flex-col gap-6">
      {overdue.length > 0 && <Alert tone="warning" title={`${overdue.length} scadenze superate`}>{overdue.map((r) => `${r.title} (${car(r.user_vehicle_id)})`).join(" · ")}. Aggiornale o segnale come completate da <Link className="underline" href="/dashboard/manutenzione">Manutenzione</Link>.</Alert>}
      <Card className="overflow-x-auto p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Link className="rounded-md border border-line px-3 py-1.5 text-sm" href={`?mese=${prev}`} aria-label="Mese precedente">←</Link>
          <h2 className="text-lg font-bold">{MONTHS[mo - 1]} {y}</h2>
          <Link className="rounded-md border border-line px-3 py-1.5 text-sm" href={`?mese=${next}`} aria-label="Mese successivo">→</Link>
        </div>
        <div className="grid min-w-[640px] grid-cols-7 gap-1">
          {DOW.map((d) => <div key={d} className="p-1 text-center text-xs font-bold text-muted">{d}</div>)}
          {Array.from({ length: lead }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: days }).map((_, i) => {
            const d = `${m}-${String(i + 1).padStart(2, "0")}`;
            return (
              <div key={d} className={`min-h-20 rounded-lg border p-1 text-xs ${d === today ? "border-orange" : "border-line"}`}>
                <span className="font-semibold text-muted">{i + 1}</span>
                {(byDay.get(d) ?? []).map((r) => <p key={r.id} className={`mt-0.5 truncate rounded px-1 py-0.5 ${r.status === "scaduto" ? "bg-danger-50 text-danger" : r.status === "in_scadenza" ? "bg-warning-50 text-warning" : "bg-mist"}`} title={`${r.title} — ${car(r.user_vehicle_id)}`}>{CAT[r.category] ?? r.title} · {car(r.user_vehicle_id).split(" ").slice(-1)}</p>)}
              </div>
            );
          })}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-2 font-bold">Elenco</h2>
        {!rem?.length ? <p className="text-sm text-muted">Nessuna scadenza attiva.</p> : (
          <ul className="divide-y divide-line text-sm">{rem.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{r.title}</strong> · {car(r.user_vehicle_id)}</span>
              <span className="flex items-center gap-2">{r.due_date && <span>{formatDate(r.due_date)}</span>}{r.due_mileage_km !== null && <span className="text-muted">a {formatKm(r.due_mileage_km)}</span>}<Badge tone={r.status === "scaduto" ? "danger" : r.status === "in_scadenza" ? "warning" : "neutral"}>{r.status.replace("_", " ")}</Badge></span>
            </li>
          ))}</ul>
        )}
        {kmOnly.length > 0 && <p className="mt-2 text-xs text-muted">{kmOnly.length} scadenze dipendono dal chilometraggio: si attivano quando registri i km nel garage.</p>}
        <p className="mt-3 text-xs text-muted">Riceverai un promemoria nell&apos;app (ed email, se attivata nelle preferenze) grazie a un controllo giornaliero sul server. Le notifiche push sono predisposte ma non ancora attive.</p>
      </Card>
    </div>
  );
}
