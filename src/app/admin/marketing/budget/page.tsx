import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteMarketingRow, saveBudgetEntry } from "@/lib/actions/marketing";
import { formatDate } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Budget pubblicitario", robots: { index: false } };
const PLATFORMS = { meta: "Meta (Instagram/Facebook)", google: "Google", tiktok: "TikTok", youtube: "YouTube", linkedin: "LinkedIn", altro: "Altro" };

export default function BudgetPage() {
  return <AdminPage title="Budget e controllo delle spese" description="Pianificazione e spesa inserita a mano. La piattaforma non collega carte, non avvia campagne e non spende denaro."><MarketingTabs current="budget" /><Content /></AdminPage>;
}

async function Content() {
  const me = await requirePermission("marketing.manage", "/admin/marketing/budget");
  const supabase = await createClient();
  const [{ data }, { data: campaigns }] = await Promise.all([
    supabase.from("ad_budget_entries").select("*, marketing_campaigns(name)").order("period_start", { ascending: false }),
    supabase.from("marketing_campaigns").select("id, name").order("name"),
  ]);
  const planned = (data ?? []).reduce((a, b) => a + Number(b.planned_cents), 0);
  const spent = (data ?? []).reduce((a, b) => a + Number(b.actual_cents ?? 0), 0);
  const founder = me.roles.includes("super_admin");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="flex flex-col gap-4">
        <Alert tone="warning" title="Approvazione del fondatore">Ogni spesa va approvata dal fondatore (ruolo Super Admin) prima di essere sostenuta. Totale previsto {formatPrice(planned)} · speso {formatPrice(spent)}.</Alert>
        {!data?.length ? <EmptyState title="Nessuna voce di budget" /> : data.map((b) => (
          <Card key={b.id} className="p-4 text-sm">
            <p className="flex flex-wrap items-center gap-2 font-semibold">{PLATFORMS[b.platform as keyof typeof PLATFORMS]} · {formatDate(b.period_start)} → {formatDate(b.period_end)} <Badge tone={b.founder_approved ? "success" : "warning"}>{b.founder_approved ? "Approvata dal fondatore" : "Da approvare"}</Badge></p>
            <p className="text-muted">{(b.marketing_campaigns as unknown as { name: string } | null)?.name ?? "Senza campagna"} · previsto {formatPrice(b.planned_cents)} · speso {b.actual_cents !== null ? formatPrice(b.actual_cents) : "—"} · impression {b.impressions ?? "—"} · clic {b.clicks ?? "—"} · contatti {b.leads ?? "—"}</p>
            {b.notes && <p className="mt-1">{b.notes}</p>}
            <details className="mt-2"><summary className="cursor-pointer font-semibold text-orange-700">Modifica</summary><div className="mt-3"><BudgetForm b={b} campaigns={campaigns ?? []} founder={founder} /></div></details>
            <ActionForm action={deleteMarketingRow} submitLabel="Elimina" variant="ghost" size="sm" hidden={{ id: b.id, table: "budget" }} confirm="Eliminare la voce?" />
          </Card>
        ))}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start"><h2 className="mb-3 font-bold">Nuova voce</h2><BudgetForm campaigns={campaigns ?? []} founder={founder} /></Card>
    </div>
  );
}

function BudgetForm({ b, campaigns, founder }: { b?: Tables<"ad_budget_entries">; campaigns: { id: string; name: string }[]; founder: boolean }) {
  const p = b ? `bu-${b.id.slice(0, 6)}` : "bu-new";
  const eur = (c: number | null | undefined) => (c === null || c === undefined ? "" : String(c / 100));
  return (
    <ActionForm action={saveBudgetEntry} submitLabel="Salva" hidden={{ id: b?.id }}>
      <div className="grid grid-cols-2 gap-3">
        <Field id={`${p}-pl`} label="Piattaforma"><Select id={`${p}-pl`} name="platform" defaultValue={b?.platform ?? "meta"}>{Object.entries(PLATFORMS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        <Field id={`${p}-ca`} label="Campagna" optional><Select id={`${p}-ca`} name="campaign_id" defaultValue={b?.campaign_id ?? ""}><option value="">—</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
        <Field id={`${p}-ps`} label="Dal"><Input id={`${p}-ps`} name="period_start" type="date" defaultValue={b?.period_start ?? ""} /></Field>
        <Field id={`${p}-pe`} label="Al"><Input id={`${p}-pe`} name="period_end" type="date" defaultValue={b?.period_end ?? ""} /></Field>
        <Field id={`${p}-pn`} label="Budget previsto (€)"><Input id={`${p}-pn`} name="planned" inputMode="decimal" defaultValue={eur(b?.planned_cents)} /></Field>
        <Field id={`${p}-ac`} label="Spesa effettiva (€)" optional><Input id={`${p}-ac`} name="actual" inputMode="decimal" defaultValue={eur(b?.actual_cents)} /></Field>
        <Field id={`${p}-im`} label="Impression" optional><Input id={`${p}-im`} name="impressions" inputMode="numeric" defaultValue={b?.impressions ?? ""} /></Field>
        <Field id={`${p}-cl`} label="Clic" optional><Input id={`${p}-cl`} name="clicks" inputMode="numeric" defaultValue={b?.clicks ?? ""} /></Field>
        <Field id={`${p}-le`} label="Contatti" optional><Input id={`${p}-le`} name="leads" inputMode="numeric" defaultValue={b?.leads ?? ""} /></Field>
      </div>
      <Field id={`${p}-no`} label="Note" optional className="mt-3"><Textarea id={`${p}-no`} name="notes" rows={2} defaultValue={b?.notes ?? ""} /></Field>
      <div className="mt-3">{founder ? <Checkbox id={`${p}-fa`} name="founder_approved" label="Approvo questa spesa (fondatore)" defaultChecked={b?.founder_approved} /> : <p className="text-xs text-muted">Solo il fondatore può approvare la spesa.</p>}</div>
    </ActionForm>
  );
}
