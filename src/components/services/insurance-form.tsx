"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createInsuranceRequest } from "@/lib/actions/insurance";
import { COVERAGES, PARTNER_TYPES, PROVINCES } from "@/lib/insurance/labels";

type V = { id: string; make: string; model: string; year: number | null; fuel: string | null; power_kw: number | null; registration_date: string | null; plate: string | null };
type P = { id: string; name: string; partner_type: string; privacy_url: string | null };

export function InsuranceForm({ vehicles, partners }: { vehicles: V[]; partners: P[] }) {
  const [vid, setVid] = useState(vehicles[0]?.id ?? "");
  const v = vehicles.find((x) => x.id === vid);
  return (
    <ActionForm action={createInsuranceRequest} submitLabel="Invia la richiesta ai partner scelti">
      {(s) => {
        const e = s.fieldErrors ?? {};
        return (
          <>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">1. Veicolo</legend>
              {vehicles.length > 0 && <Field id="iv" label="Dal tuo garage" optional className="sm:col-span-2"><Select id="iv" name="user_vehicle_id" value={vid} onChange={(ev) => setVid(ev.target.value)}>{vehicles.map((x) => <option key={x.id} value={x.id}>{x.make} {x.model}</option>)}<option value="">Un&apos;altra auto</option></Select></Field>}
              <Field id="mk" label="Marca" error={e.vehicle_make}><Input key={`mk${vid}`} id="mk" name="vehicle_make" required defaultValue={v?.make ?? ""} /></Field>
              <Field id="md" label="Modello" error={e.vehicle_model}><Input key={`md${vid}`} id="md" name="vehicle_model" required defaultValue={v?.model ?? ""} /></Field>
              <Field id="yr" label="Anno" optional><Input key={`yr${vid}`} id="yr" name="vehicle_year" type="number" min={1950} max={2100} defaultValue={v?.year ?? ""} /></Field>
              <Field id="fu" label="Alimentazione" optional><Input key={`fu${vid}`} id="fu" name="fuel" maxLength={30} defaultValue={v?.fuel ?? ""} /></Field>
              <Field id="pw" label="Potenza (kW)" optional><Input key={`pw${vid}`} id="pw" name="power_kw" type="number" min={1} defaultValue={v?.power_kw ?? ""} /></Field>
              <Field id="rd" label="Data di immatricolazione" optional><Input key={`rd${vid}`} id="rd" name="registration_date" type="date" defaultValue={v?.registration_date ?? ""} /></Field>
              <Field id="pl" label="Targa" optional hint="Dato personale: inviata solo ai partner che scegli, mai pubblicata. Molti partner la usano per recuperare la classe di merito." className="sm:col-span-2"><Input key={`pl${vid}`} id="pl" name="plate" maxLength={12} defaultValue={v?.plate ?? ""} className="uppercase" /></Field>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-lg font-bold">2. Coperture desiderate</legend>
              {e.coverages && <p role="alert" className="text-xs text-danger">{e.coverages}</p>}
              <div className="grid gap-2 sm:grid-cols-2">{Object.entries(COVERAGES).map(([k, c]) => <Checkbox key={k} id={`cv-${k}`} name="coverages" value={k} label={c.label} defaultChecked={k === "rca"} />)}</div>
            </fieldset>
            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-lg font-bold">3. Dati per il preventivo</legend>
              <Field id="pr" label="Provincia di residenza" error={e.province}><Select id="pr" name="province" defaultValue="MI">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</Select></Field>
              <Field id="cp" label="CAP" optional><Input id="cp" name="postal_code" inputMode="numeric" maxLength={5} /></Field>
              <Field id="ds" label="Decorrenza desiderata" optional><Input id="ds" name="desired_start" type="date" /></Field>
              <Field id="cc" label="Come preferisci essere ricontattato"><Select id="cc" name="contact_channel" defaultValue="piattaforma"><option value="piattaforma">Messaggi sulla piattaforma</option><option value="email">Email</option><option value="telefono">Telefono</option></Select></Field>
              <Field id="ph" label="Telefono" optional error={e.contact_phone}><Input id="ph" name="contact_phone" type="tel" /></Field>
              <Field id="nt" label="Note" optional className="sm:col-span-3"><Textarea id="nt" name="notes" rows={2} maxLength={1000} /></Field>
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-lg font-bold">4. A chi inviare la richiesta</legend>
              {e.partner_ids && <p role="alert" className="text-xs text-danger">{e.partner_ids}</p>}
              <div className="flex flex-col gap-2">{partners.map((p) => (
                <div key={p.id} className="rounded-xl border border-line p-3">
                  <Checkbox id={`p-${p.id}`} name="partner_ids" value={p.id} label={`${p.name} · ${PARTNER_TYPES[p.partner_type]}`} />
                  {p.privacy_url && <a className="ml-7 text-xs underline" href={p.privacy_url} target="_blank" rel="noreferrer noopener">Informativa privacy del partner</a>}
                </div>))}</div>
            </fieldset>
            <Checkbox id="cs" name="consent" error={e.consent} label="Acconsento alla trasmissione dei dati inseriti ai soli partner selezionati, per ricevere un preventivo. Ogni partner tratterà i dati come titolare autonomo secondo la propria informativa." />
            <p className="text-xs text-muted">Non inviamo la storia assicurativa né altri dati non presenti in questo modulo. Puoi ritirare la richiesta e cancellare i dati dalla tua area in qualsiasi momento.</p>
          </>
        );
      }}
    </ActionForm>
  );
}
