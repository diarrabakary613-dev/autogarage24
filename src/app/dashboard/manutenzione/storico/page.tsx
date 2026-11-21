import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { History } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ActionForm } from "@/components/ui/action-form";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { MaintenanceTabs } from "@/components/garage/maintenance-tabs";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteRecord, saveRecord } from "@/lib/actions/garage";
import { MAINTENANCE_LABELS, RECORD_SOURCE_LABELS } from "@/lib/labels";
import { formatKm, formatPrice } from "@/lib/format";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Storico manutenzione", robots: { index: false } };

export default function HistoryPage(props: PageProps<"/dashboard/manutenzione/storico">) {
  return (
    <>
      <PageHeader title="Storico manutenzione" description="Ogni intervento riporta la provenienza: registrato da te, inserito da un professionista (con la tua conferma) o importato." />
      <MaintenanceTabs current="storico" />
      <Suspense fallback={<Skeleton className="h-96" />}><Timeline searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Timeline({ searchParams }: { searchParams: PageProps<"/dashboard/manutenzione/storico">["searchParams"] }) {
  await requireUser("/dashboard/manutenzione/storico");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: vehicles } = await supabase.from("user_vehicles").select("id, make, model, year").is("deleted_at", null).order("is_primary", { ascending: false });
  if (!vehicles?.length) return <EmptyState title="Nessuna automobile" description="Aggiungi un'auto al garage per registrare gli interventi." action={<ButtonLink href="/dashboard/garage-auto">Vai al garage</ButtonLink>} />;
  const current = typeof sp.auto === "string" && vehicles.some((v) => v.id === sp.auto) ? sp.auto : "tutte";
  const cat = typeof sp.categoria === "string" && sp.categoria in MAINTENANCE_LABELS ? sp.categoria : null;
  let q = supabase.from("maintenance_records").select("*, professional_profiles(display_name, slug, professional_type)").order("performed_on", { ascending: false }).limit(200);
  if (current !== "tutte") q = q.eq("user_vehicle_id", current);
  if (cat) q = q.eq("category", cat as never);
  const { data: records } = await q;
  const name = new Map(vehicles.map((v) => [v.id, `${v.make} ${v.model}`]));
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <form className="flex flex-wrap gap-3" method="get">
          <Select name="auto" defaultValue={current} aria-label="Automobile" className="w-auto"><option value="tutte">Tutte le automobili</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</Select>
          <Select name="categoria" defaultValue={cat ?? ""} aria-label="Categoria" className="w-auto"><option value="">Tutte le categorie</option>{Object.entries(MAINTENANCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
        </form>
        {!records?.length ? <EmptyState icon={<History className="size-6" aria-hidden />} title="Nessun intervento" description="Registra il primo intervento con il modulo." /> : (
          <ol className="relative flex flex-col gap-4 border-l-2 border-line pl-6">
            {records.map((r) => {
              const pro = r.professional_profiles as unknown as { display_name: string; slug: string; professional_type: string } | null;
              return (
                <li key={r.id} className="relative">
                  <span className="absolute top-2 -left-[33px] size-4 rounded-full border-4 border-mist bg-orange" aria-hidden />
                  <Card className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold">{r.title}</p>
                      <Badge tone={r.source === "professionista" ? "success" : r.source === "importato" ? "orange" : "neutral"}>{RECORD_SOURCE_LABELS[r.source]}</Badge>
                    </div>
                    <p className="text-sm text-muted">{formatDate(r.performed_on)} · {MAINTENANCE_LABELS[r.category]} · {name.get(r.user_vehicle_id)}{r.mileage_km !== null && ` · ${formatKm(r.mileage_km)}`}{r.cost_cents !== null && ` · ${formatPrice(r.cost_cents, true)}`}</p>
                    {r.description && <p className="mt-2 text-sm">{r.description}</p>}
                    {r.parts_used && <p className="mt-1 text-sm"><strong>Ricambi:</strong> {r.parts_used}</p>}
                    {(pro || r.provider_name) && <p className="mt-1 text-sm"><strong>Eseguito da:</strong> {pro ? <Link className="underline" href={`/${pro.professional_type === "meccanico" ? "meccanici" : "garages"}/${pro.slug}`}>{pro.display_name}</Link> : r.provider_name}{!pro && r.source === "manuale" && " (dichiarato da te)"}</p>}
                    {r.notes && <p className="mt-1 text-sm text-muted">{r.notes}</p>}
                    {r.source === "manuale" && <ActionForm action={deleteRecord} submitLabel="Elimina" size="sm" variant="outline" hidden={{ record_id: r.id }} confirm="Eliminare l'intervento?" className="mt-2" />}
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 font-bold">Registra un intervento</h2>
        <ActionForm action={saveRecord} submitLabel="Aggiungi allo storico" resetOnSuccess>
          {(s) => { const fe = s.fieldErrors ?? {}; return (<>
            <Field id="mr-v" label="Automobile" error={fe.user_vehicle_id}><Select id="mr-v" name="user_vehicle_id" defaultValue={current !== "tutte" ? current : vehicles[0].id}>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</Select></Field>
            <Field id="mr-t" label="Titolo" error={fe.title}><Input id="mr-t" name="title" placeholder="Es. Tagliando 60.000 km" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="mr-c" label="Categoria" error={fe.category}><Select id="mr-c" name="category">{Object.entries(MAINTENANCE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field id="mr-d" label="Data" error={fe.performed_on}><Input id="mr-d" name="performed_on" type="date" max={new Date().toISOString().slice(0, 10)} /></Field>
              <Field id="mr-k" label="Chilometraggio" optional><Input id="mr-k" name="mileage_km" inputMode="numeric" /></Field>
              <Field id="mr-co" label="Costo (€)" optional error={fe.cost}><Input id="mr-co" name="cost" inputMode="decimal" /></Field>
            </div>
            <Field id="mr-p" label="Officina o professionista" optional><Input id="mr-p" name="provider_name" /></Field>
            <Field id="mr-de" label="Descrizione" optional><Textarea id="mr-de" name="description" rows={2} /></Field>
            <Field id="mr-pa" label="Ricambi utilizzati" optional><Input id="mr-pa" name="parts_used" /></Field>
            <Field id="mr-n" label="Note" optional><Input id="mr-n" name="notes" /></Field>
            <Checkbox id="mr-x" name="add_expense" defaultChecked label="Registra il costo anche tra le spese" />
          </>); }}
        </ActionForm>
        <p className="mt-3 text-xs text-muted">Gli interventi registrati da te sono indicati come tali e non risultano certificati da un&apos;officina. Puoi allegare la fattura dalla sezione Documenti.</p>
      </Card>
    </div>
  );
}
