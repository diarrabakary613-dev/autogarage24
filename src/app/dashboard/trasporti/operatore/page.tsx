import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { saveTransportOperator } from "@/lib/actions/transport";
import { REGIONS } from "@/lib/geo/regions";
import { OPERATOR_STATUS, TRANSPORT_SERVICES } from "@/lib/services/labels";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Profilo trasportatore", robots: { index: false } };

export default function TransportOperatorPage() {
  return (
    <>
      <PageHeader title="Profilo trasportatore" description="Servizi, regioni servite e copertura assicurativa dichiarata. Lo staff verifica i dati prima dell'attivazione." actions={<ButtonLink href="/dashboard/trasporti?vista=aperte" variant="outline">Richieste aperte</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/trasporti/operatore");
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id, display_name").eq("user_id", user.id).in("professional_type", ["trasportatore", "soccorritore", "venditore_auto"]);
  if (!profiles?.length) return <EmptyState title="Serve un profilo professionale" description="Il servizio è disponibile per trasportatori, soccorritori e concessionari." action={<ButtonLink href="/registrati?ruolo=trasportatore">Registrati come trasportatore</ButtonLink>} />;
  const p = profiles[0];
  const [{ data: op }, { data: jobs }, { data: quotes }] = await Promise.all([
    supabase.from("transport_operators").select("*").eq("profile_id", p.id).maybeSingle(),
    supabase.from("transport_requests").select("status").eq("operator_profile_id", p.id),
    supabase.from("transport_quotes").select("status").eq("profile_id", p.id),
  ]);
  return (
    <div className="flex flex-col gap-5">
      {op && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{p.display_name}</h2><Badge tone={OPERATOR_STATUS[op.status].tone}>{OPERATOR_STATUS[op.status].label}</Badge></div>
          {op.admin_note && <p className="text-sm">Nota dello staff: {op.admin_note}</p>}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([["Preventivi inviati", quotes?.length ?? 0], ["Accettati", (quotes ?? []).filter((q) => q.status === "accettato").length], ["Incarichi in corso", (jobs ?? []).filter((j) => !["completata", "annullata"].includes(j.status)).length], ["Completati", (jobs ?? []).filter((j) => j.status === "completata").length]] as [string, number][])
              .map(([l, v]) => <div key={l} className="rounded-xl bg-mist p-3"><p className="text-xs text-muted">{l}</p><p className="text-xl font-extrabold tabular-nums">{v}</p></div>)}
          </div>
        </Card>
      )}
      <Card className="p-5">
        <ActionForm action={saveTransportOperator} submitLabel={op ? "Salva" : "Invia per la verifica"} hidden={{ profile_id: p.id }}>
          {((s: FormState) => (
            <>
              <fieldset><legend className="mb-1 text-sm font-semibold">Servizi</legend>
                <div className="grid gap-2 sm:grid-cols-2">{Object.entries(TRANSPORT_SERVICES).filter(([k]) => k !== "indifferente").map(([k, l]) => <Checkbox key={k} id={`s-${k}`} name="services" value={k} label={l} defaultChecked={op?.services.includes(k)} />)}</div></fieldset>
              <fieldset><legend className="mb-1 text-sm font-semibold">Regioni servite (ritiro o consegna)</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{REGIONS.map((r) => <Checkbox key={r} id={`r-${r}`} name="regions" value={r} label={r} defaultChecked={op ? op.regions.includes(r) : r === "Lombardia"} />)}</div></fieldset>
              <Field id="md" label="Distanza massima per singolo trasporto (km)" optional><Input id="md" name="max_distance_km" type="number" min={10} max={3000} defaultValue={op?.max_distance_km ?? ""} className="w-40" /></Field>
              <Checkbox id="ins" name="insurance_declared" label="Ho una copertura assicurativa per i veicoli trasportati" defaultChecked={op?.insurance_declared} />
              <Field id="inn" label="Dettagli della copertura" optional error={s.fieldErrors?.insurance_notes} hint="Compagnia, massimale, franchigia. Lo staff può chiederti la documentazione: le modifiche vengono ricontrollate."><Textarea id="inn" name="insurance_notes" rows={2} maxLength={1000} defaultValue={op?.insurance_notes ?? ""} /></Field>
              <Field id="pr" label="Note su prezzi e capacità" optional><Textarea id="pr" name="price_notes" rows={2} maxLength={1000} defaultValue={op?.price_notes ?? ""} placeholder="Es. bisarca 8 posti, carro singolo" /></Field>
              <p className="text-xs text-muted">Per l&apos;attivazione lo staff verifica visura camerale e, se applicabile, iscrizione all&apos;Albo degli autotrasportatori e licenze: tienili pronti.</p>
            </>
          ))(initialFormState)}
        </ActionForm>
      </Card>
    </div>
  );
}
