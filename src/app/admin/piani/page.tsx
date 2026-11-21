import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminSavePlan } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Piani commerciali", robots: { index: false } };

export default function PlansPage() {
  return <AdminPage title="Piani commerciali (struttura)" description="Prepara piani e funzionalità future. I pagamenti non sono attivi: nessun piano può essere venduto da questa pagina."><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("plans.manage", "/admin/piani");
  const supabase = await createClient();
  const { data } = await supabase.from("subscription_plans").select("*").order("created_at");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        <Alert tone="warning">L&apos;attivazione di abbonamenti, annunci in evidenza o pubblicità richiede l&apos;approvazione del fondatore, la scelta di un provider di pagamento e la revisione delle condizioni contrattuali.</Alert>
        {!data?.length ? <EmptyState title="Nessun piano definito" /> : data.map((p) => (
          <Card key={p.id} className="p-4"><p className="font-bold">{p.name} <Badge tone="neutral">{p.audience}</Badge> <Badge tone="neutral">Non attivo</Badge></p><p className="text-sm text-muted">{p.code}{p.price_note ? ` · ${p.price_note}` : ""}</p><ul className="mt-2 list-disc pl-5 text-sm">{((p.features as string[]) ?? []).map((f) => <li key={f}>{f}</li>)}</ul></Card>
        ))}
      </div>
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Nuovo piano / modifica</h2>
        <ActionForm action={adminSavePlan} submitLabel="Salva (non attivo)" resetOnSuccess>
          <Field id="pl-c" label="Codice" hint="Es. officina_premium"><Input id="pl-c" name="code" /></Field>
          <Field id="pl-n" label="Nome"><Input id="pl-n" name="name" /></Field>
          <Field id="pl-a" label="Destinatari"><Select id="pl-a" name="audience"><option value="officina">Officine</option><option value="meccanico">Meccanici</option><option value="venditore_auto">Concessionari</option><option value="venditore_ricambi">Venditori ricambi</option><option value="tutti">Tutti</option></Select></Field>
          <Field id="pl-f" label="Funzionalità (una per riga)"><Textarea id="pl-f" name="features" rows={4} /></Field>
          <Field id="pl-p" label="Nota sul prezzo" optional hint="Solo descrittiva, es. «da definire»."><Input id="pl-p" name="price_note" /></Field>
        </ActionForm>
      </Card>
    </div>
  );
}
