"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LOCATION_TYPES, ROADSIDE_NEXT, ROADSIDE_PROBLEMS, ROADSIDE_SERVICES, VEHICLE_TYPES } from "@/lib/services/labels";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, many, num, ok, str } from "./helpers";

const PHOTO = /^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/;

export async function createRoadsideRequest(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/soccorso-stradale/richiesta");
  const problem = ROADSIDE_PROBLEMS.find((p) => p.key === str(fd, "problem", 30));
  const errors: Record<string, string> = {};
  if (!problem) errors.problem = "Scegli il tipo di problema.";
  const vehicle = str(fd, "vehicle_desc", 120);
  if (!vehicle || vehicle.length < 3) errors.vehicle_desc = "Indica marca e modello.";
  const description = str(fd, "description", 2000);
  if (!description || description.length < 10) errors.description = "Descrivi il problema (almeno 10 caratteri).";
  const area = str(fd, "area_text", 120);
  if (!area || area.length < 2) errors.area_text = "Indica la zona (città, via o casello).";
  const phone = str(fd, "contact_phone", 30);
  if (!phone || !/^[0-9 +().-]{6,30}$/.test(phone)) errors.contact_phone = "Numero di telefono non valido.";
  const locType = str(fd, "location_type", 20);
  if (!locType || !(locType in LOCATION_TYPES)) errors.location_type = "Indica dove si trova l'auto.";
  const vType = str(fd, "vehicle_type", 20) ?? "auto";
  if (!(vType in VEHICLE_TYPES)) errors.vehicle_type = "Tipo di veicolo non valido.";
  if (!bool(fd, "people_safe")) errors.people_safe = "Conferma di essere in un luogo sicuro. Se c'è pericolo chiama il 112.";
  const consent = bool(fd, "location_consent");
  const lat = consent ? num(fd, "latitude", -90, 90) : null;
  const lng = consent ? num(fd, "longitude", -180, 180) : null;
  const vehicleId = str(fd, "user_vehicle_id", 40);
  const photos = fd.getAll("photo_paths").map(String).filter((p) => PHOTO.test(p)).slice(0, 6);
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_roadside_request", {
    p_vehicle_desc: vehicle!, p_vehicle_type: vType, p_service: problem!.service,
    p_description: `${problem!.label}. ${description}`, p_location_type: locType!, p_vehicle_drivable: bool(fd, "vehicle_drivable"),
    p_people_safe: true, p_area_text: area!, p_contact_phone: phone!,
    p_latitude: lat ?? undefined, p_longitude: lng ?? undefined, p_location_consent: consent && lat !== null,
    p_address_text: str(fd, "address_text", 300) ?? undefined, p_destination_text: str(fd, "destination_text", 200) ?? undefined,
    p_user_vehicle_id: vehicleId && isUuid(vehicleId) ? vehicleId : undefined, p_photo_paths: photos, p_plate: str(fd, "plate", 12) ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/soccorso/${data}`);
}

export async function dispatchRoadside(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id", 40);
  await requireUser(`/dashboard/soccorso/${id}`);
  const ids = fd.getAll("profile_ids").map(String).filter(isUuid).slice(0, 8);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  if (!ids.length) return fail("Seleziona almeno un operatore.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("dispatch_roadside_request", { request_id: id, profile_ids: ids });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/soccorso/${id}`);
  return ok(`Richiesta inviata a ${data} operatori. Riceverai una notifica per ogni preventivo.`);
}

export async function sendRoadsideQuote(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id", 40);
  await requireUser("/dashboard/soccorso");
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const amount = num(fd, "amount", 0, 100000), eta = int(fd, "eta_minutes", 5, 720);
  const includes = str(fd, "includes", 1000);
  const errors: Record<string, string> = {};
  if (amount === null) errors.amount = "Indica il prezzo totale.";
  if (!eta) errors.eta_minutes = "Indica il tempo di arrivo stimato (5–720 minuti).";
  if (!includes || includes.length < 5) errors.includes = "Descrivi cosa comprende il prezzo.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const extra = [str(fd, "call_fee", 100) && `Uscita: ${str(fd, "call_fee", 100)}`, str(fd, "extras", 400) && `Costi aggiuntivi: ${str(fd, "extras", 400)}`,
    str(fd, "conditions", 400) && `Condizioni: ${str(fd, "conditions", 400)}`].filter(Boolean).join("\n");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_roadside_quote", { request_id: id, amount_cents: Math.round(amount! * 100), eta_minutes: eta!, includes: includes!,
    notes: extra || undefined, valid_minutes: int(fd, "valid_minutes", 10, 1440) ?? 60 });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/soccorso/${id}`);
  return ok("Preventivo inviato al cliente.");
}

export async function declineRoadside(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id", 40);
  await requireUser("/dashboard/soccorso");
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_roadside_request", { request_id: id, reason: str(fd, "reason", 300) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/soccorso");
  return ok("Richiesta rifiutata: il cliente è stato avvisato.");
}

export async function acceptRoadsideQuote(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "quote_id", 40), req = str(fd, "id", 40);
  await requireUser("/dashboard/soccorso");
  if (!id || !isUuid(id)) return fail("Preventivo non valido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_roadside_quote", { quote_id: id });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/soccorso/${req}`);
  return ok("Preventivo accettato: l'operatore riceve indirizzo e telefono.");
}

