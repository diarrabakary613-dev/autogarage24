import type { z } from "zod";

/** Stato restituito dalle Server Action ai moduli (useActionState). */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Valori da ripresentare nel modulo in caso di errore (mai le password). */
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

/** Converte gli errori zod in un oggetto { campo: primo messaggio }. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Estrae i valori testuali di un FormData, escludendo i campi sensibili. */
export function safeValues(formData: FormData, exclude: string[] = []): Record<string, string> {
  const blocked = new Set(["password", "confirmPassword", ...exclude]);
  const out: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (!blocked.has(key) && !key.startsWith("$") && typeof value === "string") out[key] = value;
  });
  return out;
}
