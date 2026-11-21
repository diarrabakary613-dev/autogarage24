"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Alert } from "@/components/ui/feedback";
import { createRepairRequest } from "@/lib/actions/repair";
import { FUEL_LABELS, PROBLEM_LABELS } from "@/lib/labels";
import { dangerSignals } from "@/lib/garage/symptoms";

type Vehicle = { id: string; make: string; model: string; year: number | null; current_mileage_km: number | null };

/** Modulo «Richiedi un intervento»: semplice anche per chi non è esperto. */
export function RepairRequestForm({ vehicles, defaultVehicle, defaultCategory, today }: { vehicles: Vehicle[]; defaultVehicle?: string; defaultCategory?: string; today: string }) {
  const [vehicle, setVehicle] = useState(defaultVehicle && vehicles.some((v) => v.id === defaultVehicle) ? defaultVehicle : vehicles[0]?.id ?? "");
  const [pos, setPos] = useState<{ lat: string; lng: string } | null>(null);
  const [posState, setPosState] = useState<"idle" | "loading" | "error">("idle");
  const [text, setText] = useState("");
  const danger = dangerSignals(text);
  function locate() {
    if (!("geolocation" in navigator)) { setPosState("error"); return; }
    setPosState("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos({ lat: p.coords.latitude.toFixed(2), lng: p.coords.longitude.toFixed(2) }); setPosState("idle"); },
      () => setPosState("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }
  return (
    <ActionForm action={createRepairRequest} submitLabel="Continua: scegli le officine" pendingLabel="Invio…" hidden={{ lat: pos?.lat, lng: pos?.lng }}>
      {(s) => {
        const e = s.fieldErrors ?? {};
        return (
          <div className="grid gap-5">
            <fieldset className="grid gap-3">
              <legend className="mb-1 font-bold">1. La tua automobile</legend>
              {vehicles.length > 0 && (
                <Field id="rr-v" label="Auto del tuo garage">
                  <Select id="rr-v" name="user_vehicle_id" value={vehicle} onChange={(ev) => setVehicle(ev.target.value)}>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}{v.year ? ` (${v.year})` : ""}</option>)}
                    <option value="">Un&apos;altra automobile</option>
                  </Select>
                </Field>
              )}
              {!vehicle && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field id="rr-ma" label="Marca" error={e.make}><Input id="rr-ma" name="make" placeholder="Es. Fiat" /></Field>
                  <Field id="rr-mo" label="Modello"><Input id="rr-mo" name="model" placeholder="Es. Panda" /></Field>
                  <Field id="rr-y" label="Anno di immatricolazione" optional><Input id="rr-y" name="year" inputMode="numeric" maxLength={4} /></Field>
                  <Field id="rr-f" label="Alimentazione" optional><Select id="rr-f" name="fuel" defaultValue=""><option value="">—</option>{Object.entries(FUEL_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                </div>
              )}
              <Field id="rr-km" label="Chilometraggio attuale" optional className="sm:max-w-xs"><Input id="rr-km" name="mileage_km" inputMode="numeric" defaultValue={vehicles.find((v) => v.id === vehicle)?.current_mileage_km ?? ""} /></Field>
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="mb-1 font-bold">2. Di cosa hai bisogno</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Tipo di intervento">
                {Object.entries(PROBLEM_LABELS).map(([k, l]) => (
                  <label key={k} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3 py-2.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-mist">
                    <input type="radio" name="category" value={k} defaultChecked={k === defaultCategory} className="accent-orange" /> {l}
                  </label>
                ))}
              </div>
              {e.category && <p className="text-xs text-danger">{e.category}</p>}
              <Field id="rr-d" label="Descrivi il problema" error={e.description} hint="Cosa succede, da quando, spie accese, rumori. Foto e video si aggiungono al passo successivo.">
                <Textarea id="rr-d" name="description" rows={5} value={text} onChange={(ev) => setText(ev.target.value)} />
              </Field>
              {danger.length > 0 && <Alert tone="warning" title="Attenzione">Hai descritto segnali che possono indicare un pericolo ({danger.join(", ")}). Se l&apos;auto non è sicura, non guidarla: chiama il soccorso stradale.</Alert>}
            </fieldset>
            <fieldset className="grid gap-3">
              <legend className="mb-1 font-bold">3. Dove e quando</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="rr-c" label="Città" error={e.city}><Input id="rr-c" name="city" defaultValue="Milano" autoComplete="address-level2" /></Field>
                <Field id="rr-cap" label="CAP" optional error={e.postal_code}><Input id="rr-cap" name="postal_code" inputMode="numeric" maxLength={5} /></Field>
                <div className="flex items-end">
                  <button type="button" onClick={locate} className="inline-flex h-11 items-center gap-2 rounded-md border border-line-strong px-3 text-sm font-semibold hover:border-ink">
                    <LocateFixed className="size-4" aria-hidden />{pos ? "Posizione acquisita (~1 km)" : posState === "loading" ? "Rilevamento…" : "Usa la mia posizione"}
                  </button>
                </div>
              </div>
              {posState === "error" && <p className="text-xs text-danger">Posizione non disponibile: useremo città e CAP.</p>}
              <p className="text-xs text-muted">La posizione è facoltativa, arrotondata a circa 1 km e usata solo per calcolare le distanze dalle officine. Non viene mostrata a nessuno.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="rr-pd" label="Data preferita" optional><Input id="rr-pd" name="preferred_date" type="date" min={today} /></Field>
                <Field id="rr-ps" label="Fascia oraria"><Select id="rr-ps" name="preferred_slot" defaultValue="qualsiasi"><option value="qualsiasi">Qualsiasi</option><option value="mattina">Mattina</option><option value="pomeriggio">Pomeriggio</option><option value="sera">Sera</option></Select></Field>
                <Field id="rr-av" label="Disponibilità" optional><Input id="rr-av" name="availability" placeholder="Es. mattine dal lunedì al venerdì" /></Field>
              </div>
            </fieldset>
          </div>
        );
      }}
    </ActionForm>
  );
}