export async function updateRoadsideStatus(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id", 40), status = str(fd, "status", 30);
  await requireUser("/dashboard/soccorso");
  const allowed = new Set(["annullata", ...Object.values(ROADSIDE_NEXT).flat()]);
  if (!id || !isUuid(id) || !status || !allowed.has(status)) return fail("Operazione non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_roadside_status", { request_id: id, new_status: status, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/soccorso/${id}`);
  return ok("Stato aggiornato.");
}

export async function saveRoadsideOperator(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/soccorso/operatore");
  const profile = str(fd, "profile_id", 40);
  const services = many(fd, "services", Object.keys(ROADSIDE_SERVICES));
  const vehicles = many(fd, "vehicle_types", Object.keys(VEHICLE_TYPES));
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (!services.length) return fail("Scegli almeno un servizio.", { services: "Obbligatorio." });
  if (!vehicles.length) return fail("Scegli almeno un tipo di veicolo.", { vehicle_types: "Obbligatorio." });
  const row = { services, vehicle_types: vehicles, h24: bool(fd, "h24"), hours_text: str(fd, "hours_text", 300), price_notes: str(fd, "price_notes", 1000) };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("roadside_operators").select("profile_id").eq("profile_id", profile).maybeSingle();
  const { error } = existing
    ? await supabase.from("roadside_operators").update(row).eq("profile_id", profile)
    : await supabase.from("roadside_operators").insert({ profile_id: profile, ...row });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/soccorso/operatore");
  return ok(existing ? "Servizio aggiornato." : "Servizio registrato: lo staff verificherà i dati prima dell'attivazione.");
}

/** Disponibilità dichiarata: scade da sola (massimo 24 ore). 0 = non disponibile. */
export async function setRoadsideAvailability(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/soccorso/operatore");
  const profile = str(fd, "profile_id", 40), hours = int(fd, "hours", 0, 24);
  if (!profile || !isUuid(profile) || hours === null) return fail("Dati non validi.");
  const supabase = await createClient();
  const until = hours === 0 ? null : new Date(Date.now() + hours * 3600_000).toISOString();
  const { error } = await supabase.from("roadside_operators").update({ available_until: until, ...(hours === 0 ? { h24: false } : {}) }).eq("profile_id", profile);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/soccorso/operatore");
  return ok(hours === 0 ? "Ricezione di nuove richieste sospesa." : `Disponibile per le prossime ${hours} ore.`);
}

export async function shareLocation(requestId: string, lat: number, lng: number, accuracy: number | null): Promise<{ ok: boolean; error?: string }> {
  await requireUser("/dashboard/soccorso");
  if (!isUuid(requestId) || !Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false, error: "Posizione non valida." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("share_operator_location", { request_id: requestId, latitude: lat, longitude: lng, accuracy_m: accuracy ? Math.round(accuracy) : undefined });
  return error ? { ok: false, error: dbErrorMessage(error) } : { ok: true };
}

export async function stopLocation(requestId: string): Promise<{ ok: boolean }> {
  await requireUser("/dashboard/soccorso");
  if (!isUuid(requestId)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("stop_operator_location", { request_id: requestId });
  return { ok: !error };
}

export async function linkRoadsideRepair(_p: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id", 40), repair = str(fd, "repair_id", 40);
  await requireUser("/dashboard/soccorso");
  if (!id || !isUuid(id) || !repair || !isUuid(repair)) return fail("Scegli la richiesta di intervento.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_roadside_repair", { request_id: id, repair_id: repair });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/soccorso/${id}`);
  return ok("Richiesta di riparazione collegata allo storico dell'intervento.");
}

export async function adminSetOperator(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("services.manage", "/admin/servizi");
  const kind = str(fd, "kind", 20), profile = str(fd, "profile_id", 40), status = str(fd, "status", 20);
  if (!kind || !["soccorso", "trasporto", "revisione"].includes(kind) || !profile || !isUuid(profile) || !status) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_service_operator", { kind, profile_id: profile, new_status: status, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/servizi");
  return ok("Operatore aggiornato e avvisato.");
}

export async function adminCancelService(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("services.manage", "/admin/servizi");
  const kind = str(fd, "kind", 20), id = str(fd, "id", 40), reason = str(fd, "reason", 500);
  if (!id || !isUuid(id) || !reason) return fail("Indica il motivo.", { reason: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = kind === "trasporto"
    ? await supabase.rpc("admin_cancel_transport", { request_id: id, reason })
    : await supabase.rpc("admin_cancel_roadside", { request_id: id, reason });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/servizi");
  return ok("Richiesta annullata e parti avvisate.");
}
