"use client";

import { useActionState, useState, type ReactNode } from "react";
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

  return (
    <form key={key} action={formAction} className={cn("flex flex-col gap-4", className)} noValidate>
      {state.message && <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>}
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
