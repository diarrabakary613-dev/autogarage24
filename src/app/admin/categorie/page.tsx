import type { Metadata } from "next";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminSaveCategory } from "@/lib/actions/admin";

export const metadata: Metadata = { title: "Categorie", robots: { index: false } };

export default function CategoriesPage() {
  return <AdminPage title="Categorie" description="Categorie di attività/servizi e catalogo ricambi: aggiungile o disattivale senza modificare il codice."><Content /></AdminPage>;
}

async function Content() {
  await requirePermission("categories.manage", "/admin/categorie");
  const supabase = await createClient();
  const [{ data: biz }, { data: parts }] = await Promise.all([
    supabase.from("business_categories").select("*").order("position"),
    supabase.from("part_categories").select("*").order("position"),
  ]);
  const roots = (parts ?? []).filter((p) => !p.parent_id);
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Attività e specializzazioni</h2>
        <ul className="mb-4 divide-y divide-line text-sm">{(biz ?? []).map((c) => <li key={c.slug} className="flex items-center justify-between py-1.5"><span>{c.name} <span className="text-muted">· {c.applies_to}</span></span>{!c.active && <Badge tone="neutral">Non attiva</Badge>}</li>)}</ul>
        <ActionForm action={adminSaveCategory} submitLabel="Salva categoria" size="sm" hidden={{ table: "business_categories" }} resetOnSuccess>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field id="bc-n" label="Nome"><Input id="bc-n" name="name" /></Field>
            <Field id="bc-s" label="Codice (slug)" optional hint="Uguale a una esistente per modificarla."><Input id="bc-s" name="slug" /></Field>
            <Field id="bc-a" label="Si applica a"><Select id="bc-a" name="applies_to"><option value="officina">Officine</option><option value="meccanico">Meccanici</option><option value="entrambi">Entrambi</option></Select></Field>
            <Field id="bc-p" label="Ordine" optional><Input id="bc-p" name="position" inputMode="numeric" /></Field>
            <input type="hidden" name="active" value="off" /><Checkbox id="bc-act" name="active" value="on" defaultChecked label="Attiva" />
          </div>
        </ActionForm>
      </Card>
      <Card className="p-5">
        <h2 className="mb-3 font-bold">Catalogo ricambi</h2>
        <ul className="mb-4 flex flex-col gap-1 text-sm">{roots.map((r) => <li key={r.id}><strong>{r.name}</strong>{!r.active && <Badge tone="neutral" className="ml-1">Non attiva</Badge>}<span className="text-muted"> — {(parts ?? []).filter((c) => c.parent_id === r.id).map((c) => c.name).join(", ") || "nessuna sottocategoria"}</span></li>)}</ul>
        <ActionForm action={adminSaveCategory} submitLabel="Salva" size="sm" hidden={{ table: "part_categories" }} resetOnSuccess>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field id="pc-n" label="Nome"><Input id="pc-n" name="name" /></Field>
            <Field id="pc-s" label="Codice (slug)" optional><Input id="pc-s" name="slug" /></Field>
            <Field id="pc-p" label="Categoria principale" optional><Select id="pc-p" name="parent_id" defaultValue=""><option value="">Nessuna (nuova categoria)</option>{roots.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</Select></Field>
            <Field id="pc-e" label="Modifica esistente" optional><Select id="pc-e" name="id" defaultValue=""><option value="">— Nuova —</option>{(parts ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
            <input type="hidden" name="active" value="off" /><Checkbox id="pc-act" name="active" value="on" defaultChecked label="Attiva" />
          </div>
        </ActionForm>
      </Card>
    </div>
  );
}
