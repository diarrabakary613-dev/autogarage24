import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saveRoadsideOperator, setRoadsideAvailability } from "@/lib/actions/roadside";
import { OPERATOR_STATUS, ROADSIDE_SERVICES, VEHICLE_TYPES } from "@/lib/services/labels";
import { formatDateTime } from "@/lib/utils";
import { nowMs } from "@/lib/bookings/time";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Operatore di assistenza stradale", robots: { index: false } };

export default function RoadsideOperatorPage() {
  return (
    <>
      <PageHeader title="Operatore di assistenza stradale" description="Servizi, zona coperta e disponibilità. Ricevi richieste solo quando ti dichiari disponibile." actions={<ButtonLink href="/dashboard/soccorso?vista=ricevute" variant="outline">Richieste ricevute</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/soccorso/operatore");
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id, display_name, professional_type, service_radius_km, city, latitude, review_status, is_published")
    .eq("user_id", user.id).in("professional_type", ["soccorritore", "officina", "meccanico"]);
  if (!profiles?.length) return <EmptyState title="Serve un profilo professionale" description="Il servizio di soccorso è disponibile per soccorritori, officine e meccanici registrati." action={<ButtonLink href="/registrati?ruolo=soccorritore">Registrati come soccorritore</ButtonLink>} />;
  const p = profiles[0];
  const [{ data: op }, { data: targets }, { data: done }] = await Promise.all([
    supabase.from("roadside_operators").select("*").eq("profile_id", p.id).maybeSingle(),
    supabase.from("roadside_targets").select("status").eq("profile_id", p.id),
    supabase.from("roadside_requests").select("status").eq("operator_profile_id", p.id),
  ]);
  const available = op && (op.h24 || (op.available_until && new Date(op.available_until).getTime() > nowMs()));
  const count = (s: string[]) => (targets ?? []).filter((t) => s.includes(t.status)).length;
  return (
    <div className="flex flex-col gap-5">
      {!p.is_published || p.review_status !== "approvato" ? <Alert tone="warning">Il tuo profilo professionale non è ancora pubblicato e approvato: completa il <Link className="underline" href="/dashboard/profilo-professionale">profilo aziendale</Link> per poter ricevere richieste.</Alert> : null}
      {!p.latitude && <Alert tone="info">Il profilo non ha una posizione: completa l&apos;indirizzo nel profilo per calcolare la zona coperta (raggio attuale {p.service_radius_km ?? 30} km).</Alert>}
      {op && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">Stato del servizio</h2><Badge tone={OPERATOR_STATUS[op.status].tone}>{OPERATOR_STATUS[op.status].label}</Badge>{op.status === "attivo" && <Badge tone={available ? "success" : "neutral"}>{available ? "Ricevi richieste" : "Non ricevi richieste"}</Badge>}</div>
          {op.admin_note && <p className="text-sm">Nota dello staff: {op.admin_note}</p>}
          {op.status === "attivo" && (
            <>
              <p className="text-sm">{op.h24 ? "Hai dichiarato reperibilità H24." : op.available_until && available ? `Disponibile fino a ${formatDateTime(op.available_until)}.` : "Dichiara per quante ore sei disponibile: la disponibilità scade da sola."}</p>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 4, 8, 12, 24].map((h) => <ActionForm key={h} action={setRoadsideAvailability} submitLabel={`${h} h`} size="sm" variant="outline" hidden={{ profile_id: p.id, hours: String(h) }} />)}
                <ActionForm action={setRoadsideAvailability} submitLabel="Sospendi nuove richieste" size="sm" variant="ghost" hidden={{ profile_id: p.id, hours: "0" }} />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([["Richieste ricevute", targets?.length ?? 0], ["Preventivi inviati", count(["preventivo", "scelta", "scartata"])], ["Interventi assegnati", done?.length ?? 0], ["Completati", (done ?? []).filter((d) => d.status === "completata").length]] as [string, number][])
              .map(([l, v]) => <div key={l} className="rounded-xl bg-mist p-3"><p className="text-xs text-muted">{l}</p><p className="text-xl font-extrabold tabular-nums">{v}</p></div>)}
          </div>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="mb-3 font-bold">{op ? "Servizi offerti" : "Attiva il servizio di soccorso"}</h2>
        <ActionForm action={saveRoadsideOperator} submitLabel={op ? "Salva" : "Invia per la verifica"} hidden={{ profile_id: p.id }}>
          {((s: FormState) => (
            <>
              <fieldset><legend className="mb-1 text-sm font-semibold">Interventi {s.fieldErrors?.services && <span className="text-danger">· {s.fieldErrors.services}</span>}</legend>
                <div className="grid gap-2 sm:grid-cols-2">{Object.entries(ROADSIDE_SERVICES).map(([k, l]) => <Checkbox key={k} id={`sv-${k}`} name="services" value={k} label={l} defaultChecked={op?.services.includes(k)} />)}</div></fieldset>
              <fieldset><legend className="mb-1 text-sm font-semibold">Veicoli</legend>
                <div className="flex flex-wrap gap-3">{Object.entries(VEHICLE_TYPES).map(([k, l]) => <Checkbox key={k} id={`vt-${k}`} name="vehicle_types" value={k} label={l} defaultChecked={op ? op.vehicle_types.includes(k) : k === "auto"} />)}</div></fieldset>
              <Checkbox id="h24" name="h24" label="Reperibilità H24 (dichiarazione che verrà mostrata ai clienti)" defaultChecked={op?.h24} />
              <Field id="ht" label="Orari dichiarati" optional><Input id="ht" name="hours_text" maxLength={300} defaultValue={op?.hours_text ?? ""} placeholder="Lun–Sab 7–22" /></Field>
              <Field id="pn" label="Tariffe indicative" optional hint="Mostrate come «dichiarate dall'operatore». Il prezzo vincolante è quello del preventivo."><Textarea id="pn" name="price_notes" rows={2} maxLength={1000} defaultValue={op?.price_notes ?? ""} /></Field>
              <p className="text-xs text-muted">Zona coperta: raggio di {p.service_radius_km ?? 30} km dalla sede del profilo «{p.display_name}». Lo modifichi nel <Link className="underline" href="/dashboard/profilo-professionale">profilo aziendale</Link>. Per la verifica lo staff può chiederti visura camerale e autorizzazioni (es. iscrizione per l&apos;attività di soccorso e rimozione).</p>
            </>
          ))(initialFormState)}
        </ActionForm>
      </Card>
    </div>
  );
}
