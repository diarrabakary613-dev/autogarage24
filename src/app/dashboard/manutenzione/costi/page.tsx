import type { Metadata } from "next";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/form";
import { BarList, PageHeader } from "@/components/ui/misc";
import { MaintenanceTabs } from "@/components/garage/maintenance-tabs";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteExpense, saveExpense } from "@/lib/actions/garage";
import { EXPENSE_LABELS } from "@/lib/labels";
import { formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Costi di manutenzione", robots: { index: false } };
const MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export default function CostsPage() {
  return (
    <>
      <PageHeader title="Costi" description="Riepilogo calcolato solo sulle spese che hai registrato. Nessuna stima di spese future." />
      <MaintenanceTabs current="costi" />
      <Suspense fallback={<Skeleton className="h-96" />}><Costs /></Suspense>
    </>
  );
}

async function Costs() {
  await requireUser("/dashboard/manutenzione/costi");
  const supabase = await createClient();
  const [{ data: vehicles }, { data: exp }, { data: recs }] = await Promise.all([
    supabase.from("user_vehicles").select("id, make, model").is("deleted_at", null),
    supabase.from("vehicle_expenses").select("*").order("spent_on", { ascending: false }).limit(2000),
    supabase.from("maintenance_records").select("cost_cents").not("cost_cents", "is", null),
  ]);
  if (!vehicles?.length) return <EmptyState title="Nessuna automobile" description="Aggiungi un'auto al garage per registrare le spese." />;
  const list = exp ?? [];
  const total = list.reduce((s, e) => s + Number(e.amount_cents), 0);
  const sum = (key: (e: (typeof list)[number]) => string) => { const m = new Map<string, number>(); list.forEach((e) => m.set(key(e), (m.get(key(e)) ?? 0) + Number(e.amount_cents))); return m; };
  const name = new Map(vehicles.map((v) => [v.id, `${v.make} ${v.model}`]));
  const byVehicle = [...sum((e) => e.user_vehicle_id)].map(([k, v]) => ({ label: name.get(k) ?? "Auto rimossa", value: v }));
  const byCat = [...sum((e) => e.category)].map(([k, v]) => ({ label: EXPENSE_LABELS[k as keyof typeof EXPENSE_LABELS], value: v })).sort((a, b) => b.value - a.value);
  const year = new Date().getFullYear();
  const byMonth = MONTHS.map((m, i) => ({ label: `${m} ${year}`, value: list.filter((e) => e.spent_on.startsWith(`${year}-${String(i + 1).padStart(2, "0")}`)).reduce((s, e) => s + Number(e.amount_cents), 0) })).filter((x, i) => i <= new Date().getMonth());
  const byYear = [...sum((e) => e.spent_on.slice(0, 4))].sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => ({ label: k, value: v }));
  const costs = (recs ?? []).map((r) => Number(r.cost_cents));
  const avg = costs.length ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null;
  const eur = (v: number) => formatPrice(v);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-sm text-muted">Totale registrato</p><p className="text-2xl font-extrabold">{eur(total)}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted">Spese registrate</p><p className="text-2xl font-extrabold">{list.length}</p></Card>
          <Card className="p-4"><p className="text-sm text-muted">Costo medio degli interventi</p><p className="text-2xl font-extrabold">{avg !== null ? formatPrice(avg, true) : "—"}</p><p className="text-xs text-muted">su {costs.length} interventi con costo</p></Card>
        </div>
        {list.length === 0 ? <EmptyState title="Nessuna spesa registrata" description="Aggiungi la prima spesa con il modulo." /> : (<>
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5"><h2 className="mb-3 font-bold">Per categoria</h2><BarList items={byCat} format={eur} /></Card>
            <Card className="p-5"><h2 className="mb-3 font-bold">Per automobile</h2><BarList items={byVehicle} format={eur} /></Card>
            <Card className="p-5"><h2 className="mb-3 font-bold">Andamento mensile {year}</h2><BarList items={byMonth} format={eur} /></Card>
            <Card className="p-5"><h2 className="mb-3 font-bold">Andamento annuale</h2><BarList items={byYear} format={eur} /></Card>
          </div>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Ultime spese</h2>
            <ul className="divide-y divide-line text-sm">{list.slice(0, 30).map((e) => <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span>{formatDate(e.spent_on)} · {EXPENSE_LABELS[e.category]} · {name.get(e.user_vehicle_id)}{e.description ? ` — ${e.description}` : ""}</span><span className="flex items-center gap-2 font-semibold">{formatPrice(Number(e.amount_cents), true)}<ActionForm action={deleteExpense} submitLabel="Elimina" size="sm" variant="outline" hidden={{ expense_id: e.id }} confirm="Eliminare?" /></span></li>)}</ul>
          </Card>
        </>)}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 font-bold">Nuova spesa</h2>
        <ActionForm action={saveExpense} submitLabel="Registra spesa" resetOnSuccess>
          {(s) => { const fe = s.fieldErrors ?? {}; return (<>
            <Field id="ex-v" label="Automobile" error={fe.user_vehicle_id}><Select id="ex-v" name="user_vehicle_id">{vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</Select></Field>
            <Field id="ex-c" label="Categoria" error={fe.category}><Select id="ex-c" name="category">{Object.entries(EXPENSE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="ex-a" label="Importo (€)" error={fe.amount}><Input id="ex-a" name="amount" inputMode="decimal" /></Field>
              <Field id="ex-d" label="Data" error={fe.spent_on}><Input id="ex-d" name="spent_on" type="date" max={new Date().toISOString().slice(0, 10)} /></Field>
            </div>
            <Field id="ex-de" label="Descrizione" optional><Input id="ex-de" name="description" maxLength={300} /></Field>
          </>); }}
        </ActionForm>
      </Card>
    </div>
  );
}
