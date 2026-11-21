import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { businessRespond } from "@/lib/actions/business";
import { getBusinessContext } from "@/lib/business/context";
import { BOOKING_KINDS, BOOKING_STATUS, formatSlot, nowMs } from "@/lib/bookings/time";
import { APPT_STATUS, OUTCOMES } from "@/lib/inspection/labels";

export const metadata: Metadata = { title: "Prenotazioni" };

export default function BizBookingsPage(props: PageProps<"/business/prenotazioni">) {
  return (
    <>
      <PageHeader title="Prenotazioni e appuntamenti" description="Visite, test drive e revisioni dell'azienda. Le azioni dei collaboratori sono eseguite per conto del titolare e registrate." />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase, current, can } = await getBusinessContext("/business/prenotazioni");
  if (!can("prenotazioni")) return <Alert tone="info">Il tuo ruolo non include le prenotazioni.</Alert>;
  const sp = await searchParams;
  const st = typeof sp.stato === "string" ? sp.stato : "";
  const { data } = await supabase.rpc("business_bookings", { profile_id: current.profile_id });
  const rows = (data ?? []).filter((b) => !st || b.status === st);
  const now = nowMs();
  if (!data?.length) return <EmptyState title="Nessuna prenotazione" description="Configura gli orari per ricevere prenotazioni di visite, test drive o revisioni." />;
  return (
    <div className="flex flex-col gap-2">
      <form className="mb-2 flex gap-2"><Select name="stato" defaultValue={st} aria-label="Filtra per stato" className="w-auto"><option value="">Tutti gli stati</option>{Object.entries({ ...BOOKING_STATUS, ...APPT_STATUS }).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select><button className="rounded-full bg-ink px-4 text-sm font-semibold text-white">Filtra</button></form>
      {rows.map((b) => {
        const s = (b.source === "revisione" ? APPT_STATUS : BOOKING_STATUS)[b.status];
        const pending = b.status === "in_attesa" || b.status === "richiesta";
        const confirmed = b.status === "confermato";
        const h = { profile_id: current.profile_id, source: b.source, id: b.id };
        return (
          <Card key={`${b.source}-${b.id}`} className="flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-bold">{b.title} · {b.customer_name}</p><Badge tone={s?.tone ?? "neutral"}>{s?.label ?? b.status}</Badge>
            </div>
            <p className="text-sm text-muted capitalize">{b.source === "revisione" ? "Revisione" : BOOKING_KINDS[b.kind]} · {b.starts_at ? formatSlot(b.starts_at) : "data da concordare"}</p>
            <div className="flex flex-wrap gap-2">
              {pending && b.starts_at && <ActionForm action={businessRespond} submitLabel="Conferma" size="sm" hidden={{ ...h, action: "conferma" }} />}
              {pending && <ActionForm action={businessRespond} submitLabel="Rifiuta" size="sm" variant="ghost" hidden={{ ...h, action: "rifiuta" }} />}
              {confirmed && b.starts_at && new Date(b.starts_at).getTime() < now && b.source !== "revisione" && <ActionForm action={businessRespond} submitLabel="Svolto" size="sm" hidden={{ ...h, action: "completa" }} />}
              {confirmed && b.starts_at && new Date(b.starts_at).getTime() < now && <ActionForm action={businessRespond} submitLabel="Non si è presentato" size="sm" variant="ghost" hidden={{ ...h, action: "mancata_presentazione" }} />}
            </div>
            {(pending || confirmed) && (
              <ActionForm action={businessRespond} submitLabel="Proponi un altro orario" size="sm" variant="outline" hidden={{ ...h, action: "proponi" }} className="flex-row flex-wrap items-end">
                <Field id={`np-${b.id}`} label="Nuovo orario"><Input id={`np-${b.id}`} name="new_starts_at" type="datetime-local" required /></Field>
              </ActionForm>
            )}
            {confirmed && b.source === "revisione" && (
              <ActionForm action={businessRespond} submitLabel="Registra esito" size="sm" hidden={{ ...h, action: "completa" }} className="flex-row flex-wrap items-end">
                <Field id={`o-${b.id}`} label="Esito"><Select id={`o-${b.id}`} name="outcome">{Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
                <Field id={`k-${b.id}`} label="Km" optional><Input id={`k-${b.id}`} name="mileage_km" type="number" min={0} /></Field>
              </ActionForm>
            )}
          </Card>
        );
      })}
    </div>
  );
}
