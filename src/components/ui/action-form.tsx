"use client";

import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import { Alert } from "./feedback";
import { SubmitButton } from "./submit-button";
import type { ButtonVariant, ButtonSize } from "./button";
import { initialFormState, type FormState } from "@/lib/validation/form-state";
import { cn } from "@/lib/utils";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/**
 * Modulo generico collegato a una Server Action: mostra conferme ed errori,
 * disabilita il pulsante durante l'invio. I campi sono passati come figli.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  hidden,
  resetOnSuccess = false,
  confirm,
}: {
  action: Action;
  children?: ReactNode | ((state: FormState) => ReactNode);
  submitLabel: string;
  pendingLabel?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  hidden?: Record<string, string | number | null | undefined>;
  resetOnSuccess?: boolean;
  /** Testo di conferma per azioni importanti (richiede un secondo clic). */
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, initialFormState);
  const [armed, setArmed] = useState(false);
  const key = resetOnSuccess && state.status === "success" ? JSON.stringify(state) : "form";
  const formId = useId();
  // Moduli costruiti sul server (senza funzione di rendering): gli errori dei singoli
  // campi si mostrano nel messaggio, con il nome del campo, e i campi vengono evidenziati.
  const inlineErrors = typeof children !== "function" && state.status === "error" && state.fieldErrors
    ? Object.entries(state.fieldErrors).filter(([, m]) => m).map(([name, msg]) => ({ name, msg, label: labelFor(formId, name) }))
    : [];
  const invalidNames = inlineErrors.map((e) => e.name).join("|");
  useEffect(() => {
    const form = document.getElementById(formId);
    if (!form) return;
    form.querySelectorAll("[aria-invalid][data-af-invalid]").forEach((el) => { el.removeAttribute("aria-invalid"); el.removeAttribute("data-af-invalid"); });
    if (!invalidNames) return;
    for (const name of invalidNames.split("|")) {
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((el) => { el.setAttribute("aria-invalid", "true"); el.setAttribute("data-af-invalid", ""); });
    }
  }, [formId, invalidNames]);

  return (
    <form key={key} id={formId} action={formAction} className={cn("flex flex-col gap-4", className)} noValidate>
      {state.message && (
        <Alert tone={state.status === "success" ? "success" : "error"}>
          {state.message}
          {inlineErrors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-sm">
              {inlineErrors.map((e) => <li key={e.name}>{e.label ? <strong>{e.label}: </strong> : null}{e.msg}</li>)}
            </ul>
          )}
        </Alert>
      )}
      {!state.message && inlineErrors.length > 0 && (
        <Alert tone="error">
          <ul className="list-disc pl-5 text-sm">{inlineErrors.map((e) => <li key={e.name}>{e.label ? <strong>{e.label}: </strong> : null}{e.msg}</li>)}</ul>
        </Alert>
      )}
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (v === null || v === undefined ? null : <input key={k} type="hidden" name={k} value={String(v)} />))}
      {typeof children === "function" ? children(state) : children}
      {confirm && !armed ? (
        <div>
          <button
            type="button"
            onClick={() => setArmed(true)}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-3.5 text-sm font-semibold",
              variant === "danger" ? "bg-danger text-white hover:bg-[#a72626]" : "border border-line-strong bg-white text-ink hover:bg-mist",
            )}
          >
            {submitLabel}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {confirm && <span className="text-sm font-medium text-ink">{confirm}</span>}
          <SubmitButton variant={variant} size={size} pendingText={pendingLabel}>
            {confirm ? "Conferma" : submitLabel}
          </SubmitButton>
          {confirm && (
            <button type="button" onClick={() => setArmed(false)} className="text-sm font-semibold text-muted hover:text-ink">
              Annulla
            </button>
          )}
        </div>
      )}
    </form>
  );
}

/** Testo dell'etichetta collegata al campo `name` del modulo (solo nel browser). */
function labelFor(formId: string, name: string): string | null {
  if (typeof document === "undefined") return null;
  const form = document.getElementById(formId);
  const field = form?.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
  if (!field) return null;
  const byFor = field.id ? form?.querySelector(`label[for="${CSS.escape(field.id)}"]`) : null;
  const label = byFor ?? field.closest("label");
  return label?.textContent?.replace("(facoltativo)", "").trim() || null;
}
