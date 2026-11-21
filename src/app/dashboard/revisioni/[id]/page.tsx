import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { respondInspection } from "@/lib/actions/inspection";
import { APPT_STATUS, INSPECTION_CATEGORIES, OUTCOMES } from "@/lib/inspection/labels";
import { formatSlot, nowMs } from "@/lib/bookings/time";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Appuntamento di revisione", robots: { index: false } };

export default function InspectionDetail(props: PageProps<"/dashboard/revisioni/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} searchParams={props.searchParams} /></Suspense>;
}

function Act({ id, action, label, variant = "outline", confirm }: { id: string; action: string; label: string; variant?: "primary" | "outline" | "danger" | "ghost"; confirm?: string }) {
  return <ActionForm action={respondInspection} submitLabel={label} size="sm" variant={variant} hidden={{ id, action }} confirm={confirm} />;
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/revisioni/${id}`);
  const supabase = await createClient();
  const { data: a } = await supabase.from("inspection_appointments").select("*, professional_profiles(display_name, slug, address_line, city, phone_public)").eq("id", id).maybeSingle();
  if (!a) notFound();
  const center = a.center_owner_id === user.id;
  const p = a.professional_profiles as unknown as { display_name: string; slug: string; address_line: string | null; city: string | null; phone_public: string | null };
  const st = APPT_STATUS[a.status];
  const open = ["richiesta", "confermato", "modifica_proposta"].includes(a.status);
  const { data: slots } = !center && a.status === "richiesta" && a.starts_at ? await supabase.rpc("inspection_slots", { profile_id: a.center_profile_id, days: 21 }) : { data: [] };
  return (
    <>
      <PageHeader title={`Revisione · ${a.vehicle_desc}`} description={`${p.display_name} · ${INSPECTION_CATEGORIES[a.vehicle_category] ?? a.vehicle_category}`} actions={<Badge tone={st.tone}>{st.label}</Badge>} />
      {sp.creata && <Alert tone="success" className="mb-4">Richiesta inviata al centro: riceverai una notifica alla conferma.</Alert>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-1 p-5 text-sm">
            <p className="text-lg font-bold capitalize">{a.starts_at ? formatSlot(a.starts_at) : `Data preferita: ${formatDate(a.preferred_date!)}${a.preferred_time ? ` (${a.preferred_time})` : ""}`}</p>
            {a.status === "modifica_proposta" && a.proposed_starts_at && <Alert tone="info">Il centro propone: <strong className="capitalize">{formatSlot(a.proposed_starts_at)}</strong></Alert>}
            {a.message && <p><strong>Messaggio:</strong> {a.message}</p>}
            {center && a.plate && <p><strong>Targa:</strong> {a.plate}</p>}
            {!center && a.status === "confermato" && <p><strong>Indirizzo:</strong> {[p.address_line, p.city].filter(Boolean).join(", ")}{p.phone_public ? ` · ${p.phone_public}` : ""}</p>}
            {a.decision_note && <p><strong>Nota:</strong> {a.decision_note}</p>}
            {!center && a.status === "confermato" && <p className="text-xs text-muted">Porta carta di circolazione e documento d&apos;identità. Il promemoria arriva 24 ore prima.</p>}
          </Card>
          {open && (
            <Card className="flex flex-col gap-3 p-5">
              <div className="flex flex-wrap gap-2">
                {center && a.status === "richiesta" && a.starts_at && <Act id={id} action="conferma" label="Conferma l'orario" variant="primary" />}
                {center && ["richiesta", "modifica_proposta"].includes(a.status) && <Act id={id} action="rifiuta" label="Rifiuta" variant="ghost" confirm="Rifiutare la richiesta?" />}
                {center && a.status === "confermato" && a.starts_at && new Date(a.starts_at).getTime() < nowMs() && <Act id={id} action="mancata_presentazione" label="Non si è presentato" variant="ghost" />}
                {!center && a.status === "modifica_proposta" && <><Act id={id} action="accetta_modifica" label="Accetta il nuovo orario" variant="primary" /><Act id={id} action="rifiuta_modifica" label="Rifiuta il nuovo orario" variant="ghost" /></>}
                <Act id={id} action="annulla" label="Annulla l'appuntamento" variant="danger" confirm="Annullare l'appuntamento?" />
              </div>
              {center && ["richiesta", "confermato"].includes(a.status) && (
                <ActionForm action={respondInspection} submitLabel="Proponi un orario" size="sm" variant="outline" hidden={{ id, action: "proponi" }} className="border-t border-line pt-3">
                  <div className="grid gap-2 sm:grid-cols-2"><Field id="np" label="Data e ora (Milano)"><Input id="np" name="new_starts_at" type="datetime-local" required /></Field><Field id="nn" label="Nota" optional><Input id="nn" name="note" maxLength={500} /></Field></div>
                </ActionForm>
              )}
              {!center && (slots?.length ?? 0) > 0 && (
                <ActionForm action={respondInspection} submitLabel="Modifica l'orario richiesto" size="sm" variant="outline" hidden={{ id, action: "modifica" }} className="border-t border-line pt-3">
                  <Field id="ns" label="Nuovo orario disponibile"><Select id="ns" name="new_slot">{slots!.map((s) => <option key={s.starts_at} value={s.starts_at}>{formatSlot(s.starts_at)}</option>)}</Select></Field>
                </ActionForm>
              )}
              {center && a.status === "confermato" && (
                <ActionForm action={respondInspection} submitLabel="Registra l'esito e completa" hidden={{ id, action: "completa" }} className="border-t border-line pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field id="oc" label="Esito"><Select id="oc" name="outcome" defaultValue="regolare">{Object.entries(OUTCOMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
                    <Field id="km" label="Chilometraggio rilevato" optional><Input id="km" name="mileage_km" type="number" min={0} /></Field>
                  </div>
                  <p className="text-xs text-muted">L&apos;esito comparirà nello storico dell&apos;auto del cliente come «confermato dal centro». Registra solo l&apos;esito effettivamente emesso.</p>
                </ActionForm>
              )}
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-3">
          {a.conversation_id && <ButtonLink href={`/dashboard/messaggi/${a.conversation_id}`} variant="outline">Apri la conversazione</ButtonLink>}
          {!center && a.status === "completato" && <ButtonLink href="/dashboard/revisioni/garage" variant="outline">Vedi lo storico revisioni</ButtonLink>}
        </aside>
      </div>
    </>
  );
}
