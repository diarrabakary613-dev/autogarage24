import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { Field, Input, Select } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addInspectionRecord, deleteInspectionRecord, saveVehicleInspectionProfile } from "@/lib/actions/inspection";
import { INSPECTION_CATEGORIES, OUTCOMES, USAGE_TYPES, VERIFICATION } from "@/lib/inspection/labels";
import { nowMs } from "@/lib/bookings/time";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Scadenze e storico revisioni", robots: { index: false } };

export default function GarageInspectionPage() {
  return (
    <>
      <PageHeader title="Scadenze e storico revisioni" description="Per ogni auto del tuo garage: prossima scadenza calcolata secondo l'art. 80 del Codice della Strada, storico ed esiti." actions={<ButtonLink href="/revisione-auto#centri">Trova un centro revisione</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/revisioni/garage");
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("user_vehicles").select("id, make, model, year, registration_date, inspection_category, usage_type").eq("owner_id", user.id).is("deleted_at", null).order("is_primary", { ascending: false });
  if (!vehicles?.length) return <EmptyState title="Nessuna auto nel garage" action={<ButtonLink href="/dashboard/garage-auto">Aggiungi un&apos;auto</ButtonLink>} />;
  const { data: records } = await supabase.from("inspection_records").select("*").in("user_vehicle_id", vehicles.map((v) => v.id)).order("inspected_on", { ascending: false });
  const today = new Date(nowMs()).toISOString().slice(0, 10);
  const docs = (records ?? []).flatMap((r) => (r.document_path ? [r.document_path] : []));
  const { data: signed } = docs.length ? await supabase.storage.from("verification-documents").createSignedUrls(docs, 600) : { data: [] };
  const url = new Map((signed ?? []).flatMap((s) => (s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [])));
  return (
    <div className="flex flex-col gap-5">{await Promise.all(vehicles.map(async (v) => {
      const recs = (records ?? []).filter((r) => r.user_vehicle_id === v.id);
      const last = recs[0];
      const { data: due } = await supabase.rpc("inspection_due_date", { p_category: v.inspection_category, p_usage: v.usage_type, p_registration_date: v.registration_date as string,
        p_last_date: last?.inspected_on, p_last_outcome: last?.outcome });
      const d = due?.[0];
      const overdue = d?.due_date && d.due_date < today;
      return (
        <Card key={v.id} className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">{v.make} {v.model}{v.year ? ` (${v.year})` : ""}</h2>
            {d?.due_date ? <Badge tone={overdue ? "danger" : "orange"}>{overdue ? "Revisione scaduta il " : "Prossima revisione entro il "}{formatDate(d.due_date)}</Badge> : <Badge tone="neutral">Scadenza non calcolabile: manca la data di immatricolazione</Badge>}
          </div>
          {d && <p className="text-xs text-muted">{d.rule}. Fonte: {d.source} (aggiornato al {formatDate(d.checked_on!)}). Fa fede la carta di circolazione.</p>}
          <ActionForm action={saveVehicleInspectionProfile} submitLabel="Aggiorna" size="sm" variant="outline" hidden={{ id: v.id }}>
            <div className="grid gap-2 sm:grid-cols-3">
              <Field id={`c-${v.id}`} label="Categoria"><Select id={`c-${v.id}`} name="inspection_category" defaultValue={v.inspection_category}>{Object.entries(INSPECTION_CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field id={`u-${v.id}`} label="Uso"><Select id={`u-${v.id}`} name="usage_type" defaultValue={v.usage_type}>{Object.entries(USAGE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field id={`r-${v.id}`} label="Prima immatricolazione"><Input id={`r-${v.id}`} name="registration_date" type="date" defaultValue={v.registration_date ?? ""} /></Field>
            </div>
          </ActionForm>
          {recs.length > 0 && (
            <ul className="flex flex-col gap-2">{recs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-mist p-3 text-sm">
                <span><strong>{formatDate(r.inspected_on)}</strong> · <Badge tone={OUTCOMES[r.outcome].tone}>{OUTCOMES[r.outcome].label}</Badge> <Badge tone={VERIFICATION[r.verification].tone}>{VERIFICATION[r.verification].label}</Badge>
                  {r.center_name ? ` · ${r.center_name}` : ""}{r.mileage_km !== null ? ` · ${r.mileage_km.toLocaleString("it-IT")} km` : ""}
                  {r.document_path && url.get(r.document_path) && <> · <a className="underline" href={url.get(r.document_path)} target="_blank" rel="noreferrer">documento</a></>}</span>
                {r.verification !== "confermato_centro" && <ActionForm action={deleteInspectionRecord} submitLabel="Elimina" size="sm" variant="ghost" hidden={{ id: r.id }} confirm="Eliminare questa revisione?" />}
              </li>))}</ul>
          )}
          <details className="rounded-xl border border-line p-3">
            <summary className="cursor-pointer text-sm font-semibold">Registra una revisione fatta</summary>
            <ActionForm action={addInspectionRecord} submitLabel="Registra" size="sm" hidden={{ user_vehicle_id: v.id }} resetOnSuccess className="mt-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Field id={`d-${v.id}`} label="Data"><Input id={`d-${v.id}`} name="inspected_on" type="date" max={today} required /></Field>
                <Field id={`o-${v.id}`} label="Esito"><Select id={`o-${v.id}`} name="outcome" defaultValue="regolare">{Object.entries(OUTCOMES).map(([k, x]) => <option key={k} value={k}>{x.label}</option>)}</Select></Field>
                <Field id={`k-${v.id}`} label="Chilometraggio" optional><Input id={`k-${v.id}`} name="mileage_km" type="number" min={0} /></Field>
                <Field id={`n-${v.id}`} label="Centro" optional><Input id={`n-${v.id}`} name="center_name" maxLength={160} /></Field>
              </div>
              <FileUploader bucket="verification-documents" folder={user.id} kind="document" label="Allega il tagliando di revisione (facoltativo)" max={1} name="document_path" />
              <p className="text-xs text-muted">Le revisioni registrate da te risultano «dichiarate»: solo quelle completate tramite un centro sulla piattaforma risultano confermate.</p>
            </ActionForm>
          </details>
        </Card>
      );
    }))}</div>
  );
}
