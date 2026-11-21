import type { Metadata } from "next";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Email e sistema", robots: { index: false } };

export default function SystemPage() {
  return <AdminPage title="Email e sistema" description="Coda delle email transazionali, invii falliti e controlli di salute."><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("stats.view", "/admin/sistema");
  const supabase = await createClient();
  const [{ data: failed }, { count: queued }, { count: sent }, { data: errors }] = await Promise.all([
    supabase.from("email_outbox").select("id, template, subject, attempts, last_error, created_at, status").eq("status", "errore").order("created_at", { ascending: false }).limit(50),
    supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "in_coda"),
    supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "inviata"),
    supabase.from("app_errors").select("id, occurred_at, source, path, message, digest, device").order("occurred_at", { ascending: false }).limit(50),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-2xl font-extrabold">{queued ?? 0}</p><p className="text-sm text-muted">Email in coda</p></Card>
        <Card className="p-4"><p className="text-2xl font-extrabold">{sent ?? 0}</p><p className="text-sm text-muted">Email inviate</p></Card>
        <Card className="p-4"><p className="text-2xl font-extrabold">{failed?.length ?? 0}</p><p className="text-sm text-muted">Email in errore (ultime 50)</p></Card>
      </div>
      {(queued ?? 0) > 0 && (sent ?? 0) === 0 && <Alert tone="warning">Ci sono email in coda ma nessuna è mai stata inviata: il servizio email non è ancora configurato (vedi docs/EMAIL.md).</Alert>}
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Invii non riusciti</h2>
        {!failed?.length ? <EmptyState title="Nessun errore" /> : (
          <ul className="divide-y divide-line text-sm">{failed.map((e) => <li key={e.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{e.subject} <Badge tone="neutral">{e.template}</Badge></span><span className="text-muted">{e.attempts} tentativi · {e.last_error ?? "—"} · {formatDateTime(e.created_at)}</span></li>)}</ul>
        )}
        <p className="mt-2 text-xs text-muted">Gli indirizzi email non sono mostrati qui per ridurre l&apos;esposizione dei dati personali.</p>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Errori dell&apos;applicazione (ultimi 50, conservati 90 giorni)</h2>
        {!errors?.length ? <EmptyState title="Nessun errore registrato" /> : (
          <ul className="divide-y divide-line text-sm">{errors.map((e) => <li key={e.id} className="py-2"><span className="font-mono">{e.message}</span><span className="block text-xs text-muted">{formatDateTime(e.occurred_at)} · {e.path ?? "—"} · {e.device ?? "—"}{e.digest ? ` · codice ${e.digest}` : ""}</span></li>)}</ul>
        )}
        <p className="mt-2 text-xs text-muted">I messaggi sono ripuliti da email, numeri di telefono, identificativi e token prima del salvataggio.</p>
      </Card>
      <Card className="p-5 text-sm">
        <h2 className="mb-2 font-bold">Controlli</h2>
        <p>Stato dell&apos;applicazione: <a className="font-semibold text-orange-700 underline" href="/api/health" target="_blank" rel="noopener noreferrer">/api/health</a> (da collegare a un servizio di monitoraggio uptime).</p>
        <p className="mt-1">Job pianificati nel database: promemoria giornalieri e scadenza annunci (pg_cron). Verifica l&apos;esecuzione in Supabase → Integrations → Cron.</p>
      </Card>
    </div>
  );
}
