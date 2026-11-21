import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminAssignPlan, adminSetPlanLimits } from "@/lib/actions/business";

export const metadata: Metadata = { title: "Business Center", robots: { index: false } };

export default function AdminBusinessPage() {
  return <AdminPage title="Business Center" description="Partner, team, attività e utilizzo dei piani. I piani a pagamento non sono attivi: l'attivazione richiede l'approvazione del fondatore e un fornitore di pagamento configurato."><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("business.manage", "/admin/business");
  const supabase = await createClient();
  const [{ data: ov }, { data: plans }, { data: limits }, { data: profiles }] = await Promise.all([
    supabase.rpc("admin_business_overview"),
    supabase.from("subscription_plans").select("*").order("created_at"),
    supabase.from("plan_limits").select("*"),
    supabase.from("professional_profiles").select("id, display_name").is("deleted_at", null).order("display_name").limit(500),
  ]);
  const o = (ov ?? {}) as Record<string, number | Record<string, number>>;
  const num = (k: string) => (typeof o[k] === "number" ? (o[k] as number) : 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{([["Partner attivi", num("partner_attivi")], ["Aziende registrate", num("aziende_registrate")], ["Aziende con team", num("con_team")], ["Collaboratori attivi", num("collaboratori_attivi")],
        ["Richieste (30 giorni)", num("richieste_30g")], ["Servizi completati (30 giorni)", num("servizi_completati_30g")], ["Annunci auto pubblicati", num("annunci_pubblicati")], ["Ricambi pubblicati", num("ricambi_pubblicati")],
        ["Attività aperte", num("attivita_aperte")], ["Segnalazioni aperte", num("segnalazioni_aperte")]] as [string, number][]).map(([l, v]) => <Card key={l} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-extrabold tabular-nums">{v}</p></Card>)}</div>
      <Card className="p-5 text-sm"><h2 className="mb-2 font-bold">Aziende per tipo</h2><p>{Object.entries((o.per_tipo ?? {}) as Record<string, number>).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p></Card>
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-bold">Piani e limiti</h2>
        {(plans ?? []).map((p) => {
          const l = (limits ?? []).find((x) => x.plan_code === p.code);
          const used = ((o.piani ?? {}) as Record<string, number>)[p.code] ?? 0;
          return (
            <div key={p.code} className="rounded-xl border border-line p-4">
              <p className="font-semibold">{p.name} <Badge tone={p.active ? "success" : "neutral"}>{p.active ? "attivo" : "non attivo"}</Badge> <span className="text-sm text-muted">· {used} aziende · {p.price_note}</span></p>
              {l && (
                <ActionForm action={adminSetPlanLimits} submitLabel="Salva limiti" size="sm" variant="outline" hidden={{ plan_code: p.code }} className="mt-2">
                  <div className="grid gap-2 sm:grid-cols-5">
                    <Field id={`a-${p.code}`} label="Annunci auto" optional><Input id={`a-${p.code}`} name="max_vehicle_listings" type="number" min={0} defaultValue={l.max_vehicle_listings ?? ""} /></Field>
                    <Field id={`r-${p.code}`} label="Ricambi" optional><Input id={`r-${p.code}`} name="max_part_listings" type="number" min={0} defaultValue={l.max_part_listings ?? ""} /></Field>
                    <Field id={`m-${p.code}`} label="Collaboratori"><Input id={`m-${p.code}`} name="max_members" type="number" min={0} defaultValue={l.max_members} /></Field>
                    <Field id={`o-${p.code}`} label="Offerte attive" optional><Input id={`o-${p.code}`} name="max_active_offers" type="number" min={0} defaultValue={l.max_active_offers ?? ""} /></Field>
                    <Field id={`d-${p.code}`} label="Storico statistiche (giorni)"><Input id={`d-${p.code}`} name="analytics_days" type="number" min={7} max={3650} defaultValue={l.analytics_days} /></Field>
                  </div>
                  <div className="flex flex-wrap gap-4"><Checkbox id={`e-${p.code}`} name="exports_enabled" label="Esportazioni" defaultChecked={l.exports_enabled} /><Checkbox id={`v-${p.code}`} name="promo_visibility" label="Visibilità promozionale" defaultChecked={l.promo_visibility} /><Checkbox id={`x-${p.code}`} name="advanced_features" label="Funzioni avanzate" defaultChecked={l.advanced_features} /></div>
                </ActionForm>
              )}
            </div>
          );
        })}
        <ActionForm action={adminAssignPlan} submitLabel="Assegna piano" size="sm" variant="outline">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field id="ap" label="Azienda"><Select id="ap" name="profile_id">{(profiles ?? []).map((p) => <option key={p.id} value={p.id}>{p.display_name}</option>)}</Select></Field>
            <Field id="pc" label="Piano"><Select id="pc" name="plan_code">{(plans ?? []).filter((p) => p.active).map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}</Select></Field>
            <Field id="pn" label="Nota" optional><Input id="pn" name="note" maxLength={500} /></Field>
          </div>
          <p className="text-xs text-muted">Sono assegnabili solo i piani attivi (oggi solo «Free»).</p>
        </ActionForm>
      </Card>
    </div>
  );
}
