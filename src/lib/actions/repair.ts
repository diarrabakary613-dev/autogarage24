"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PROBLEM_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, num, ok, str } from "./helpers";

const FUELS = ["benzina", "diesel", "gpl", "metano", "ibrida", "ibrida_plugin", "elettrica", "altra"];

/** Fase 16: crea la richiesta di intervento (poi il cliente sceglie a quali officine inviarla). */
export async function createRepairRequest(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/accedi?next=/richiedi-intervento");
  const vehicle = str(fd, "user_vehicle_id", 40);
  const category = str(fd, "category", 30);
  const description = str(fd, "description", 4000);
  const city = str(fd, "city", 80);
  const cap = str(fd, "postal_code", 5);
  const fuel = str(fd, "fuel", 20);
  const errors: Record<string, string> = {};
  if (!category || !(category in PROBLEM_LABELS)) errors.category = "Scegli il tipo di intervento.";
  if (!description || description.length < 20) errors.description = "Descrivi il problema con almeno 20 caratteri.";
  if (!city || city.length < 2) errors.city = "Indica la città.";
  if (cap && !/^\d{5}$/.test(cap)) errors.postal_code = "CAP di 5 cifre.";
  const useVehicle = vehicle && isUuid(vehicle) ? vehicle : null;
  if (!useVehicle && (!str(fd, "make", 60) || !str(fd, "model", 80))) errors.make = "Indica marca e modello oppure scegli un'auto del tuo garage.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const date = str(fd, "preferred_date", 10);
  const slot = str(fd, "preferred_slot", 20) ?? "qualsiasi";
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_repair_request", {
    p_vehicle_make: str(fd, "make", 60) ?? "", p_vehicle_model: str(fd, "model", 80) ?? "", p_vehicle_year: int(fd, "year", 1950, 2100) as number,
    p_fuel: (fuel && FUELS.includes(fuel) ? fuel : null) as Enums<"fuel_type">, p_mileage_km: int(fd, "mileage_km", 0, 2_000_000) as number,
    p_category: category!, p_description: description!, p_availability: str(fd, "availability", 300) ?? "",
    p_preferred_date: (date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null) as string,
    p_preferred_slot: (["mattina", "pomeriggio", "sera", "qualsiasi"].includes(slot) ? slot : "qualsiasi") as Enums<"time_slot">,
    p_city: city!, p_postal_code: cap ?? "", p_latitude: num(fd, "lat", -90, 90) ?? undefined, p_longitude: num(fd, "lng", -180, 180) ?? undefined,
    p_user_vehicle_id: useVehicle ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/richieste-intervento/${data}`);
}

export async function dispatchRepairRequest(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "repair_id", 40);
  const ids = fd.getAll("profile_ids").filter((v): v is string => typeof v === "string" && isUuid(v));
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  if (!ids.length) return fail("Seleziona almeno un'officina.");
  if (ids.length > 5) return fail("Puoi selezionare al massimo 5 officine alla volta.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dispatch_repair_request", { repair_id: id, profile_ids: ids });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste-intervento/${id}`);
  return ok(`Richiesta inviata a ${data} ${data === 1 ? "officina" : "officine"}. Riceverai una notifica per ogni risposta.`);
}

export async function cancelRepairRequest(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "repair_id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_repair_request", { repair_id: id, reason: str(fd, "reason", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste-intervento/${id}`);
  return ok("Richiesta annullata. Le officine coinvolte sono state avvisate.");
}
