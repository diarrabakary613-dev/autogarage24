import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { addFieldVisit, saveFieldContact } from "@/lib/actions/field";
import { BUSINESS_TYPES, CONTACT_SOURCES, CRM_STATUSES, INTERACTION_KINDS, INTEREST_LEVELS } from "@/lib/crm";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

type Back = "/admin/acquisizione" | "/admin/field-manager";
const opts = (o: Record<string, string>) => Object.entries(o).map(([k, l]) => <option key={k} value={k}>{l}</option>);

/** Modulo contatto del CRM unico (usato da Acquisizione e Field Manager). */
export function CrmContactForm({ c, back, categories = [] }: { c?: Tables<"field_contacts">; back: Back; categories?: { slug: string; name: string }[] }) {
  const p = c ? `fc-${c.id.slice(0, 6)}` : "fc-new";
  return (
    <ActionForm action={saveFieldContact} submitLabel={c ? "Salva" : "Crea contatto"} hidden={{ id: c?.id, return_to: back }}>
      {((s: FormState) => (<div className="grid gap-3">
        <Field id={`${p}-n`} label="Nome attività" error={s.fieldErrors?.business_name}><Input id={`${p}-n`} name="business_name" defaultValue={c?.business_name} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${p}-t`} label="Tipologia"><Select id={`${p}-t`} name="business_type" defaultValue={c?.business_type ?? "officina"}>{opts(BUSINESS_TYPES)}</Select></Field>
          <Field id={`${p}-s`} label="Stato"><Select id={`${p}-s`} name="status" defaultValue={c?.status ?? "nuovo"}>{opts(CRM_STATUSES)}</Select></Field>
          {categories.length > 0 && <Field id={`${p}-cat`} label="Categoria" optional><Select id={`${p}-cat`} name="category_slug" defaultValue={c?.category_slug ?? ""}><option value="">—</option>{categories.map((x) => <option key={x.slug} value={x.slug}>{x.name}</option>)}</Select></Field>}
          <Field id={`${p}-so`} label="Origine"><Select id={`${p}-so`} name="source" defaultValue={c?.source ?? "manuale"}>{opts(CONTACT_SOURCES)}</Select></Field>
        </div>
        <Field id={`${p}-r`} label="Referente" optional><Input id={`${p}-r`} name="contact_name" defaultValue={c?.contact_name ?? ""} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${p}-p`} label="Telefono" optional><Input id={`${p}-p`} name="phone" type="tel" defaultValue={c?.phone ?? ""} /></Field>
          <Field id={`${p}-e`} label="Email" optional><Input id={`${p}-e`} name="email" type="email" defaultValue={c?.email ?? ""} /></Field>
        </div>
        <Field id={`${p}-a`} label="Indirizzo" optional><Input id={`${p}-a`} name="address" defaultValue={c?.address ?? ""} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field id={`${p}-c`} label="Città" optional><Input id={`${p}-c`} name="city" defaultValue={c?.city ?? ""} /></Field>
          <Field id={`${p}-cap`} label="CAP" optional><Input id={`${p}-cap`} name="postal_code" inputMode="numeric" maxLength={5} defaultValue={c?.postal_code ?? ""} /></Field>
          <Field id={`${p}-pr`} label="Provincia" optional><Input id={`${p}-pr`} name="province" defaultValue={c?.province ?? "MI"} /></Field>
        </div>
        <Field id={`${p}-w`} label="Sito web" optional><Input id={`${p}-w`} name="website" type="url" placeholder="https://" defaultValue={c?.website ?? ""} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id={`${p}-fc`} label="Primo contatto" optional hint="Si compila da solo al primo cambio di stato."><Input id={`${p}-fc`} name="first_contact_on" type="date" defaultValue={c?.first_contact_on ?? ""} /></Field>
          <Field id={`${p}-f`} label="Prossimo follow-up" optional><Input id={`${p}-f`} name="next_followup_on" type="date" defaultValue={c?.next_followup_on ?? ""} /></Field>
        </div>
        <Field id={`${p}-lr`} label="Motivo «non interessato»" optional><Input id={`${p}-lr`} name="lost_reason" defaultValue={c?.lost_reason ?? ""} /></Field>
        <Field id={`${p}-l`} label="Profilo su AutoGarage24 (indirizzo o slug)" optional hint="Collega il contatto al professionista registrato."><Input id={`${p}-l`} name="profile_slug" /></Field>
        <Field id={`${p}-no`} label="Note" optional><Textarea id={`${p}-no`} name="notes" rows={3} defaultValue={c?.notes ?? ""} /></Field>
      </div>))(initialFormState)}
    </ActionForm>
  );
}

/** Telefonata, visita commerciale, email, WhatsApp o nota, con i dati della visita (Fase 14). */
export function CrmInteractionForm({ contactId, back }: { contactId: string; back: Back }) {
  return (
    <ActionForm action={addFieldVisit} submitLabel="Registra" hidden={{ contact_id: contactId, return_to: back }} resetOnSuccess>
      {((s: FormState) => (<div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field id="v-k" label="Tipo"><Select id="v-k" name="kind">{opts(INTERACTION_KINDS)}</Select></Field>
          <Field id="v-d" label="Data"><Input id="v-d" name="visited_on" type="date" /></Field>
        </div>
        <Field id="v-m" label="Referente incontrato o sentito" optional><Input id="v-m" name="met_contact_name" /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field id="v-ca" label="Auto in vendita" optional><Input id="v-ca" name="cars_available" inputMode="numeric" /></Field>
          <Field id="v-ne" label="Di cui per neopatentati" optional hint="Stima del contatto: da verificare." error={s.fieldErrors?.neo_cars_available}><Input id="v-ne" name="neo_cars_available" inputMode="numeric" /></Field>
          <Field id="v-i" label="Interesse" optional><Select id="v-i" name="interest_level" defaultValue=""><option value="">—</option>{opts(INTEREST_LEVELS)}</Select></Field>
        </div>
        <Field id="v-o" label="Esito" optional><Input id="v-o" name="outcome" /></Field>
        <Field id="v-n" label="Note" optional><Textarea id="v-n" name="notes" rows={3} /></Field>
        <Field id="v-na" label="Prossima azione commerciale" optional><Input id="v-na" name="next_action" placeholder="Es. inviare la presentazione, tornare giovedì" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="v-s" label="Nuovo stato" optional><Select id="v-s" name="status" defaultValue=""><option value="">Invariato</option>{opts(CRM_STATUSES)}</Select></Field>
          <Field id="v-f" label="Data prossima azione" optional><Input id="v-f" name="next_followup_on" type="date" /></Field>
        </div>
      </div>))(initialFormState)}
    </ActionForm>
  );
}
