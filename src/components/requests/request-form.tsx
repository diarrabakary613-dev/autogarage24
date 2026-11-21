"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { CheckCircle2, Paperclip } from "lucide-react";
import { createRequest } from "@/lib/actions/requests";
import { sendAttachments } from "@/lib/client/upload";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea, describedBy } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/validation/form-state";
import type { Enums } from "@/lib/supabase/database.types";

export type RequestTarget = {
  listing_id?: string;
  professional_profile_id?: string;
  part_id?: string;
};
export type GarageVehicle = { id: string; label: string };
export type ServiceOption = { id: string; name: string };

const SLOT_OPTIONS: [Enums<"time_slot">, string][] = [["qualsiasi", "Qualsiasi orario"], ["mattina", "Mattina"], ["pomeriggio", "Pomeriggio"], ["sera", "Sera"]];

/**
 * Modulo unico per richieste informazioni / appuntamento / preventivo / assistenza.
 * Il destinatario è derivato dal database; il client indica solo l'oggetto.
 */
export function RequestForm({
  kinds,
  target,
  defaultSubject,
  defaultMessage,
  vehicles = [],
  services = [],
  workModes,
  showVehicle = false,
  showPartCode = false,
  allowAttachments = true,
  returnTo,
}: {
  kinds: { value: Enums<"request_kind">; label: string }[];
  target: RequestTarget;
  defaultSubject: string;
  defaultMessage: string;
  vehicles?: GarageVehicle[];
  services?: ServiceOption[];
  workModes?: { value: Enums<"work_mode">; label: string }[];
  showVehicle?: boolean;
  showPartCode?: boolean;
  allowAttachments?: boolean;
  returnTo: string;
}) {
  const [state, action] = useActionState(createRequest, initialFormState);
  const [kind, setKind] = useState(kinds[0].value);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">("idle");
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [vehicleChoice, setVehicleChoice] = useState(vehicles[0]?.id ?? "");
  const uploaded = useRef(false);
  const fe = state.fieldErrors ?? {};
  const needsDate = kind === "appuntamento" || kind === "appuntamento_auto";
  const today = new Date().toISOString().slice(0, 10);

  // Dopo la creazione della richiesta, gli allegati vengono inviati nella conversazione collegata.
  useEffect(() => {
    const conv = state.values?.conversation_id;
    if (state.status !== "success" || !conv || uploaded.current || files.length === 0) return;
    uploaded.current = true;
    setUploadState("uploading");
    sendAttachments(conv, files, "Fotografia allegata alla richiesta").then((errs) => {
      setUploadErrors(errs);
      setUploadState("done");
    });
  }, [state, files]);

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-success/30 bg-success-50 p-5" role="status">
        <p className="flex items-center gap-2 font-bold text-ink"><CheckCircle2 className="size-5 text-success" aria-hidden /> Richiesta inviata</p>
        <p className="text-sm text-graphite">{state.message}</p>
        {uploadState === "uploading" && <p className="text-sm text-muted">Caricamento delle fotografie in corso…</p>}
        {uploadErrors.length > 0 && <Alert tone="warning">Alcuni allegati non sono stati inviati: {uploadErrors.join(" · ")}</Alert>}
        <div className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link className="text-orange-700 hover:underline" href={`/dashboard/richieste/${state.values?.request_id}`}>Segui la richiesta</Link>
          {state.values?.conversation_id && <Link className="text-orange-700 hover:underline" href={`/dashboard/messaggi/${state.values.conversation_id}`}>Apri la conversazione</Link>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      {Object.entries(target).map(([k, v]) => v ? <input key={k} type="hidden" name={k} value={v} /> : null)}
      <input type="hidden" name="return_to" value={returnTo} />

      {kinds.length > 1 ? (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1.5 text-sm font-semibold">Cosa desideri?</legend>
          {kinds.map((k) => (
            <label key={k.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-line-strong px-3 py-2.5 text-sm font-medium has-[:checked]:border-ink has-[:checked]:bg-mist">
              <input type="radio" name="kind" value={k.value} checked={kind === k.value} onChange={() => setKind(k.value)} className="accent-orange" />
              {k.label}
            </label>
          ))}
        </fieldset>
      ) : (
        <input type="hidden" name="kind" value={kind} />
      )}

      {services.length > 0 && (
        <Field id="rq-service" label="Servizio" optional>
          <Select id="rq-service" name="service_id" defaultValue="">
            <option value="">Descrivo liberamente la mia necessità</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
      )}

      {showVehicle && (
        <div className="flex flex-col gap-3 rounded-xl bg-mist p-4">
          <Field id="rq-vehicle" label="Automobile">
            <Select id="rq-vehicle" name="user_vehicle_id" value={vehicleChoice} onChange={(e) => setVehicleChoice(e.target.value)}>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              <option value="">Un&apos;altra automobile (inserisco i dati)</option>
            </Select>
          </Field>
          {vehicleChoice === "" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="rq-make" label="Marca"><Input id="rq-make" name="vehicle_make" maxLength={60} /></Field>
              <Field id="rq-model" label="Modello"><Input id="rq-model" name="vehicle_model" maxLength={80} /></Field>
              <Field id="rq-year" label="Anno"><Input id="rq-year" name="vehicle_year" inputMode="numeric" maxLength={4} /></Field>
            </div>
          )}
        </div>
      )}

      <Field id="rq-subject" label="Oggetto" error={fe.subject}>
        <Input id="rq-subject" name="subject" defaultValue={state.values?.subject ?? defaultSubject} maxLength={200} {...describedBy("rq-subject", fe.subject)} />
      </Field>
      <Field id="rq-message" label="Messaggio" error={fe.message} hint="Puoi modificare il testo proposto.">
        <Textarea id="rq-message" name="message" rows={5} defaultValue={defaultMessage} maxLength={4000} {...describedBy("rq-message", fe.message, true)} />
      </Field>

      {kind === "assistenza" && (
        <Field id="rq-started" label="Quando si è verificato il problema?" optional>
          <Input id="rq-started" name="problem_started" maxLength={200} placeholder="Es. da tre giorni, a freddo" />
        </Field>
      )}
      {showPartCode && (
        <Field id="rq-pit" label="Cosa ti serve">
          <Select id="rq-pit" name="part_inquiry_type" defaultValue="informazioni">
            <option value="informazioni">Informazioni sul ricambio</option><option value="disponibilita">Verifica della disponibilità</option>
            <option value="spedizione">Richiesta di spedizione</option><option value="ritiro">Prenotazione del ritiro</option>
          </Select>
        </Field>
      )}
      {showPartCode && (
        <Field id="rq-code" label="Codice del componente" optional hint="Codice OEM o del produttore, se lo conosci.">
          <Input id="rq-code" name="part_code" maxLength={60} />
        </Field>
      )}
      {workModes && workModes.length > 0 && (
        <Field id="rq-mode" label="Modalità di intervento" optional>
          <Select id="rq-mode" name="work_mode" defaultValue="">
            <option value="">Indifferente</option>
            {workModes.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
      )}
      {(workModes?.some((m) => m.value === "mobile") || kind === "assistenza") && (
        <Field id="rq-loc" label="Luogo dell'intervento" optional hint="Solo città o zona: non serve l'indirizzo completo.">
          <Input id="rq-loc" name="location_text" maxLength={200} />
        </Field>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="rq-date" label={needsDate ? "Data desiderata" : "Data preferita"} optional={!needsDate} error={fe.preferred_date}>
          <Input id="rq-date" name="preferred_date" type="date" min={today} {...describedBy("rq-date", fe.preferred_date)} />
        </Field>
        <Field id="rq-slot" label="Fascia oraria">
          <Select id="rq-slot" name="preferred_slot" defaultValue="qualsiasi">
            {SLOT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
        </Field>
      </div>
      {needsDate && <p className="text-xs text-muted">La data è una richiesta: l&apos;appuntamento sarà confermato solo dopo l&apos;accettazione esplicita del destinatario.</p>}

      <Field id="rq-contact" label="Come preferisci essere ricontattato?">
        <Select id="rq-contact" name="contact_preference" defaultValue="messaggio">
          <option value="messaggio">Messaggi su AutoGarage24</option>
          <option value="email">Email dell&apos;account</option>
          <option value="telefono">Telefono (lo comunicherai in chat)</option>
        </Select>
      </Field>

      {allowAttachments && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="rq-files" className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4" aria-hidden /> Fotografie o documenti <span className="font-normal text-muted">(facoltativo, max 6 · JPG, PNG, WebP o PDF fino a 10 MB)</span></label>
          <input
            id="rq-files"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/quicktime,video/webm"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-mist file:px-3 file:py-2 file:font-semibold"
          />
          {files.length > 0 && <p className="text-xs text-muted">{files.length} file selezionati: verranno inviati nella conversazione privata della richiesta.</p>}
        </div>
      )}

      <SubmitButton pendingText="Invio in corso…">Invia richiesta</SubmitButton>
      <p className="text-xs text-muted">Il destinatario vedrà il tuo nome e il messaggio, non la tua email o il tuo telefono, salvo che tu decida di comunicarli.</p>
    </form>
  );
}
