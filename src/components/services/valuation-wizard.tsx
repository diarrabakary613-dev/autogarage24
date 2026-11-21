"use client";

import { useRef, useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { FileUploader } from "@/components/ui/file-uploader";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createValuation } from "@/lib/actions/valuation";
import { REGIONS } from "@/lib/geo/regions";
import { PROVINCES } from "@/lib/insurance/labels";
import { ACCIDENTS, CONDITIONS, INSPECTION_STATES, OPTIONS } from "@/lib/valuation/labels";

type V = { id: string; make: string; model: string; version: string | null; year: number | null; current_mileage_km: number | null; fuel: string | null; transmission: string | null; power_kw: number | null; engine_cc: number | null };
const STEPS = ["Auto", "Dati tecnici", "Condizioni", "Zona e foto"];
const FUELS: Record<string, string> = { benzina: "Benzina", diesel: "Diesel", gpl: "GPL", metano: "Metano", ibrida: "Ibrida", ibrida_plugin: "Ibrida plug-in", elettrica: "Elettrica", altra: "Altra" };

/** Procedura guidata in 4 passaggi: i dati restano nel modulo tornando indietro. */
export function ValuationWizard({ userId, vehicles, tradeListingId }: { userId: string; vehicles: V[]; tradeListingId: string | null }) {
  const [step, setStep] = useState(0);
  const [vid, setVid] = useState(vehicles[0]?.id ?? "");
  const v = vehicles.find((x) => x.id === vid);
  const refs = useRef<(HTMLFieldSetElement | null)[]>([]);
  function next() {
    const fs = refs.current[step];
    const invalid = fs ? Array.from(fs.querySelectorAll("input,select,textarea")).find((el) => !(el as HTMLInputElement).checkValidity()) as HTMLInputElement | undefined : undefined;
    if (invalid) { invalid.reportValidity(); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  const show = (i: number) => (i === step ? "flex" : "hidden");
  return (
    <ActionForm action={createValuation} submitLabel="Calcola la stima" pendingLabel="Calcolo…" hidden={tradeListingId ? { permuta: tradeListingId } : undefined} className={step === STEPS.length - 1 ? "" : "[&>div:last-child]:hidden"}>
      {(s) => {
        const e = s.fieldErrors ?? {};
        return (
          <>
            <ol className="flex gap-2" aria-label="Avanzamento">{STEPS.map((l, i) => (
              <li key={l} className="flex-1"><button type="button" onClick={() => i < step && setStep(i)} className={`h-1.5 w-full rounded-full ${i <= step ? "bg-orange" : "bg-line"}`} aria-label={`Passo ${i + 1}: ${l}`} aria-current={i === step ? "step" : undefined} />
                <span className={`mt-1 block text-xs ${i === step ? "font-bold" : "text-muted"}`}>{i + 1}. {l}</span></li>))}</ol>
            {Object.keys(e).length > 0 && <p role="alert" className="text-sm text-danger">Controlla: {Object.keys(e).join(", ")}</p>}

            <fieldset ref={(el) => { refs.current[0] = el; }} className={`${show(0)} flex-col gap-3`}>
              <legend className="sr-only">Auto</legend>
              {vehicles.length > 0 && <Field id="w-v" label="Scegli dal tuo garage" optional><Select id="w-v" name="user_vehicle_id" value={vid} onChange={(ev) => setVid(ev.target.value)}>{vehicles.map((x) => <option key={x.id} value={x.id}>{x.make} {x.model}</option>)}<option value="">Un&apos;altra auto</option></Select></Field>}
              <div className="grid gap-3 sm:grid-cols-2" key={vid}>
                <Field id="w-mk" label="Marca" error={e.make}><Input id="w-mk" name="make" required defaultValue={v?.make ?? ""} /></Field>
                <Field id="w-md" label="Modello" error={e.model}><Input id="w-md" name="model" required defaultValue={v?.model ?? ""} /></Field>
                <Field id="w-vr" label="Versione e allestimento" optional><Input id="w-vr" name="version" defaultValue={v?.version ?? ""} /></Field>
                <Field id="w-yr" label="Anno di immatricolazione" error={e.year}><Input id="w-yr" name="year" type="number" min={1950} max={2100} required defaultValue={v?.year ?? ""} /></Field>
                <Field id="w-km" label="Chilometraggio" error={e.mileage_km}><Input id="w-km" name="mileage_km" type="number" min={0} required defaultValue={v?.current_mileage_km ?? ""} /></Field>
              </div>
            </fieldset>

            <fieldset ref={(el) => { refs.current[1] = el; }} className={`${show(1)} grid gap-3 sm:grid-cols-2`} key={`t${vid}`}>
              <legend className="sr-only">Dati tecnici</legend>
              <Field id="w-fu" label="Alimentazione" optional><Select id="w-fu" name="fuel" defaultValue={v?.fuel ?? ""}><option value="">Non indicata</option>{Object.entries(FUELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <Field id="w-tr" label="Cambio" optional><Select id="w-tr" name="transmission" defaultValue={v?.transmission ?? ""}><option value="">Non indicato</option><option value="manuale">Manuale</option><option value="automatico">Automatico</option></Select></Field>
              <Field id="w-pw" label="Potenza (kW)" optional><Input id="w-pw" name="power_kw" type="number" min={1} defaultValue={v?.power_kw ?? ""} /></Field>
              <Field id="w-cc" label="Cilindrata (cc)" optional><Input id="w-cc" name="engine_cc" type="number" min={50} defaultValue={v?.engine_cc ?? ""} /></Field>
              <Field id="w-ow" label="Numero di proprietari" optional><Input id="w-ow" name="owners_count" type="number" min={1} max={20} /></Field>
            </fieldset>

            <fieldset ref={(el) => { refs.current[2] = el; }} className={`${show(2)} flex-col gap-3`}>
              <legend className="sr-only">Condizioni</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="w-co" label="Condizioni generali" error={e.condition}><Select id="w-co" name="condition" defaultValue="buone">{Object.entries(CONDITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field id="w-ac" label="Incidenti o danni"><Select id="w-ac" name="accidents" defaultValue="non_so">{Object.entries(ACCIDENTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field id="w-in" label="Revisione"><Select id="w-in" name="inspection_status" defaultValue="non_so">{Object.entries(INSPECTION_STATES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              </div>
              <Field id="w-dn" label="Descrizione dei danni" optional><Textarea id="w-dn" name="damage_notes" rows={2} maxLength={1000} /></Field>
              <fieldset><legend className="mb-1 text-sm font-semibold">Optional principali</legend>
                <div className="grid gap-2 sm:grid-cols-3">{OPTIONS.map((o) => <Checkbox key={o} id={`o-${o}`} name="options" value={o} label={o} />)}</div></fieldset>
            </fieldset>

            <fieldset ref={(el) => { refs.current[3] = el; }} className={`${show(3)} flex-col gap-3`}>
              <legend className="sr-only">Zona e foto</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="w-rg" label="Regione" error={e.region}><Select id="w-rg" name="region" defaultValue="Lombardia">{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
                <Field id="w-pr" label="Provincia" error={e.province}><Select id="w-pr" name="province" defaultValue="MI">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
              </div>
              <FileUploader bucket="valuation-photos" folder={userId} kind="image" label="Foto dell'auto (facoltative, restano private)" multiple max={12} name="photo_paths" />
              <p className="text-xs text-muted">Le foto non sono pubblicate: potrai scegliere quali mostrare ai professionisti a cui chiederai una valutazione.</p>
            </fieldset>

            <div className="flex justify-between gap-2">
              <button type="button" onClick={() => setStep((x) => Math.max(0, x - 1))} disabled={step === 0} className="rounded-full border border-line-strong px-5 py-2.5 font-semibold disabled:opacity-40">Indietro</button>
              {step < STEPS.length - 1 && <button type="button" onClick={next} className="rounded-full bg-ink px-5 py-2.5 font-semibold text-white">Avanti</button>}
            </div>
          </>
        );
      }}
    </ActionForm>
  );
}
