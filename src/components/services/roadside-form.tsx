"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { FileUploader } from "@/components/ui/file-uploader";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createRoadsideRequest } from "@/lib/actions/roadside";
import { LOCATION_TYPES, ROADSIDE_PROBLEMS, VEHICLE_TYPES } from "@/lib/services/labels";

type Vehicle = { id: string; make: string; model: string; year: number | null; plate: string | null };

/** Richiesta rapida di soccorso: pochi campi, pulsanti grandi, posizione solo con consenso. */
export function RoadsideForm({ userId, vehicles, phone }: { userId: string; vehicles: Vehicle[]; phone: string | null }) {
  const [problem, setProblem] = useState("");
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [geo, setGeo] = useState<"idle" | "loading" | "error">("idle");
  const v = vehicles.find((x) => x.id === vehicleId);
  function locate() {
    if (!("geolocation" in navigator)) { setGeo("error"); return; }
    setGeo("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); setGeo("idle"); },
      () => setGeo("error"), { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  }
  return (
    <ActionForm action={createRoadsideRequest} submitLabel="Invia la richiesta di assistenza" pendingLabel="Invio…" size="lg">
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <fieldset>
              <legend className="mb-2 text-lg font-bold">1. Che problema hai?</legend>
              {e.problem && <p role="alert" className="mb-1 text-sm text-danger">{e.problem}</p>}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ROADSIDE_PROBLEMS.map((p) => (
                  <label key={p.key} className="cursor-pointer">
                    <input type="radio" name="problem" value={p.key} checked={problem === p.key} onChange={() => setProblem(p.key)} className="peer sr-only" required />
                    <span className="flex min-h-14 items-center justify-center rounded-xl border-2 border-line-strong px-3 py-2 text-center text-sm font-semibold peer-checked:border-orange peer-checked:bg-orange-50 peer-focus-visible:ring-2 peer-focus-visible:ring-orange">{p.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-lg font-bold">2. Dove sei?</legend>
              <div className="rounded-xl border border-line bg-mist p-3">
                <button type="button" onClick={locate} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 font-semibold text-white" disabled={geo === "loading"}>
                  <LocateFixed className="size-4" aria-hidden /> {geo === "loading" ? "Rilevo la posizione…" : pos ? "Aggiorna la posizione" : "Usa la mia posizione"}
                </button>
                {geo === "error" && <p className="mt-2 text-sm text-danger">Posizione non disponibile: inserisci l&apos;indirizzo qui sotto.</p>}
                {pos && (
                  <>
                    <p className="mt-2 text-sm">Posizione rilevata (precisione ~{Math.round(pos.acc)} m).</p>
                    <input type="hidden" name="latitude" value={pos.lat} /><input type="hidden" name="longitude" value={pos.lng} />
                    <Checkbox id="rs-consent" name="location_consent" defaultChecked label="Acconsento a condividere la posizione: gli operatori contattati vedono solo la zona (~1 km), quello che scelgo anche la posizione esatta fino alla fine dell'intervento." />
                  </>
                )}
              </div>
              <Field id="rs-area" label="Zona" error={e.area_text} hint="Città e quartiere, strada o casello. Visibile agli operatori contattati."><Input id="rs-area" name="area_text" required maxLength={120} placeholder="Milano, zona Navigli" /></Field>
              <Field id="rs-addr" label="Indirizzo o punto preciso" optional hint="Mostrato solo all'operatore scelto."><Input id="rs-addr" name="address_text" maxLength={300} autoComplete="street-address" /></Field>
              <Field id="rs-lt" label="Tipo di luogo" error={e.location_type}><Select id="rs-lt" name="location_type" defaultValue="strada">{Object.entries(LOCATION_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
            </fieldset>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-lg font-bold">3. Auto e contatto</legend>
              {vehicles.length > 0 && (
                <Field id="rs-veh" label="Auto dal tuo garage" optional>
                  <Select id="rs-veh" name="user_vehicle_id" value={vehicleId} onChange={(ev) => setVehicleId(ev.target.value)}>
                    {vehicles.map((x) => <option key={x.id} value={x.id}>{x.make} {x.model}{x.year ? ` (${x.year})` : ""}</option>)}<option value="">Un&apos;altra auto</option>
                  </Select>
                </Field>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="rs-vd" label="Marca e modello" error={e.vehicle_desc}><Input key={vehicleId} id="rs-vd" name="vehicle_desc" required maxLength={120} defaultValue={v ? `${v.make} ${v.model}` : ""} /></Field>
                <Field id="rs-vt" label="Tipo di veicolo"><Select id="rs-vt" name="vehicle_type" defaultValue="auto">{Object.entries(VEHICLE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                <Field id="rs-ph" label="Telefono" error={e.contact_phone} hint="Solo per l'operatore scelto."><Input id="rs-ph" name="contact_phone" type="tel" required autoComplete="tel" defaultValue={phone ?? ""} /></Field>
                <Field id="rs-pl" label="Targa" optional hint="Dato personale: solo per l'operatore scelto, mai pubblicata."><Input key={`p-${vehicleId}`} id="rs-pl" name="plate" maxLength={12} defaultValue={v?.plate ?? ""} className="uppercase" /></Field>
              </div>
              <Field id="rs-desc" label="Cosa è successo" error={e.description}><Textarea id="rs-desc" name="description" rows={3} required maxLength={2000} placeholder="Es. spia motore accesa, poi l'auto si è spenta e non riparte." /></Field>
              <Checkbox id="rs-drv" name="vehicle_drivable" label="L'auto si muove ancora (marciante)" />
              <Field id="rs-dest" label="Destinazione, se serve il traino" optional><Input id="rs-dest" name="destination_text" maxLength={200} placeholder="Es. la mia officina di fiducia, via…" /></Field>
              <FileUploader bucket="service-photos" folder={userId} kind="image" label="Aggiungi foto (facoltative)" multiple max={6} name="photo_paths" />
            </fieldset>
            <Checkbox id="rs-safe" name="people_safe" error={e.people_safe} label="Sono in un luogo sicuro e non ci sono feriti né pericoli immediati (altrimenti chiamo il 112)." />
          </>
        );
      }}
    </ActionForm>
  );
}
