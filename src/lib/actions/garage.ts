"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { findBrand } from "@/config/brands";
import { EXPENSE_LABELS, FUEL_LABELS, MAINTENANCE_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, num, ok, str } from "./helpers";

const money = (fd: FormData, k: string) => {
  const s = str(fd, k, 20);
  if (!s) return null;
  const n = Math.round(Number(s.replace(/\./g, "").replace(",", ".")) * 100);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const isoDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const refresh = () => { ["/dashboard/garage-auto", "/dashboard/manutenzione", "/dashboard/manutenzione/storico", "/dashboard/manutenzione/costi", "/dashboard/documenti-auto"].forEach((p) => revalidatePath(p)); };

/** Automobile del garage virtuale. Targa e VIN sono facoltativi e restano privati (solo il titolare). */
export async function saveVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/garage-auto");
  const brand = findBrand(str(fd, "make_slug", 40));
  const make = brand?.name ?? str(fd, "make_other", 60);
  const model = str(fd, "model", 80);
  const errors: Record<string, string> = {};
  if (!make) errors.make_slug = "Indica la marca.";
  if (!model) errors.model = "Indica il modello.";
  const plate = str(fd, "plate", 12)?.toUpperCase().replace(/\s/g, "") ?? null;
  if (plate && !/^[A-Z0-9]{5,10}$/.test(plate)) errors.plate = "Targa non valida.";
  const vin = str(fd, "vin", 17)?.toUpperCase() ?? null;
  if (vin && !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) errors.vin = "Il VIN ha 17 caratteri (senza I, O, Q).";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const fuel = str(fd, "fuel", 30);
  const tr = str(fd, "transmission", 30);
  const row = {
    make_slug: brand?.slug ?? null, make: make!, model: model!, version: str(fd, "version", 120), engine_code: str(fd, "engine_code", 40),
    year: int(fd, "year", 1950, 2100), registration_date: isoDate(str(fd, "registration_date", 10)), purchase_date: isoDate(str(fd, "purchase_date", 10)),
    fuel: (fuel && fuel in FUEL_LABELS ? fuel : null) as Enums<"fuel_type"> | null,
    transmission: (tr && tr in TRANSMISSION_LABELS ? tr : null) as Enums<"transmission_type"> | null,
    engine_cc: int(fd, "engine_cc", 0, 10000), power_kw: num(fd, "power_kw", 1, 1999), plate, vin,
  };
  const supabase = await createClient();
  const id = str(fd, "vehicle_id", 40);
  if (id && isUuid(id)) {
    const { error } = await supabase.from("user_vehicles").update(row).eq("id", id).eq("owner_id", user.id);
    if (error) return fail(dbErrorMessage(error));
    refresh();
    return ok("Automobile aggiornata.");
  }
  const { count } = await supabase.from("user_vehicles").select("id", { count: "exact", head: true }).is("deleted_at", null);
  const km = int(fd, "current_mileage_km", 0, 2_000_000);
  const { data, error } = await supabase.from("user_vehicles").insert({ ...row, owner_id: user.id, is_primary: (count ?? 0) === 0 }).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  if (km !== null) await supabase.from("mileage_logs").insert({ user_vehicle_id: data.id, value_km: km, note: "Valore iniziale" });
  refresh();
  redirect(`/dashboard/garage-auto?auto=${data.id}`);
}

export async function deleteVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/garage-auto");
  const id = str(fd, "vehicle_id", 40);
  if (!id || !isUuid(id)) return fail("Automobile non valida.");
  const supabase = await createClient();
  // Cancellazione logica: lo storico resta esportabile; i documenti si eliminano dalla sezione Documenti.
  const { error } = await supabase.from("user_vehicles").update({ deleted_at: new Date().toISOString(), is_primary: false }).eq("id", id).eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok("Automobile rimossa dal garage.");
}

export async function setPrimaryVehicle(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "vehicle_id", 40);
  if (!id || !isUuid(id)) return fail("Automobile non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_primary_vehicle", { vehicle_id: id });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok("Automobile principale aggiornata.");
}

