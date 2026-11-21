import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { FormState } from "@/lib/validation/form-state";
import { t } from "@/i18n";

/** Codici di errore sollevati dalle funzioni del database con messaggi già in italiano per l'utente. */
const USER_FACING_CODES = new Set(["42501", "22023", "P0002", "23505", "54000", "23P01", "22001"]);

/** Traduce un errore del database in un messaggio comprensibile (mai dettagli tecnici). */
export function dbErrorMessage(error: Pick<PostgrestError, "code" | "message"> | null | undefined): string {
  if (!error) return t.auth.genericError;
  if (error.code && USER_FACING_CODES.has(error.code) && error.message && !/permission denied|violates|relation|column/i.test(error.message)) {
    return error.message;
  }
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message ?? "")) {
    return "Non hai i permessi per questa operazione.";
  }
  if (error.code === "23505") return "Questo elemento esiste già.";
  if (error.code === "23514") return "Alcuni dati non sono validi: controlla i campi e riprova.";
  return t.auth.genericError;
}

export function ok(message: string): FormState {
  return { status: "success", message };
}

export function fail(message: string, fieldErrors?: Record<string, string>, values?: Record<string, string>): FormState {
  return { status: "error", message, fieldErrors, values };
}

/** Legge un campo testuale (trim, stringa vuota → null). */
export function str(fd: FormData, key: string, max = 4000): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s.slice(0, max);
}

export function int(fd: FormData, key: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const s = str(fd, key, 20);
  if (s === null) return null;
  const n = Number(s.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return r < min || r > max ? null : r;
}

export function num(fd: FormData, key: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const s = str(fd, key, 20);
  if (s === null) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Valore ammesso da un elenco chiuso, altrimenti null. */
export function oneOf<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T | null {
  const v = str(fd, key, 60);
  return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export function many<T extends string>(fd: FormData, key: string, allowed: readonly T[]): T[] {
  return fd.getAll(key).filter((v): v is T => typeof v === "string" && (allowed as readonly string[]).includes(v));
}

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
