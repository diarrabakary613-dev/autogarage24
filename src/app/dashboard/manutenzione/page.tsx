import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Bell, Car, FileText, Wallet, Wrench } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { MaintenanceTabs } from "@/components/garage/maintenance-tabs";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { reminderAction, saveReminder } from "@/lib/actions/garage";
import { MAINTENANCE_LABELS, RECORD_SOURCE_LABELS, REMINDER_CATEGORY_LABELS, REMINDER_STATUS_LABELS } from "@/lib/labels";
import { formatKm, formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Manutenzione", robots: { index: false } };


export default function MaintenancePage() {
  return (
    <>
      <PageHeader title="Manutenzione" description="Lo stato delle tue automobili in base ai dati che hai registrato, con scadenze e promemoria." />
      <MaintenanceTabs current="panoramica" />
      <Suspense fallback={<Skeleton className="h-96" />}><Overview /></Suspense>
    </>
  );
}

async function Overview() {
  await requireUser("/dashboard/manutenzione");
  const supabase = await createClient();
  const year = new Date().getFullYear();
  const [vehicles, records, reminders, expenses, docs] = await Promise.all([
    supabase.from("user_vehicles").select("id, make, model, year, current_mileage_km, is_primary").is("deleted_at", null).order("is_primary", { ascending: false }),
    supabase.from("maintenance_records").select("id, title, category, performed_on, mileage_km, source, user_vehicle_id").order("performed_on", { ascending: false }).limit(6),
    supabase.from("maintenance_reminders").select("*").order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("vehicle_expenses").select("amount_cents").gte("spent_on", `${year}-01-01`),
    supabase.from("user_vehicle_documents").select("id, title, category, created_at").order("created_at", { ascending: false }).limit(4),
  ]);
  const vs = vehicles.data ?? [];
  if (!vs.length) return <EmptyState icon={<Car className="size-6" aria-hidden />} title="Aggiungi la tua prima automobile" description="Il cruscotto della manutenzione si basa sulle auto del tuo garage." action={<ButtonLink href="/dashboard/garage-auto">Vai al garage</ButtonLink>} />;
  const name = new Map(vs.map((v) => [v.id, `${v.make} ${v.model}`]));
  const active = (reminders.data ?? []).filter((r) => ["attivo", "in_scadenza", "scaduto"].includes(r.status));
  const others = (reminders.data ?? []).filter((r) => !["attivo", "in_scadenza", "scaduto"].includes(r.status));
  const yearTotal = (expenses.data ?? []).reduce((s, e) => s + Number(e.amount_cents), 0);
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="stato-t">
        <h2 id="stato-t" className="mb-3 text-lg font-bold">Lo stato della tua automobile</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {vs.map((v) => {
            const last = (records.data ?? []).find((r) => r.user_vehicle_id === v.id);
            const due = active.filter((r) => r.user_vehicle_id === v.id);
            const missing = [v.current_mileage_km === null && "chilometraggio", !last && "interventi registrati", !due.length && "scadenze (revisione, assicurazione, bollo)"].filter(Boolean);
            return (
              <li key={v.id}><Card className="flex flex-col gap-2 p-5">
                <p className="font-bold">{v.make} {v.model} {v.year ?? ""} {v.is_primary && <Badge tone="orange">Principale</Badge>}</p>
                <p className="text-sm">Chilometraggio: <strong>{v.current_mileage_km !== null ? formatKm(v.current_mileage_km) : "non registrato"}</strong></p>
                <p className="text-sm">Ultimo intervento: <strong>{last ? `${last.title} (${formatDate(last.performed_on)})` : "nessuno registrato"}</strong></p>
                <p className="text-sm">Scadenze attive: <strong>{due.length}</strong>{due.some((d) => d.status === "scaduto") && <span className="text-danger"> · alcune scadute</span>}</p>
                {missing.length > 0 && <p className="text-xs text-muted">Dati mancanti: {missing.join(", ")}.</p>}
              </Card></li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted">Queste informazioni riassumono solo i dati inseriti: non sono una valutazione della sicurezza o delle condizioni meccaniche dell&apos;automobile.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4"><Wallet className="size-6 text-orange-700" aria-hidden /><span><span className="block text-2xl font-extrabold">{formatPrice(yearTotal)}</span><span className="text-sm text-muted">Spese registrate nel {year}</span></span></Card>
        <Link href="/dashboard/manutenzione/storico" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink"><Wrench className="size-6 text-orange-700" aria-hidden /><span><span className="block font-bold">Storico interventi</span><span className="text-sm text-muted">Registra e consulta</span></span></Link>
        <Link href="/dashboard/documenti-auto" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink"><FileText className="size-6 text-orange-700" aria-hidden /><span><span className="block font-bold">{docs.data?.length ? `${docs.data.length}+ documenti` : "Documenti"}</span><span className="text-sm text-muted">Fatture e ricevute</span></span></Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Bell className="size-5 text-orange-700" aria-hidden /> Scadenze e promemoria</h2>
          {!active.length ? <p className="text-sm text-muted">Nessun promemoria attivo. Aggiungi revisione, assicurazione, bollo o manutenzioni con le date che conosci.</p> : (
            <ul className="flex flex-col gap-3">
              {active.map((r) => (
                <li key={r.id} className={`rounded-xl border p-4 ${r.status === "scaduto" ? "border-danger/30 bg-danger-50" : r.status === "in_scadenza" ? "border-warning/30 bg-warning-50" : "border-line"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{r.title} · <span className="font-normal text-muted">{name.get(r.user_vehicle_id)}</span></p>
                    <Badge tone={r.status === "scaduto" ? "danger" : r.status === "in_scadenza" ? "warning" : "neutral"}>{REMINDER_STATUS_LABELS[r.status]}</Badge>
                  </div>
                  <p className="text-sm text-graphite">{REMINDER_CATEGORY_LABELS[r.category] ?? r.category}{r.due_date && ` · entro il ${formatDate(r.due_date)}`}{r.due_mileage_km !== null && ` · a ${formatKm(r.due_mileage_km)}`}{r.recurrence_months && ` · ogni ${r.recurrence_months} mesi`}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ActionForm action={reminderAction} submitLabel="Fatto" size="sm" hidden={{ reminder_id: r.id, action: "completa" }} />
                    <ActionForm action={reminderAction} submitLabel="Disattiva" size="sm" variant="outline" hidden={{ reminder_id: r.id, action: "disattiva" }} />
                    {["tagliando", "cambio_olio", "pneumatici", "batteria", "manutenzione"].includes(r.category) && <ButtonLink href="/garages" size="sm" variant="ghost">Trova un&apos;officina</ButtonLink>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {others.length > 0 && (
            <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Completati e disattivati ({others.length})</summary>
              <ul className="mt-2 flex flex-col gap-2 text-sm">{others.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-mist p-2"><span>{r.title} · {REMINDER_STATUS_LABELS[r.status]}</span><span className="flex gap-2">{r.status === "disattivato" && <ActionForm action={reminderAction} submitLabel="Riattiva" size="sm" variant="outline" hidden={{ reminder_id: r.id, action: "riattiva" }} />}<ActionForm action={reminderAction} submitLabel="Elimina" size="sm" variant="danger" hidden={{ reminder_id: r.id, action: "elimina" }} confirm="Eliminare?" /></span></li>)}</ul>
            </details>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Nuovo promemoria</h2>
          <ActionForm action={saveReminder} submitLabel="Salva promemoria" resetOnSuccess>
            {(s) => {
              const fe = s.fieldErrors ?? {};
              return (<>
                <Field id="rm-v" label="Automobile" error={fe.user_vehicle_id}><Select id="rm-v" name="user_vehicle_id">{vs.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</Select></Field>
                <Field id="rm-c" label="Tipo" error={fe.category}><Select id="rm-c" name="category">{Object.entries(REMINDER_CATEGORY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field id="rm-t" label="Titolo" error={fe.title}><Input id="rm-t" name="title" placeholder="Es. Revisione periodica" /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="rm-d" label="Data di scadenza" error={fe.due_date}><Input id="rm-d" name="due_date" type="date" /></Field>
                  <Field id="rm-km" label="Oppure a km" optional><Input id="rm-km" name="due_mileage_km" inputMode="numeric" /></Field>
                  <Field id="rm-rm" label="Ripeti ogni (mesi)" optional><Input id="rm-rm" name="recurrence_months" inputMode="numeric" /></Field>
                  <Field id="rm-rk" label="Ripeti ogni (km)" optional><Input id="rm-rk" name="recurrence_km" inputMode="numeric" /></Field>
                </div>
                <Field id="rm-n" label="Avvisami giorni prima" optional><Input id="rm-n" name="notify_days_before" inputMode="numeric" defaultValue={15} /></Field>
                <Field id="rm-de" label="Note" optional><Textarea id="rm-de" name="description" rows={2} /></Field>
                <Checkbox id="rm-e" name="notify_email" label="Avvisami anche via email (se configurata)" />
              </>);
            }}
          </ActionForm>
          <p className="mt-3 flex gap-2 text-xs text-muted"><AlertTriangle className="size-4 shrink-0" aria-hidden />Gli intervalli di manutenzione dipendono dal costruttore e dall&apos;uso dell&apos;auto: inserisci le scadenze indicate nel libretto di manutenzione o dal tuo meccanico.</p>
        </Card>
      </div>

      {(records.data?.length ?? 0) > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 text-lg font-bold">Ultimi interventi</h2>
          <ul className="divide-y divide-line">{records.data!.map((r) => <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><strong>{r.title}</strong> · {MAINTENANCE_LABELS[r.category]} · {name.get(r.user_vehicle_id)}</span><span className="flex items-center gap-2"><Badge tone={r.source === "professionista" ? "success" : "neutral"}>{RECORD_SOURCE_LABELS[r.source]}</Badge>{formatDate(r.performed_on)}</span></li>)}</ul>
        </Card>
      )}
      <Alert tone="info">Le notifiche delle scadenze vengono calcolate ogni giorno dal server (job pianificato) e non dipendono dal browser aperto.</Alert>
    </div>
  );
}
