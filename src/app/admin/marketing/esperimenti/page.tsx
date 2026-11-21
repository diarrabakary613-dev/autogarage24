import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteMarketingRow, saveExperiment } from "@/lib/actions/marketing";
import { significance } from "@/lib/marketing/stats";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Esperimenti di growth", robots: { index: false } };
const STATUS = { pianificato: "Pianificato", in_corso: "In corso", concluso: "Concluso", annullato: "Annullato" };
const DECISION = { nessuna: "Nessuna decisione", adotta_a: "Adotta A", adotta_b: "Adotta B", ripeti: "Ripeti il test", abbandona: "Abbandona" };

export default function ExperimentsPage() {
  return <AdminPage title="Esperimenti di growth" description="Ipotesi, varianti, metrica e risultato. Una variante si può dichiarare vincente solo con almeno 100 osservazioni per variante; il calcolo indica anche se la differenza è statisticamente significativa."><MarketingTabs current="esperimenti" /><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("marketing.manage", "/admin/marketing/esperimenti");
  const supabase = await createClient();
  const [{ data }, { data: campaigns }] = await Promise.all([
    supabase.from("growth_experiments").select("*").order("created_at", { ascending: false }),
    supabase.from("marketing_campaigns").select("id, name").order("name"),
  ]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <div className="flex flex-col gap-4">
        {!data?.length ? <EmptyState title="Nessun esperimento" description="Esempi: due headline, due video, CTA diversa, creatività neopatentati contro generalista." /> : data.map((e) => {
          const sig = significance(e.sample_a, e.conversions_a, e.sample_b, e.conversions_b);
          return (
            <Card key={e.id} className="p-5 text-sm">
              <h2 className="flex flex-wrap items-center gap-2 text-base font-bold">{e.title}<Badge tone="neutral">{STATUS[e.status as keyof typeof STATUS]}</Badge><Badge tone={e.decision === "nessuna" ? "neutral" : "dark"}>{DECISION[e.decision as keyof typeof DECISION]}</Badge></h2>
              <p className="mt-1"><strong>Ipotesi:</strong> {e.hypothesis}</p>
              <p><strong>Modifica:</strong> {e.change_description} · <strong>Metrica:</strong> {e.metric}{e.audience ? ` · Pubblico: ${e.audience}` : ""}</p>
              <p>A: {e.variant_a} — {e.conversions_a ?? "—"}/{e.sample_a ?? "—"} · B: {e.variant_b} — {e.conversions_b ?? "—"}/{e.sample_b ?? "—"}</p>
              <Alert tone={sig.verdict === "significativa" ? "success" : "info"} className="mt-2">{sig.text}</Alert>
              {e.result_notes && <p className="mt-2 text-muted">{e.result_notes}</p>}
              <details className="mt-3"><summary className="cursor-pointer font-semibold text-orange-700">Aggiorna risultati</summary><div className="mt-3"><ExperimentForm e={e} campaigns={campaigns ?? []} /></div></details>
              <ActionForm action={deleteMarketingRow} submitLabel="Elimina" variant="ghost" size="sm" hidden={{ id: e.id, table: "esperimento" }} confirm="Eliminare l'esperimento?" className="mt-2" />
            </Card>
          );
        })}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start"><h2 className="mb-3 font-bold">Nuovo esperimento</h2><ExperimentForm campaigns={campaigns ?? []} /></Card>
    </div>
  );
}

function ExperimentForm({ e, campaigns }: { e?: Tables<"growth_experiments">; campaigns: { id: string; name: string }[] }) {
  const p = e ? `ex-${e.id.slice(0, 6)}` : "ex-new";
  return (
    <ActionForm action={saveExperiment} submitLabel={e ? "Salva" : "Crea esperimento"} hidden={{ id: e?.id }}>
      <div className="grid gap-3">
        <Field id={`${p}-t`} label="Titolo"><Input id={`${p}-t`} name="title" defaultValue={e?.title} /></Field>
        <Field id={`${p}-h`} label="Ipotesi" hint="Se… allora… perché…"><Textarea id={`${p}-h`} name="hypothesis" rows={2} defaultValue={e?.hypothesis} /></Field>
        <Field id={`${p}-c`} label="Modifica testata"><Input id={`${p}-c`} name="change_description" defaultValue={e?.change_description} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${p}-m`} label="Metrica"><Input id={`${p}-m`} name="metric" defaultValue={e?.metric ?? "Tasso di conversione"} /></Field>
          <Field id={`${p}-au`} label="Pubblico" optional><Input id={`${p}-au`} name="audience" defaultValue={e?.audience ?? ""} /></Field>
          <Field id={`${p}-a`} label="Variante A"><Input id={`${p}-a`} name="variant_a" defaultValue={e?.variant_a} /></Field>
          <Field id={`${p}-b`} label="Variante B"><Input id={`${p}-b`} name="variant_b" defaultValue={e?.variant_b} /></Field>
          <Field id={`${p}-sd`} label="Inizio" optional><Input id={`${p}-sd`} name="start_on" type="date" defaultValue={e?.start_on ?? ""} /></Field>
          <Field id={`${p}-ed`} label="Fine" optional><Input id={`${p}-ed`} name="end_on" type="date" defaultValue={e?.end_on ?? ""} /></Field>
          <Field id={`${p}-sa`} label="Visite A" optional><Input id={`${p}-sa`} name="sample_a" inputMode="numeric" defaultValue={e?.sample_a ?? ""} /></Field>
          <Field id={`${p}-ca`} label="Conversioni A" optional><Input id={`${p}-ca`} name="conversions_a" inputMode="numeric" defaultValue={e?.conversions_a ?? ""} /></Field>
          <Field id={`${p}-sb`} label="Visite B" optional><Input id={`${p}-sb`} name="sample_b" inputMode="numeric" defaultValue={e?.sample_b ?? ""} /></Field>
          <Field id={`${p}-cb`} label="Conversioni B" optional><Input id={`${p}-cb`} name="conversions_b" inputMode="numeric" defaultValue={e?.conversions_b ?? ""} /></Field>
          <Field id={`${p}-st`} label="Stato"><Select id={`${p}-st`} name="status" defaultValue={e?.status ?? "pianificato"}>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field id={`${p}-de`} label="Decisione"><Select id={`${p}-de`} name="decision" defaultValue={e?.decision ?? "nessuna"}>{Object.entries(DECISION).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field id={`${p}-ca2`} label="Campagna" optional className="col-span-2"><Select id={`${p}-ca2`} name="campaign_id" defaultValue={e?.campaign_id ?? ""}><option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        </div>
        <Field id={`${p}-r`} label="Note sul risultato" optional><Textarea id={`${p}-r`} name="result_notes" rows={2} defaultValue={e?.result_notes ?? ""} /></Field>
      </div>
    </ActionForm>
  );
}