export async function registerVehiclePhoto(vehicleId: string, path: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/dashboard/garage-auto");
  if (!isUuid(vehicleId) || typeof path !== "string" || !path.startsWith(`${user.id}/`) || path.includes("..")) return { ok: false, error: "File non valido." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_vehicles").update({ photo_path: path }).eq("id", vehicleId).eq("owner_id", user.id);
  if (error) return { ok: false, error: dbErrorMessage(error) };
  refresh();
  return { ok: true };
}

/** Nuovo valore del contachilometri: le incoerenze vengono segnalate, mai corrette in automatico. */
export async function addMileage(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/garage-auto");
  const id = str(fd, "vehicle_id", 40);
  const km = int(fd, "value_km", 0, 2_000_000);
  const date = isoDate(str(fd, "recorded_on", 10)) ?? new Date().toISOString().slice(0, 10);
  if (!id || !isUuid(id)) return fail("Automobile non valida.");
  if (km === null) return fail("Indica i chilometri.", { value_km: "Indica i chilometri." });
  if (date > new Date().toISOString().slice(0, 10)) return fail("La data non può essere futura.", { recorded_on: "Data futura." });
  const supabase = await createClient();
  const { data, error } = await supabase.from("mileage_logs").insert({ user_vehicle_id: id, value_km: km, recorded_on: date, note: str(fd, "note", 300) }).select("is_inconsistent").single();
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return data.is_inconsistent
    ? { status: "success", message: "Valore salvato ma incoerente con le letture precedenti (ad esempio inferiore a un valore più vecchio): controlla il dato. Il chilometraggio attuale non è stato modificato." }
    : ok("Chilometraggio aggiornato.");
}

export async function saveRecord(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/manutenzione/storico");
  const vehicle = str(fd, "user_vehicle_id", 40);
  const title = str(fd, "title", 140);
  const category = str(fd, "category", 40);
  const date = isoDate(str(fd, "performed_on", 10));
  const cost = money(fd, "cost");
  const errors: Record<string, string> = {};
  if (!vehicle || !isUuid(vehicle)) errors.user_vehicle_id = "Scegli l'automobile.";
  if (!title || title.length < 2) errors.title = "Indica il titolo.";
  if (!category || !(category in MAINTENANCE_LABELS)) errors.category = "Scegli la categoria.";
  if (!date) errors.performed_on = "Indica la data.";
  if (Number.isNaN(cost)) errors.cost = "Importo non valido.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const km = int(fd, "mileage_km", 0, 2_000_000);
  const { data, error } = await supabase.from("maintenance_records").insert({
    user_vehicle_id: vehicle!, owner_id: user.id, title: title!, category: category as Enums<"maintenance_category">, performed_on: date!,
    mileage_km: km, description: str(fd, "description", 4000), provider_name: str(fd, "provider_name", 160), cost_cents: cost,
    parts_used: str(fd, "parts_used", 2000), notes: str(fd, "notes", 2000), source: "manuale",
  }).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  if (cost !== null && cost > 0 && str(fd, "add_expense", 5) === "on") {
    const expCat: Enums<"expense_category"> = category === "tagliando" ? "tagliandi" : category === "pneumatici" ? "pneumatici" : category === "revisione" ? "revisione" : "riparazioni";
    await supabase.from("vehicle_expenses").insert({ owner_id: user.id, user_vehicle_id: vehicle!, record_id: data.id, category: expCat, amount_cents: cost, spent_on: date!, description: title });
  }
  if (km !== null) await supabase.from("mileage_logs").insert({ user_vehicle_id: vehicle!, value_km: km, recorded_on: date!, source: "intervento", note: title });
  refresh();
  return ok("Intervento aggiunto allo storico (registrato manualmente).");
}

export async function deleteRecord(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/manutenzione/storico");
  const id = str(fd, "record_id", 40);
  if (!id || !isUuid(id)) return fail("Intervento non valido.");
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_records").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok("Intervento eliminato.");
}

const DOC_CATS = ["fattura", "ricevuta", "preventivo", "manutenzione", "tecnico", "foto", "altro"];

/** Registra un documento già caricato nella cartella privata dell'utente. */
export async function registerDocument(meta: { vehicleId: string; recordId?: string | null; category: string; title: string; date?: string | null }, path: string, fileName: string, size: number): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/dashboard/documenti-auto");
  if (!Number.isInteger(size) || size <= 0 || size > 10 * 1024 * 1024) return { ok: false, error: "Dimensione non valida." };
  if (!isUuid(meta.vehicleId) || !path.startsWith(`${user.id}/`) || path.includes("..")) return { ok: false, error: "Dati non validi." };
  const ext = path.split(".").pop();
  const mime = ext === "pdf" ? "application/pdf" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const supabase = await createClient();
  const { error } = await supabase.from("user_vehicle_documents").insert({
    owner_id: user.id, user_vehicle_id: meta.vehicleId, record_id: meta.recordId && isUuid(meta.recordId) ? meta.recordId : null,
    category: DOC_CATS.includes(meta.category) ? meta.category : "altro", title: (meta.title || fileName).slice(0, 160),
    document_date: isoDate(meta.date ?? null), storage_path: path, mime_type: mime, size_bytes: size,
  });
  if (error) { await supabase.storage.from("vehicle-documents").remove([path]); return { ok: false, error: dbErrorMessage(error) }; }
  refresh();
  return { ok: true };
}

