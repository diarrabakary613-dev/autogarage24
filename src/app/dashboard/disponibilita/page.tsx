import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addAvailability, addBlock, deleteAvailability, deleteBlock, saveBookingSettings } from "@/lib/actions/bookings";
import { WEEKDAYS, formatSlot } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Disponibilità per visite e test drive", robots: { index: false } };

export default function AvailabilityPage() {
  return (
    <>
      <PageHeader title="Disponibilità per visite e test drive" description="Gli acquirenti vedono e prenotano solo gli orari che indichi qui, sui tuoi annunci pubblicati. Ogni prenotazione resta da confermare." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/disponibilita");
  const supabase = await createClient();
  const [{ data: s }, { data: av }, { data: blocks }, { data: cal }] = await Promise.all([
    supabase.from("booking_settings").select("*").eq("owner_id", user.id).maybeSingle(),
    supabase.from("booking_availability").select("*").eq("owner_id", user.id).order("weekday").order("start_time"),
    supabase.from("booking_blocks").select("*").eq("owner_id", user.id).gte("ends_at", new Date().toISOString()).order("starts_at"),
    supabase.from("calendar_connections").select("status").eq("owner_id", user.id).maybeSingle(),
  ]);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Regole di prenotazione</h2>
        <ActionForm action={saveBookingSettings} submitLabel="Salva le regole">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id="sm" label="Durata appuntamento"><Select id="sm" name="slot_minutes" defaultValue={String(s?.slot_minutes ?? 45)}>{[15, 20, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minuti</option>)}</Select></Field>
            <Field id="mn" label="Preavviso minimo (ore)"><Input id="mn" name="min_notice_hours" type="number" min={0} max={168} defaultValue={s?.min_notice_hours ?? 12} /></Field>
            <Field id="md" label="Prenotabile fino a (giorni)"><Input id="md" name="max_days_ahead" type="number" min={1} max={120} defaultValue={s?.max_days_ahead ?? 30} /></Field>
          </div>
          <Field id="ma" label="Indirizzo dell'incontro" optional hint="Mostrato all'acquirente solo dopo la conferma."><Input id="ma" name="meeting_address" maxLength={200} defaultValue={s?.meeting_address ?? ""} /></Field>
          <Checkbox id="tde" name="test_drive_enabled" defaultChecked={s?.test_drive_enabled ?? true} label="Accetto richieste di test drive" />
          <Field id="tdy" label="Anni minimi di patente per il test drive" optional><Input id="tdy" name="test_drive_min_years" type="number" min={0} max={30} defaultValue={s?.test_drive_min_years ?? ""} className="w-28" /></Field>
          <Field id="tdc" label="Condizioni del test drive" optional hint="Es. documento d'identità, copertura assicurativa del veicolo, percorso, accompagnatore."><Textarea id="tdc" name="test_drive_conditions" rows={3} maxLength={2000} defaultValue={s?.test_drive_conditions ?? ""} /></Field>
        </ActionForm>
      </Card>
      <div className="flex flex-col gap-5">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Fasce orarie settimanali</h2>
          {!s && <Alert tone="info" className="mb-3">Salva prima le regole di prenotazione: senza regole le fasce non vengono mostrate agli acquirenti.</Alert>}
          {av?.length ? (
            <ul className="mb-4 flex flex-col gap-1.5">{av.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-mist px-3 py-1.5 text-sm">
                <span><strong>{WEEKDAYS[a.weekday]}</strong> {a.start_time.slice(0, 5)}–{a.end_time.slice(0, 5)}</span>
                <ActionForm action={deleteAvailability} submitLabel="Elimina" size="sm" variant="ghost" hidden={{ id: a.id }} />
              </li>))}</ul>
          ) : <p className="mb-3 text-sm text-muted">Nessuna fascia: i tuoi annunci non mostrano il calendario di prenotazione.</p>}
          <ActionForm action={addAvailability} submitLabel="Aggiungi fascia" size="sm" resetOnSuccess>
            <fieldset><legend className="mb-1 text-sm font-semibold">Giorni</legend>
              <div className="flex flex-wrap gap-3">{WEEKDAYS.slice(1).map((d, i) => <Checkbox key={d} id={`wd-${i + 1}`} name="weekday" value={String(i + 1)} label={d.slice(0, 3)} />)}</div></fieldset>
            <div className="grid grid-cols-2 gap-2">
              <Field id="st" label="Dalle"><Input id="st" name="start_time" type="time" required defaultValue="09:00" /></Field>
              <Field id="et" label="Alle"><Input id="et" name="end_time" type="time" required defaultValue="12:00" /></Field>
            </div>
          </ActionForm>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">Periodi non disponibili</h2>
          {blocks?.length ? <ul className="mb-3 flex flex-col gap-1.5">{blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-mist px-3 py-1.5 text-sm">
              <span>{formatSlot(b.starts_at)} → {formatSlot(b.ends_at)}{b.reason ? ` · ${b.reason}` : ""}</span>
              <ActionForm action={deleteBlock} submitLabel="Rimuovi" size="sm" variant="ghost" hidden={{ id: b.id }} />
            </li>))}</ul> : <p className="mb-3 text-sm text-muted">Nessun periodo bloccato.</p>}
          <ActionForm action={addBlock} submitLabel="Blocca periodo" size="sm" resetOnSuccess>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field id="bs" label="Dal"><Input id="bs" name="starts_at" type="datetime-local" required /></Field>
              <Field id="be" label="Al"><Input id="be" name="ends_at" type="datetime-local" required /></Field>
            </div>
            <Field id="br" label="Motivo" optional><Input id="br" name="reason" maxLength={200} /></Field>
          </ActionForm>
        </Card>
        <Card className="p-5">
          <h2 className="font-bold">Google Calendar</h2>
          <p className="mt-1 text-sm text-graphite">Stato: <strong>{cal?.status === "attivo" ? "collegato" : "non configurato"}</strong>. La sincronizzazione richiede un&apos;app OAuth Google della piattaforma, non ancora attivata: per ora gestisci gli orari qui. Le prenotazioni confermate sono nelle notifiche e nell&apos;elenco prenotazioni.</p>
        </Card>
      </div>
    </div>
  );
}
