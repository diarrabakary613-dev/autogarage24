"use client";

import { useActionState } from "react";
import { adminReadConversation } from "@/lib/actions/admin";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/validation/form-state";

/** Lettura eccezionale di una conversazione segnalata: richiede motivazione ed è registrata nell'audit log. */
export function TranscriptForm({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState(adminReadConversation, initialFormState);
  const transcript = state.values?.transcript ? (JSON.parse(state.values.transcript) as { sender_id: string | null; body: string; created_at: string; attachment_name?: string | null }[]) : null;
  return (
    <details className="rounded-xl border border-warning/30 bg-warning-50 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Consulta la conversazione segnalata (accesso motivato e registrato)</summary>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="conversation_id" value={conversationId} />
        {state.message && <Alert tone={state.status === "success" ? "info" : "error"}>{state.message}</Alert>}
        <Field id={`j-${conversationId}`} label="Motivazione dell'accesso" error={state.fieldErrors?.justification}><Input id={`j-${conversationId}`} name="justification" maxLength={500} /></Field>
        <SubmitButton size="sm" variant="outline">Apri</SubmitButton>
      </form>
      {Array.isArray(transcript) && <ol className="mt-3 flex max-h-80 flex-col gap-1 overflow-y-auto">{transcript.map((m, i) => <li key={i} className="rounded bg-white p-2"><span className="text-xs text-muted">{new Date(m.created_at).toLocaleString("it-IT")} · {m.sender_id ? `utente ${m.sender_id.slice(0, 8)}` : "sistema"}</span><br />{m.body}{m.attachment_name ? ` (allegato: ${m.attachment_name})` : ""}</li>)}</ol>}
    </details>
  );
}