export async function deleteDocument(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/documenti-auto");
  const id = str(fd, "document_id", 40);
  if (!id || !isUuid(id)) return fail("Documento non valido.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_vehicle_documents").delete().eq("id", id).eq("owner_id", user.id).select("storage_path").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data?.storage_path.startsWith(`${user.id}/`)) await supabase.storage.from("vehicle-documents").remove([data.storage_path]);
  refresh();
  return ok("Documento eliminato definitivamente.");
}

const REMINDER_CATS = ["revisione", "assicurazione", "bollo", "cambio_olio", "tagliando", "pneumatici", "batteria", "manutenzione", "altro"];

/** Promemoria configurabile: nessun intervallo "universale" viene proposto in automatico. */
export async function saveReminder(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/manutenzione");
  const vehicle = str(fd, "user_vehicle_id", 40);
  const title = str(fd, "title", 140);
  const category = str(fd, "category", 30);
  const due = isoDate(str(fd, "due_date", 10));
  const dueKm = int(fd, "due_mileage_km", 0, 2_000_000);
  const errors: Record<string, string> = {};
  if (!vehicle || !isUuid(vehicle)) errors.user_vehicle_id = "Scegli l'automobile.";
  if (!title) errors.title = "Indica il titolo.";
  if (!category || !REMINDER_CATS.includes(category)) errors.category = "Scegli la categoria.";
  if (!due && dueKm === null) errors.due_date = "Indica una data o un chilometraggio.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const row = {
    user_vehicle_id: vehicle!, title: title!, category: category!, description: str(fd, "description", 1000), due_date: due, due_mileage_km: dueKm,
    recurrence_months: int(fd, "recurrence_months", 1, 120), recurrence_km: int(fd, "recurrence_km", 500, 200000),
    notify_days_before: int(fd, "notify_days_before", 0, 120) ?? 15, notify_email: str(fd, "notify_email", 5) === "on",
  };
  const id = str(fd, "reminder_id", 40);
  const { error } = id && isUuid(id)
    ? await supabase.from("maintenance_reminders").update(row).eq("id", id).eq("owner_id", user.id)
    : await supabase.from("maintenance_reminders").insert({ ...row, owner_id: user.id });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok("Promemoria salvato. Riceverai le notifiche secondo le tue preferenze.");
}

export async function reminderAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/manutenzione");
  const id = str(fd, "reminder_id", 40);
  const action = str(fd, "action", 20);
  if (!id || !isUuid(id)) return fail("Promemoria non valido.");
  const supabase = await createClient();
  let error;
  if (action === "completa") ({ error } = await supabase.rpc("complete_reminder", { reminder_id: id }));
  else if (action === "disattiva") ({ error } = await supabase.from("maintenance_reminders").update({ status: "disattivato" }).eq("id", id).eq("owner_id", user.id));
  else if (action === "riattiva") ({ error } = await supabase.from("maintenance_reminders").update({ status: "attivo" }).eq("id", id).eq("owner_id", user.id));
  else if (action === "elimina") ({ error } = await supabase.from("maintenance_reminders").delete().eq("id", id).eq("owner_id", user.id));
  else return fail("Operazione non valida.");
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok(action === "completa" ? "Promemoria completato (se ricorrente, è stato creato il successivo)." : "Promemoria aggiornato.");
}

export async function saveExpense(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/manutenzione/costi");
  const vehicle = str(fd, "user_vehicle_id", 40);
  const category = str(fd, "category", 30);
  const amount = money(fd, "amount");
  const date = isoDate(str(fd, "spent_on", 10));
  const errors: Record<string, string> = {};
  if (!vehicle || !isUuid(vehicle)) errors.user_vehicle_id = "Scegli l'automobile.";
  if (!category || !(category in EXPENSE_LABELS)) errors.category = "Scegli la categoria.";
  if (amount === null || Number.isNaN(amount) || amount <= 0) errors.amount = "Importo non valido.";
  if (!date) errors.spent_on = "Indica la data.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_expenses").insert({ owner_id: user.id, user_vehicle_id: vehicle!, category: category as Enums<"expense_category">, amount_cents: amount!, spent_on: date!, description: str(fd, "description", 300) });
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok("Spesa registrata.");
}

export async function deleteExpense(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/manutenzione/costi");
  const id = str(fd, "expense_id", 40);
  if (!id || !isUuid(id)) return fail("Spesa non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_expenses").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  refresh();
  return ok("Spesa eliminata.");
}
