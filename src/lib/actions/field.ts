"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, ok, str } from "./helpers";

import { BUSINESS_TYPES, CRM_STATUS_KEYS, INTERACTION_KINDS, INTEREST_LEVELS } from "@/lib/crm";

const TYPES = Object.keys(BUSINESS_TYPES);
const STATUSES: string[] = CRM_STATUS_KEYS;
const P = "/admin/field-manager";
/** Il CRM è condiviso: basta uno dei due permessi. Torna alla pagina da cui arriva il modulo. */
async function crmUser(fd: FormData) {
  const back = str(fd, "return_to", 40) === "/admin/acquisizione" ? "/admin/acquisizione" : P;
  const user = await requireAdmin(back);
  if (!user.permissions.includes("field.manage") && !user.permissions.includes("acquisition.manage")) throw new Error("Non autorizzato");
  return { user, back };
}
const date = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

export async function saveFieldContact(_p: FormState, fd: FormData): Promise<FormState> {
  const { user, back } = await crmUser(fd);
  const name = str(fd, "business_name", 160);
  const type = str(fd, "business_type", 30);
  const status = str(fd, "status", 30) ?? "nuovo";
  if (!name || name.length < 2) return fail("Indica il nome dell'attività.", { business_name: "Obbligatorio." });
  if (!type || !TYPES.includes(type) || !STATUSES.includes(status)) return fail("Dati non validi.");
  const supabase = await createClient();
  const slug = str(fd, "profile_slug", 140);
  let profileId: string | null = null;
  if (slug) {
    const { data } = await supabase.from("professional_profiles").select("id").eq("slug", slug.replace(/^.*\//, "")).maybeSingle();
    profileId = data?.id ?? null;
  }
  const row = {
    business_name: name, business_type: type, status, contact_name: str(fd, "contact_name", 120), phone: str(fd, "phone", 30),
    email: str(fd, "email", 254), address: str(fd, "address", 200), city: str(fd, "city", 80), notes: str(fd, "notes", 4000),
    next_followup_on: date(str(fd, "next_followup_on", 10)), professional_profile_id: profileId,
    postal_code: str(fd, "postal_code", 5), province: str(fd, "province", 40), website: str(fd, "website", 300),
    category_slug: str(fd, "category_slug", 60), first_contact_on: date(str(fd, "first_contact_on", 10)),
    lost_reason: status === "non_interessato" ? str(fd, "lost_reason", 500) : null,
    ...(fd.has("source") ? { source: str(fd, "source", 20) ?? "manuale" } : {}),
  };
  const id = str(fd, "id", 40);
  if (id && isUuid(id)) {
    const { error } = await supabase.from("field_contacts").update(row).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
    revalidatePath(back);
    return ok("Contatto aggiornato.");
  }
  const { data, error } = await supabase.from("field_contacts").insert({ ...row, created_by: user.id }).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  redirect(`${back}?contatto=${data.id}`);
}

export async function addFieldVisit(_p: FormState, fd: FormData): Promise<FormState> {
  const { user, back } = await crmUser(fd);
  const contact = str(fd, "contact_id", 40);
  const kind = str(fd, "kind", 20) ?? "visita";
  if (!contact || !isUuid(contact)) return fail("Contatto non valido.");
  if (!(kind in INTERACTION_KINDS)) return fail("Tipo di attività non valido.");
  const interest = str(fd, "interest_level", 10);
  const cars = int(fd, "cars_available", 0, 10000);
  const neo = int(fd, "neo_cars_available", 0, 10000);
  if (cars !== null && neo !== null && neo > cars) return fail("Le auto per neopatentati non possono superare quelle disponibili.", { neo_cars_available: "Valore troppo alto." });
  const supabase = await createClient();
  const { error } = await supabase.from("field_visits").insert({ contact_id: contact, kind, visited_on: date(str(fd, "visited_on", 10)) ?? new Date().toISOString().slice(0, 10), notes: str(fd, "notes", 4000), outcome: str(fd, "outcome", 500), created_by: user.id,
    met_contact_name: str(fd, "met_contact_name", 120), cars_available: cars, neo_cars_available: neo,
    interest_level: interest && interest in INTEREST_LEVELS ? interest : null, next_action: str(fd, "next_action", 300),
    next_action_on: date(str(fd, "next_followup_on", 10)) });
  if (error) return fail(dbErrorMessage(error));
  const next = date(str(fd, "next_followup_on", 10));
  const status = str(fd, "status", 30);
  if (next || (status && STATUSES.includes(status))) await supabase.from("field_contacts").update({ ...(next ? { next_followup_on: next } : {}), ...(status && STATUSES.includes(status) ? { status } : {}) }).eq("id", contact);
  revalidatePath(back);
  return ok("Attività registrata.");
}

/** Autorizzazione documentata del venditore: senza, l'annuncio raccolto non può essere pubblicato. */
export async function saveSellerAuthorization(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("field.manage", P);
  const listing = str(fd, "listing_id", 40); const contact = str(fd, "contact_id", 40);
  const by = str(fd, "authorized_by_name", 160); const method = str(fd, "method", 30); const scope = str(fd, "scope", 1000);
  if (!listing || !isUuid(listing)) return fail("Annuncio non valido.");
  const errors: Record<string, string> = {};
  if (!by) errors.authorized_by_name = "Chi ha autorizzato?";
  if (!method || !["modulo_firmato", "email", "messaggio_scritto", "altro_documentato"].includes(method)) errors.method = "Indica come è stata data l'autorizzazione.";
  if (!scope || scope.length < 3) errors.scope = "Descrivi cosa è stato autorizzato.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const doc = str(fd, "document_path", 400);
  const supabase = await createClient();
  const { error } = await supabase.from("seller_authorizations").insert({
    listing_id: listing, contact_id: contact && isUuid(contact) ? contact : null, authorized_by_name: by!, authorized_on: date(str(fd, "authorized_on", 10)) ?? new Date().toISOString().slice(0, 10),
    method: method!, scope: scope!, listing_authorized: str(fd, "listing_authorized", 5) === "on", photos_authorized: str(fd, "photos_authorized", 5) === "on",
    price_confirmed: str(fd, "price_confirmed", 5) === "on", availability_confirmed: str(fd, "availability_confirmed", 5) === "on",
    document_path: doc && !doc.includes("..") ? doc : null, created_by: user.id,
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Autorizzazione registrata.");
}

const RESULTS: Enums<"inspection_result">[] = ["controllato", "da_monitorare", "riparazione_consigliata", "non_controllato", "non_applicabile"];
import { INSPECTION_ITEMS } from "@/lib/field-items";

/** Ispezione documentata: un'auto è "controllata da AutoGarage24" solo con un'ispezione pubblicata. */
export async function saveInspection(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("field.manage", P);
  const listing = str(fd, "listing_id", 40); const inspector = str(fd, "inspector_name", 160); const on = date(str(fd, "inspected_on", 10));
  if (!listing || !isUuid(listing)) return fail("Annuncio non valido.");
  if (!inspector || !on) return fail("Indica chi ha eseguito l'ispezione e la data.", { inspector_name: "Obbligatorio." });
  const supabase = await createClient();
  const { data: ins, error } = await supabase.from("vehicle_inspections").insert({
    listing_id: listing, inspector_name: inspector, inspected_on: on, mileage_km: int(fd, "mileage_km", 0, 2_000_000),
    mileage_source: str(fd, "mileage_source", 20) === "dichiarato" ? "dichiarato" : "rilevato", observations: str(fd, "observations", 4000),
    recommendations: str(fd, "recommendations", 4000), recommended_repairs: str(fd, "recommended_repairs", 4000), created_by: user.id,
  }).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  const items = INSPECTION_ITEMS.map((item, position) => {
    const r = str(fd, `r_${position}`, 30) as Enums<"inspection_result"> | null;
    return { inspection_id: ins.id, item, position, result: r && RESULTS.includes(r) ? r : "non_controllato" as const, note: str(fd, `n_${position}`, 300) };
  });
  const { error: ie } = await supabase.from("inspection_items").insert(items);
  if (ie) return fail(dbErrorMessage(ie));
  revalidatePath(P);
  return ok("Ispezione salvata in bozza: pubblicala quando i dati sono verificati.");
}

export async function publishInspection(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("field.manage", P);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Ispezione non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_publish_inspection", { inspection_id: id });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Ispezione pubblicata sulla scheda dell'annuncio.");
}
