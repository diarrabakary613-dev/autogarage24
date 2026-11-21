import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addAuthorization, saveInspectionCenter } from "@/lib/actions/inspection";
import { INSPECTION_CATEGORIES, INSPECTION_SERVICES } from "@/lib/inspection/labels";
import { OPERATOR_STATUS } from "@/lib/services/labels";
import { formatDate } from "@/lib/utils";
import { nowMs } from "@/lib/bookings/time";

export const metadata: Metadata = { title: "Centro revisioni", robots: { index: false } };

export default function CenterSettingsPage() {
  return (
    <>
      <PageHeader title="Centro revisioni" description="Profilo del centro, categorie e servizi, autorizzazione ministeriale. Orari e periodi di chiusura si gestiscono in «Orari per le visite»." actions={<><ButtonLink href="/dashboard/disponibilita" variant="outline">Orari e calendario</ButtonLink><ButtonLink href="/dashboard/revisioni?vista=centro">Richieste ricevute</ButtonLink></>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Content /></Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser("/dashboard/revisioni/centro");
  const supabase = await createClient();
  const { data: profiles } = await supabase.from("professional_profiles").select("id, display_name").eq("user_id", user.id).in("professional_type", ["centro_revisione", "officina"]);
  if (!profiles?.length) return <EmptyState title="Serve un profilo di centro revisione o officina" action={<ButtonLink href="/registrati?ruolo=centro_revisione">Registra il centro</ButtonLink>} />;
  const p = profiles[0];
  const [{ data: c }, { data: auths }, { data: appts }] = await Promise.all([
    supabase.from("inspection_centers").select("*").eq("profile_id", p.id).maybeSingle(),
    supabase.from("inspection_authorizations").select("*").eq("profile_id", p.id).order("created_at", { ascending: false }),
    supabase.from("inspection_appointments").select("status").eq("center_profile_id", p.id),
  ]);
  const n = (s: string) => (appts ?? []).filter((a) => a.status === s).length;
  return (
    <div className="flex flex-col gap-5">
      {c && (
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-center gap-2"><h2 className="font-bold">{p.display_name}</h2><Badge tone={OPERATOR_STATUS[c.status].tone}>{OPERATOR_STATUS[c.status].label}</Badge>
            {(auths ?? []).some((a) => a.status === "verificata" && (!a.valid_until || a.valid_until >= new Date(nowMs()).toISOString().slice(0, 10))) ? <Badge tone="success">Autorizzazione verificata</Badge> : <Badge tone="warning">Autorizzazione non ancora verificata</Badge>}</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([["Richieste", n("richiesta")], ["Confermati", n("confermato")], ["Completati", n("completato")], ["Annullati", n("annullato")]] as [string, number][]).map(([l, v]) => <div key={l} className="rounded-xl bg-mist p-3"><p className="text-xs text-muted">{l}</p><p className="text-xl font-extrabold">{v}</p></div>)}</div>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="mb-3 font-bold">{c ? "Categorie e servizi" : "Attiva il servizio revisioni"}</h2>
        <ActionForm action={saveInspectionCenter} submitLabel={c ? "Salva" : "Registra il centro"} hidden={{ profile_id: p.id }}>
          <fieldset><legend className="mb-1 text-sm font-semibold">Veicoli revisionati</legend>
            <div className="grid gap-2 sm:grid-cols-2">{Object.entries(INSPECTION_CATEGORIES).map(([k, l]) => <Checkbox key={k} id={`vc-${k}`} name="vehicle_categories" value={k} label={l} defaultChecked={c ? c.vehicle_categories.includes(k) : k === "autovettura"} />)}</div></fieldset>
          <fieldset><legend className="mb-1 text-sm font-semibold">Servizi</legend>
            <div className="grid gap-2 sm:grid-cols-2">{Object.entries(INSPECTION_SERVICES).map(([k, l]) => <Checkbox key={k} id={`sv-${k}`} name="services" value={k} label={l} defaultChecked={c ? c.services.includes(k) : k === "revisione"} />)}</div></fieldset>
          <Field id="ht" label="Orari dichiarati" optional><Input id="ht" name="hours_text" maxLength={300} defaultValue={c?.hours_text ?? ""} /></Field>
          <Field id="pn" label="Tariffe" optional hint="La tariffa della revisione è fissata per legge: indica eventuali servizi aggiuntivi."><Textarea id="pn" name="price_notes" rows={2} maxLength={500} defaultValue={c?.price_notes ?? ""} /></Field>
        </ActionForm>
      </Card>
      {c && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Autorizzazione (concessione per le revisioni)</h2>
          {(auths ?? []).map((a) => (
            <div key={a.id} className="rounded-xl bg-mist p-3 text-sm">
              <p><strong>{a.authorization_number}</strong> · {a.authority} · <Badge tone={a.status === "verificata" ? "success" : a.status === "respinta" ? "danger" : "warning"}>{a.status}</Badge></p>
              <p className="text-xs text-muted">{a.categories.map((x) => INSPECTION_CATEGORIES[x] ?? x).join(", ")}{a.valid_until ? ` · valida fino al ${formatDate(a.valid_until)}` : ""}{a.review_note ? ` · ${a.review_note}` : ""}</p>
            </div>
          ))}
          <ActionForm action={addAuthorization} submitLabel="Invia per la verifica" hidden={{ profile_id: p.id }} resetOnSuccess>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field id="au" label="Ente che ha rilasciato la concessione"><Input id="au" name="authority" required maxLength={160} placeholder="Es. Ufficio Motorizzazione Civile di Milano" /></Field>
              <Field id="an" label="Numero / estremi"><Input id="an" name="authorization_number" required maxLength={60} /></Field>
              <Field id="ai" label="Rilasciata il" optional><Input id="ai" name="issued_on" type="date" /></Field>
              <Field id="av" label="Valida fino al" optional><Input id="av" name="valid_until" type="date" /></Field>
            </div>
            <fieldset><legend className="mb-1 text-sm font-semibold">Categorie autorizzate</legend>
              <div className="grid gap-2 sm:grid-cols-2">{Object.entries(INSPECTION_CATEGORIES).map(([k, l]) => <Checkbox key={k} id={`ac-${k}`} name="categories" value={k} label={l} />)}</div></fieldset>
            <FileUploader bucket="verification-documents" folder={user.id} kind="document" label="Carica il documento (PDF o foto)" max={1} name="document_path" />
            <p className="text-xs text-muted">Il documento è visibile solo a te e allo staff. Senza verifica il centro compare come «autorizzazione in verifica».</p>
          </ActionForm>
          <p className="text-sm"><Link className="underline" href="/dashboard/disponibilita">Configura gli orari prenotabili</Link>: senza orari i clienti possono solo indicare una data preferita.</p>
        </Card>
      )}
    </div>
  );
}
