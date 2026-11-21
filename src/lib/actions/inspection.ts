"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { romeLocalToIso } from "@/lib/bookings/time";
import { INSPECTION_CATEGORIES, INSPECTION_SERVICES, OUTCOMES, USAGE_TYPES } from "@/lib/inspection/labels";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, int, isUuid, many, ok, str } from "./helpers";

const DOC = /^[0-9a-f-]+\/[0-9a-f-]+\.(pdf|jpg|png|webp)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function requestInspection(_p: FormState, fd: FormData): Promise<FormState> {
  const slug = str(fd, "slug", 160) ?? "";
  await requireUser(`/revisione-auto/${slug}`);
  const center = str(fd, "center_profile_id", 40), vehicle = str(fd, "vehicle_desc", 120), slot = str(fd, "starts_at", 40), pref = str(fd, "preferred_date", 10);
  const e: Record<string, string> = {};
  if (!center || !isUuid(center)) return fail("Centro non valido.");
  if (!vehicle || vehicle.length < 3) e.vehicle_desc = "Indica marca e modello.";
  if (!slot && (!pref || !DATE.test(pref))) e.preferred_date = "Scegli un orario disponibile o una data preferita.";
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const uv = str(fd, "user_vehicle_id", 40), cat = str(fd, "vehicle_category", 30);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_inspection", {
    center_profile_id: center, vehicle_desc: vehicle!, starts_at: slot && !Number.isNaN(Date.parse(slot)) ? slot : undefined,
    preferred_date: slot ? undefined : pref!, preferred_time: str(fd, "preferred_time", 80) ?? undefined,
    user_vehicle_id: uv && isUuid(uv) ? uv : undefined, plate: str(fd, "plate", 12) ?? undefined,
    vehicle_category: cat && cat in INSPECTION_CATEGORIES ? cat : "autovettura", message: str(fd, "message", 1000) ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/revisioni/${data}?creata=1`);
}

const ACTIONS = ["conferma", "proponi", "rifiuta", "mancata_presentazione", "completa", "accetta_modifica", "rifiuta_modifica", "modifica", "annulla"];
export async function respondInspection(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/revisioni");
  const id = str(fd, "id", 40), action = str(fd, "action", 30);
  if (!id || !isUuid(id) || !action || !ACTIONS.includes(action)) return fail("Operazione non valida.");
  let when: string | undefined;
  if (action === "proponi") { const iso = romeLocalToIso(str(fd, "new_starts_at", 20)); if (!iso) return fail("Indica data e ora."); when = iso; }
  if (action === "modifica") { const s = str(fd, "new_slot", 40); if (!s) return fail("Scegli un nuovo orario."); when = s; }
  const outcome = str(fd, "outcome", 20);
  if (action === "completa" && (!outcome || !(outcome in OUTCOMES))) return fail("Indica l'esito della revisione.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_inspection", { appointment_id: id, action, new_starts_at: when, note: str(fd, "note", 500) ?? undefined,
    outcome: outcome ?? undefined, mileage_km: int(fd, "mileage_km", 0, 2000000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/revisioni/${id}`);
  return ok("Appuntamento aggiornato. L'altra parte riceve una notifica.");
}

export async function saveInspectionCenter(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/revisioni/centro");
  const profile = str(fd, "profile_id", 40);
  const cats = many(fd, "vehicle_categories", Object.keys(INSPECTION_CATEGORIES)), services = many(fd, "services", Object.keys(INSPECTION_SERVICES));
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (!cats.length) return fail("Scegli almeno una categoria di veicoli.");
  const row = { vehicle_categories: cats, services: services.length ? services : ["revisione"], hours_text: str(fd, "hours_text", 300), price_notes: str(fd, "price_notes", 500) };
  const supabase = await createClient();
  const { data: ex } = await supabase.from("inspection_centers").select("profile_id").eq("profile_id", profile).maybeSingle();
  const { error } = ex ? await supabase.from("inspection_centers").update(row).eq("profile_id", profile) : await supabase.from("inspection_centers").insert({ profile_id: profile, ...row });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/revisioni/centro");
  return ok(ex ? "Dati aggiornati." : "Centro registrato: carica l'autorizzazione per la verifica.");
}

