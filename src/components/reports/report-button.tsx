"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { submitReport } from "@/lib/actions/reports";
import { Alert } from "@/components/ui/feedback";
import { Field, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

const CATEGORIES: [string, string][] = [
  ["annuncio_sospetto", "Annuncio sospetto"], ["truffa", "Tentativo di truffa"], ["informazioni_ingannevoli", "Informazioni ingannevoli"],
  ["foto_non_autorizzate", "Fotografie non autorizzate"], ["profilo_falso", "Profilo falso"], ["comportamento_scorretto", "Comportamento scorretto"],
  ["spam", "Spam"], ["contenuto_inappropriato", "Contenuto inappropriato"], ["altro", "Altro"],
];

/** Segnala un contenuto. Il modulo si apre solo su richiesta; serve l'accesso. */
export function ReportButton({ targetType, targetId, targetLabel, returnTo }: { targetType: string; targetId?: string; targetLabel: string; returnTo: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(submitReport, initialFormState);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
        <Flag className="size-4" aria-hidden /> Segnala
      </button>
    );
  }
  if (state.status === "success") return <Alert tone="success">{state.message}</Alert>;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4" noValidate>
      <p className="font-semibold">Segnala questo contenuto</p>
      {state.message && <Alert tone="error">{state.message}</Alert>}
      <input type="hidden" name="target_type" value={targetType} />
      {targetId && <input type="hidden" name="target_id" value={targetId} />}
      <input type="hidden" name="target_label" value={targetLabel.slice(0, 200)} />
      <input type="hidden" name="return_to" value={returnTo} />
      <Field id="rp-cat" label="Motivo" error={state.fieldErrors?.category}>
        <Select id="rp-cat" name="category" defaultValue="">
          <option value="" disabled>Scegli…</option>
          {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      </Field>
      <Field id="rp-desc" label="Descrizione" error={state.fieldErrors?.description}>
        <Textarea id="rp-desc" name="description" rows={3} maxLength={3000} />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingText="Invio…">Invia segnalazione</SubmitButton>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-muted hover:text-ink">Annulla</button>
      </div>
    </form>
  );
}
