import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { savePart } from "@/lib/actions/parts";
import { PART_CONDITION_LABELS } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

/** Dati principali del ricambio (bozza salvabile in qualsiasi momento). */
export function PartForm({ part, categories, defaults }: { part?: Tables<"part_listings">; categories: { id: string; name: string; parent_id: string | null }[]; defaults?: { city?: string | null; province?: string | null; postal_code?: string | null } }) {
  const roots = categories.filter((c) => !c.parent_id);
  const d = part;
  return (
    <ActionForm action={savePart} submitLabel={d ? "Salva modifiche" : "Salva bozza e continua"} pendingLabel="Salvataggio…" hidden={{ part_id: d?.id }}>
      {(s) => {
        const fe = s.fieldErrors ?? {};
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="pt-t" label="Nome del prodotto" error={fe.title} className="sm:col-span-2"><Input id="pt-t" name="title" defaultValue={d?.title} maxLength={160} /></Field>
            <Field id="pt-c" label="Categoria" error={fe.category_id}><Select id="pt-c" name="category_id" defaultValue={d?.category_id ?? ""}><option value="" disabled>Scegli…</option>{roots.map((r) => <optgroup key={r.id} label={r.name}><option value={r.id}>{r.name}</option>{categories.filter((c) => c.parent_id === r.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}</Select></Field>
            <Field id="pt-co" label="Condizione" error={fe.condition}><Select id="pt-co" name="condition" defaultValue={d?.condition ?? "nuovo"}>{Object.entries(PART_CONDITION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
            <Field id="pt-rf" label="Processo di ricondizionamento" optional hint="Obbligatorio per i ricambi ricondizionati." error={fe.refurbishment_notes} className="sm:col-span-2"><Textarea id="pt-rf" name="refurbishment_notes" rows={2} defaultValue={d?.refurbishment_notes ?? ""} /></Field>
            <Field id="pt-b" label="Marca del produttore" optional><Input id="pt-b" name="manufacturer_brand" defaultValue={d?.manufacturer_brand ?? ""} /></Field>
            <Field id="pt-oem" label="Codice OEM" optional hint="Codice del costruttore dell'auto."><Input id="pt-oem" name="oem_code" defaultValue={d?.oem_code ?? ""} /></Field>
            <Field id="pt-mc" label="Codice del produttore" optional><Input id="pt-mc" name="manufacturer_code" defaultValue={d?.manufacturer_code ?? ""} /></Field>
            <Field id="pt-p" label="Prezzo (€)" error={fe.price}><Input id="pt-p" name="price" inputMode="decimal" defaultValue={d?.price_cents !== null && d?.price_cents !== undefined ? String(d.price_cents / 100).replace(".", ",") : ""} /></Field>
            <Field id="pt-q" label="Quantità disponibile" optional hint="Lascia vuoto se non la gestisci."><Input id="pt-q" name="quantity" inputMode="numeric" defaultValue={d?.quantity ?? ""} /></Field>
            <Field id="pt-w" label="Garanzia" optional hint="Solo se la offri davvero, con durata e condizioni."><Input id="pt-w" name="warranty_text" defaultValue={d?.warranty_text ?? ""} /></Field>
            <Field id="pt-d" label="Descrizione" className="sm:col-span-2"><Textarea id="pt-d" name="description" rows={4} defaultValue={d?.description ?? ""} /></Field>
            <fieldset className="sm:col-span-2"><legend className="mb-2 text-sm font-semibold">Modalità di consegna</legend>
              <div className="flex flex-wrap gap-4">{[["ritiro", "Ritiro"], ["spedizione", "Spedizione"], ["consegna_locale", "Consegna locale"]].map(([v, l]) => <Checkbox key={v} id={`dl-${v}`} name="delivery_options" value={v} defaultChecked={d ? d.delivery_options.includes(v) : v === "ritiro"} label={l} />)}</div>
            </fieldset>
            <Field id="pt-sh" label="Spedizione e ritiro" optional className="sm:col-span-2" hint="Es. costi e tempi di spedizione, orari per il ritiro. Nessun pagamento avviene su AutoGarage24."><Input id="pt-sh" name="shipping_info" maxLength={600} defaultValue={d?.shipping_info ?? ""} /></Field>
            <Field id="pt-city" label="Città"><Input id="pt-city" name="city" defaultValue={d?.city ?? defaults?.city ?? ""} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="pt-cap" label="CAP" optional error={fe.postal_code}><Input id="pt-cap" name="postal_code" inputMode="numeric" maxLength={5} defaultValue={d?.postal_code ?? defaults?.postal_code ?? ""} /></Field>
              <Field id="pt-pr" label="Provincia" optional><Input id="pt-pr" name="province" maxLength={2} defaultValue={d?.province ?? defaults?.province ?? ""} /></Field>
            </div>
          </div>
        );
      }}
    </ActionForm>
  );
}