export async function addAuthorization(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/revisioni/centro");
  const profile = str(fd, "profile_id", 40), authority = str(fd, "authority", 160), number = str(fd, "authorization_number", 60), doc = str(fd, "document_path", 200);
  const cats = many(fd, "categories", Object.keys(INSPECTION_CATEGORIES));
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (!authority || !number) return fail("Indica ente e numero della concessione.");
  if (!doc || !DOC.test(doc) || !doc.startsWith(`${user.id}/`)) return fail("Carica il documento dell'autorizzazione.");
  if (!cats.length) return fail("Indica le categorie autorizzate.");
  const vu = str(fd, "valid_until", 10), io = str(fd, "issued_on", 10);
  const supabase = await createClient();
  const { error } = await supabase.from("inspection_authorizations").insert({ profile_id: profile, authority, authorization_number: number, categories: cats,
    document_path: doc, valid_until: vu && DATE.test(vu) ? vu : null, issued_on: io && DATE.test(io) ? io : null });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/revisioni/centro");
  return ok("Autorizzazione inviata: lo staff la verificherà. Fino ad allora il centro non risulta autorizzato.");
}

export async function saveVehicleInspectionProfile(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/revisioni/garage");
  const id = str(fd, "id", 40), cat = str(fd, "inspection_category", 30), use = str(fd, "usage_type", 30), reg = str(fd, "registration_date", 10);
  if (!id || !isUuid(id) || !cat || !(cat in INSPECTION_CATEGORIES) || !use || !(use in USAGE_TYPES)) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.from("user_vehicles").update({ inspection_category: cat, usage_type: use, ...(reg && DATE.test(reg) ? { registration_date: reg } : {}) }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/revisioni/garage");
  return ok("Dati del veicolo aggiornati: la scadenza è stata ricalcolata.");
}

export async function addInspectionRecord(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/revisioni/garage");
  const id = str(fd, "user_vehicle_id", 40), date = str(fd, "inspected_on", 10), outcome = str(fd, "outcome", 20), doc = str(fd, "document_path", 200);
  if (!id || !isUuid(id)) return fail("Auto non valida.");
  if (!date || !DATE.test(date)) return fail("Data non valida.", { inspected_on: "Obbligatoria." });
  if (!outcome || !(outcome in OUTCOMES)) return fail("Indica l'esito.");
  const supabase = await createClient();
  const { error } = await supabase.from("inspection_records").insert({ user_vehicle_id: id, inspected_on: date, outcome, mileage_km: int(fd, "mileage_km", 0, 2000000),
    center_name: str(fd, "center_name", 160), notes: str(fd, "notes", 1000), document_path: doc && DOC.test(doc) && doc.startsWith(`${user.id}/`) ? doc : null });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/revisioni/garage");
  return ok("Revisione registrata nello storico e promemoria aggiornato.");
}

export async function deleteInspectionRecord(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/revisioni/garage");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Voce non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("inspection_records").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/revisioni/garage");
  return ok("Voce eliminata (lo storico manutenzione resta modificabile dalla sezione Manutenzione).");
}

export async function adminReviewAuthorization(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("services.manage", "/admin/servizi");
  const id = str(fd, "id", 40), decision = str(fd, "decision", 20), note = str(fd, "note", 500);
  if (!id || !isUuid(id) || (decision !== "verificata" && decision !== "respinta")) return fail("Dati non validi.");
  if (!note) return fail("Descrivi la verifica (fonte e data) o il motivo.", { note: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_inspection_authorization", { authorization_id: id, decision, note });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/servizi");
  return ok("Decisione registrata.");
}
