"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { saveListingDraft, submitListingForReview } from "@/lib/actions/listings";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea, describedBy } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { BRANDS } from "@/config/brands";
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import { initialFormState } from "@/lib/validation/form-state";
import { cn } from "@/lib/utils";
import { ImageManager, type ManagedImage } from "./image-manager";

export type ListingDefaults = Record<string, string | number | boolean | null | undefined>;

const STEPS = ["Veicolo", "Prezzo", "Descrizione", "Fotografie", "Località", "Conferma"] as const;
const opts = (m: Record<string, string>) => Object.entries(m).map(([v, l]) => <option key={v} value={v}>{l}</option>);

/**
 * Pubblicazione annuncio in 6 passaggi. Un solo modulo per i dati (salvato come bozza),
 * le foto si caricano dopo il primo salvataggio, l'invio in revisione è separato.
 */
export function ListingWizard({
  defaults = {},
  listingId: initialId,
  images: initialImages = [],
  userId,
  sellerLabel,
  status,
  fieldContactId,
}: {
  defaults?: ListingDefaults;
  listingId?: string;
  images?: ManagedImage[];
  userId: string;
  sellerLabel: string;
  status?: string;
  /** Annuncio raccolto dal Field Manager presso questo contatto (solo staff autorizzato). */
  fieldContactId?: string;
}) {
  const [state, save] = useActionState(saveListingDraft, initialFormState);
  const [review, submitReview] = useActionState(submitListingForReview, initialFormState);
  const [step, setStep] = useState(0);
  const [imageCount, setImageCount] = useState(initialImages.length);
  const [summary, setSummary] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const fe = state.fieldErrors ?? {};
  const d = (k: string) => (defaults[k] === null || defaults[k] === undefined ? undefined : String(defaults[k]));

  const [listingId, setListingId] = useState(initialId ?? "");
  // In caso di errore torna al primo passaggio con un campo non valido (stato derivato durante il render).
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state.status === "success" && state.values?.listing_id) setListingId(state.values.listing_id);
    if (state.status === "error" && state.fieldErrors) {
      const byStep: Record<string, number> = { make_slug: 0, model: 0, year: 0, first_registration_date: 0, price: 1, postal_code: 4 };
      const first = Object.keys(state.fieldErrors).map((k) => byStep[k] ?? 0).sort()[0];
      if (first !== undefined) setStep(first);
    }
  }

  function go(to: number) {
    if (formRef.current) {
      const fd = new FormData(formRef.current);
      setSummary(Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v)])));
    }
    setStep(Math.max(0, Math.min(STEPS.length - 1, to)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const canSubmit = status === undefined || ["bozza", "rifiutato", "scaduto"].includes(status);

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Passaggi">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button type="button" onClick={() => go(i)} aria-current={i === step ? "step" : undefined}
              className={cn("flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold",
                i === step ? "border-ink bg-ink text-white" : i < step ? "border-line bg-white text-ink" : "border-line bg-white text-muted")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-xs", i === step ? "bg-orange text-ink" : "bg-mist")}>{i < step ? <Check className="size-3.5" aria-hidden /> : i + 1}</span>
              <span className="truncate">{s}</span>
            </button>
          </li>
        ))}
      </ol>

      {state.message && <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>}

      <form ref={formRef} action={save} className="flex flex-col gap-6 rounded-2xl border border-line bg-white p-6 shadow-card" noValidate>
        {listingId && <input type="hidden" name="listing_id" value={listingId} />}
        {fieldContactId && !listingId && <input type="hidden" name="field_contact_id" value={fieldContactId} />}

        <fieldset className={cn("grid gap-4 sm:grid-cols-2", step !== 0 && "hidden")}>
          <legend className="mb-2 text-xl font-bold sm:col-span-2">Informazioni sul veicolo</legend>
          <Field id="w-make" label="Marca" error={fe.make_slug}>
            <Select id="w-make" name="make_slug" defaultValue={d("make_slug") ?? ""} {...describedBy("w-make", fe.make_slug)}>
              <option value="">Seleziona…</option>
              {BRANDS.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
              <option value="altra">Altra marca</option>
            </Select>
          </Field>
          <Field id="w-make-o" label="Altra marca" optional hint="Solo se non è nell'elenco."><Input id="w-make-o" name="make_other" defaultValue={d("make_other")} maxLength={40} /></Field>
          <Field id="w-model" label="Modello" error={fe.model}><Input id="w-model" name="model" defaultValue={d("model")} maxLength={80} {...describedBy("w-model", fe.model)} /></Field>
          <Field id="w-version" label="Versione" optional hint="Es. 1.0 Hybrid 70 CV Cult"><Input id="w-version" name="version" defaultValue={d("version")} maxLength={120} /></Field>
          <Field id="w-year" label="Anno" error={fe.year}><Input id="w-year" name="year" inputMode="numeric" maxLength={4} defaultValue={d("year")} {...describedBy("w-year", fe.year)} /></Field>
          <Field id="w-reg" label="Prima immatricolazione" optional error={fe.first_registration_date}><Input id="w-reg" name="first_registration_date" type="date" defaultValue={d("first_registration_date")} /></Field>
          <Field id="w-km" label="Chilometraggio"><Input id="w-km" name="mileage_km" inputMode="numeric" defaultValue={d("mileage_km")} /></Field>
          <Field id="w-cond" label="Stato del veicolo"><Select id="w-cond" name="condition" defaultValue={d("condition") ?? "usato"}>{opts(CONDITION_LABELS)}</Select></Field>
          <Field id="w-fuel" label="Alimentazione"><Select id="w-fuel" name="fuel" defaultValue={d("fuel") ?? ""}><option value="">Seleziona…</option>{opts(FUEL_LABELS)}</Select></Field>
          <Field id="w-tr" label="Cambio"><Select id="w-tr" name="transmission" defaultValue={d("transmission") ?? ""}><option value="">Seleziona…</option>{opts(TRANSMISSION_LABELS)}</Select></Field>
          <Field id="w-body" label="Carrozzeria" optional><Select id="w-body" name="body_type" defaultValue={d("body_type") ?? ""}><option value="">Seleziona…</option>{opts(BODY_LABELS)}</Select></Field>
          <Field id="w-cc" label="Cilindrata (cm³)" optional><Input id="w-cc" name="engine_cc" inputMode="numeric" defaultValue={d("engine_cc")} /></Field>
          <Field id="w-kw" label="Potenza (kW)" optional hint="Come da libretto (campo P.2). Serve per la verifica neopatentati."><Input id="w-kw" name="power_kw" inputMode="decimal" defaultValue={d("power_kw")} /></Field>
          <Field id="w-tare" label="Tara (kg)" optional hint="Massa a vuoto dal libretto. Serve per il rapporto potenza/tara."><Input id="w-tare" name="tare_kg" inputMode="numeric" defaultValue={d("tare_kg")} /></Field>
          <Field id="w-ratio" label="Rapporto potenza/tara documentato (kW/t)" optional hint="Solo se riportato su un documento ufficiale."><Input id="w-ratio" name="power_to_tare_documented" inputMode="decimal" defaultValue={d("power_to_tare_documented")} /></Field>
          <Field id="w-var" label="Codice variante/versione" optional hint="Dal libretto (campo D.2), se disponibile."><Input id="w-var" name="variant_code" defaultValue={d("variant_code")} maxLength={60} /></Field>
          <details className="sm:col-span-2">
            <summary className="cursor-pointer font-semibold text-orange-700">Altri dati facoltativi (porte, colore, consumi…)</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field id="w-doors" label="Porte" optional><Input id="w-doors" name="doors" inputMode="numeric" defaultValue={d("doors")} /></Field>
              <Field id="w-seats" label="Posti" optional><Input id="w-seats" name="seats" inputMode="numeric" defaultValue={d("seats")} /></Field>
              <Field id="w-color" label="Colore" optional><Input id="w-color" name="color" defaultValue={d("color")} /></Field>
              <Field id="w-l100" label="Consumo (l/100 km)" optional><Input id="w-l100" name="consumption_l100" inputMode="decimal" defaultValue={d("consumption_l100")} /></Field>
              <Field id="w-kwh" label="Consumo (kWh/100 km)" optional><Input id="w-kwh" name="consumption_kwh100" inputMode="decimal" defaultValue={d("consumption_kwh100")} /></Field>
              <Field id="w-co2" label="CO₂ (g/km)" optional><Input id="w-co2" name="co2_g_km" inputMode="numeric" defaultValue={d("co2_g_km")} /></Field>
              <Field id="w-euro" label="Classe emissioni" optional><Input id="w-euro" name="emission_class" defaultValue={d("emission_class")} placeholder="Euro 6d" /></Field>
              <Field id="w-own" label="Proprietari precedenti" optional><Input id="w-own" name="owners_count" inputMode="numeric" defaultValue={d("owners_count")} /></Field>
            </div>
          </details>
        </fieldset>

        <fieldset className={cn("grid gap-4 sm:grid-cols-2", step !== 1 && "hidden")}>
          <legend className="mb-2 text-xl font-bold sm:col-span-2">Prezzo</legend>
          <Field id="w-price" label="Prezzo (€)" error={fe.price} hint="Valuta: euro."><Input id="w-price" name="price" inputMode="decimal" defaultValue={d("price")} {...describedBy("w-price", fe.price, true)} /></Field>
          <div className="flex items-end pb-2"><Checkbox id="w-neg" name="negotiable" label="Prezzo trattabile" defaultChecked={Boolean(defaults.negotiable)} /></div>
          <Field id="w-title" label="Titolo dell'annuncio" optional hint="Se lo lasci vuoto useremo marca, modello e versione." className="sm:col-span-2"><Input id="w-title" name="title" defaultValue={d("title")} maxLength={140} /></Field>
        </fieldset>

        <fieldset className={cn("flex flex-col gap-4", step !== 2 && "hidden")}>
          <legend className="mb-2 text-xl font-bold">Descrizione</legend>
          <p className="text-sm text-muted">Scrivi solo ciò che sai: le dichiarazioni del venditore non sono verifiche professionali e verranno presentate come tali.</p>
          <Field id="w-desc" label="Descrizione generale"><Textarea id="w-desc" name="description" rows={5} defaultValue={d("description")} maxLength={6000} /></Field>
          <Field id="w-condn" label="Condizioni" optional><Textarea id="w-condn" name="condition_notes" rows={3} defaultValue={d("condition_notes")} /></Field>
          <Field id="w-eq" label="Dotazioni" optional hint="Una per riga o separate da virgola."><Textarea id="w-eq" name="equipment" rows={3} defaultValue={d("equipment")} /></Field>
          <Field id="w-maint" label="Manutenzione documentata" optional><Textarea id="w-maint" name="maintenance_notes" rows={3} defaultValue={d("maintenance_notes")} /></Field>
          <Field id="w-int" label="Interventi effettuati" optional><Textarea id="w-int" name="interventions_notes" rows={3} defaultValue={d("interventions_notes")} /></Field>
          <Field id="w-def" label="Difetti conosciuti" optional><Textarea id="w-def" name="known_defects" rows={3} defaultValue={d("known_defects")} /></Field>
          <Field id="w-extra" label="Informazioni aggiuntive" optional><Textarea id="w-extra" name="extra_info" rows={3} defaultValue={d("extra_info")} /></Field>
        </fieldset>

        <fieldset className={cn("grid gap-4 sm:grid-cols-2", step !== 4 && "hidden")}>
          <legend className="mb-2 text-xl font-bold sm:col-span-2">Località e venditore</legend>
          <Field id="w-city" label="Città"><Input id="w-city" name="city" defaultValue={d("city")} maxLength={80} /></Field>
          <Field id="w-cap" label="CAP" optional error={fe.postal_code}><Input id="w-cap" name="postal_code" inputMode="numeric" maxLength={5} defaultValue={d("postal_code")} /></Field>
          <Field id="w-prov" label="Provincia (sigla)" optional><Input id="w-prov" name="province" maxLength={2} defaultValue={d("province")} placeholder="MI" /></Field>
          <Field id="w-reg2" label="Regione" optional><Input id="w-reg2" name="region" defaultValue={d("region") ?? "Lombardia"} /></Field>
          <div className="rounded-xl bg-mist p-4 text-sm sm:col-span-2">
            <p className="font-semibold">Venditore: {sellerLabel}</p>
            <p className="mt-1 text-muted">La tipologia (privato o professionista) è stabilita dal tuo profilo: i professionisti con profilo di venditore o officina pubblicano come attività. I tuoi contatti personali non vengono mostrati nell&apos;annuncio.</p>
          </div>
        </fieldset>

        {step === 5 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold">Riepilogo</h2>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              {[["Marca", summary.make_slug === "altra" ? summary.make_other : BRANDS.find((b) => b.slug === summary.make_slug)?.name], ["Modello", summary.model], ["Versione", summary.version], ["Anno", summary.year],
                ["Chilometraggio", summary.mileage_km], ["Alimentazione", summary.fuel && FUEL_LABELS[summary.fuel as keyof typeof FUEL_LABELS]], ["Cambio", summary.transmission && TRANSMISSION_LABELS[summary.transmission as keyof typeof TRANSMISSION_LABELS]],
                ["Potenza", summary.power_kw && `${summary.power_kw} kW`], ["Tara", summary.tare_kg && `${summary.tare_kg} kg`], ["Prezzo", summary.price && `${summary.price} €${summary.negotiable ? " (trattabile)" : ""}`], ["Città", summary.city], ["Fotografie", String(imageCount)]]
                .map(([k, v]) => <div key={k} className="flex justify-between border-b border-line py-1.5"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v || <span className="text-warning">mancante</span>}</dd></div>)}
            </dl>
            <p className="text-sm text-muted">Salva le modifiche prima di inviare l&apos;annuncio in revisione.</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} icon={<ChevronLeft className="size-4" aria-hidden />}>Indietro</Button>
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="outline" pendingText="Salvataggio…">{listingId ? "Salva modifiche" : "Salva bozza"}</SubmitButton>
            {step < STEPS.length - 1 && <Button type="button" onClick={() => go(step + 1)}>Avanti <ChevronRight className="size-4" aria-hidden /></Button>}
          </div>
        </div>
      </form>

      <section className={cn("rounded-2xl border border-line bg-white p-6 shadow-card", step !== 3 && "hidden")} aria-labelledby="foto-t">
        <h2 id="foto-t" className="mb-2 text-xl font-bold">Fotografie</h2>
        {listingId ? (
          <ImageManager listingId={listingId} userId={userId} initial={initialImages} onCountChange={setImageCount} />
        ) : (
          <Alert tone="info">Salva prima la bozza (pulsante &quot;Salva bozza&quot;) per poter caricare le fotografie.</Alert>
        )}
      </section>

      {step === 5 && listingId && canSubmit && (
        <form action={submitReview} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-6 shadow-card" noValidate>
          <h2 className="text-xl font-bold">Dichiarazioni del venditore</h2>
          {review.message && <Alert tone={review.status === "success" ? "success" : "error"}>{review.message}</Alert>}
          <input type="hidden" name="listing_id" value={listingId} />
          <Checkbox id="dc1" name="declare_accuracy" label="Confermo che le informazioni inserite sono accurate e veritiere." error={review.fieldErrors?.declare_accuracy} />
          <Checkbox id="dc2" name="declare_availability" label="Confermo che il veicolo è disponibile per la vendita." error={review.fieldErrors?.declare_availability} />
          <Checkbox id="dc3" name="declare_right" label="Dichiaro di avere il diritto di pubblicare questo annuncio." error={review.fieldErrors?.declare_right} />
          <Checkbox id="dc4" name="declare_photos" label="Dichiaro di avere il diritto di utilizzare le fotografie caricate." error={review.fieldErrors?.declare_photos} />
          <Checkbox id="dc5" name="accept_terms" label={<>Accetto le <Link href="/termini" className="underline">condizioni della piattaforma</Link>.</>} error={review.fieldErrors?.accept_terms} />
          <SubmitButton pendingText="Invio…">Invia in revisione</SubmitButton>
          <p className="text-xs text-muted">L&apos;annuncio sarà visibile solo dopo l&apos;approvazione del team AutoGarage24.</p>
        </form>
      )}
      {step === 5 && listingId && !canSubmit && <Alert tone="info">L&apos;annuncio è già stato inviato o pubblicato: le modifiche sostanziali lo rimandano automaticamente in revisione.</Alert>}
    </div>
  );
}
