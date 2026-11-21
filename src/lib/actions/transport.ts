"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { REGIONS } from "@/lib/geo/regions";
import { TRANSPORT_SERVICES } from "@/lib/services/labels";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, many, num, ok, str } from "./helpers";

const PHOTO = /^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES = ["city_car", "auto", "suv", "furgone", "moto", "epoca"];

export async function createTransportRequest(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/trasporto-auto/richiesta");
  const e: Record<string, string> = {};
  const get = (k: string, max: number) => str(fd, k, max);
  const vehicle = get("vehicle_desc", 120), service = get("service", 20);
  const pc = get("pickup_city", 80), pr = get("pickup_region", 40), dc = get("delivery_city", 80), dr = get("delivery_region", 40);
  const from = get("date_from", 10), to = get("date_to", 10) || from;
  const pa = get("pickup_address", 300), da = get("delivery_address", 300), cn = get("contact_name", 120), cp = get("contact_phone", 30);
  if (!vehicle || vehicle.length < 3) e.vehicle_desc = "Indica marca e modello.";
  if (!service || !(service in TRANSPORT_SERVICES)) e.service = "Scegli il tipo di trasporto.";
  if (!pc) e.pickup_city = "Città di ritiro obbligatoria.";
  if (!pr || !(REGIONS as readonly string[]).includes(pr)) e.pickup_region = "Scegli la regione.";
  if (!dc) e.delivery_city = "Città di consegna obbligatoria.";
  if (!dr || !(REGIONS as readonly string[]).includes(dr)) e.delivery_region = "Scegli la regione.";
  if (!from || !DATE.test(from)) e.date_from = "Data non valida.";
  if (!to || !DATE.test(to) || (from && to < from)) e.date_to = "La data finale deve seguire quella iniziale.";
  if (!pa || pa.length < 5) e.pickup_address = "Indirizzo di ritiro obbligatorio.";
  if (!da || da.length < 5) e.delivery_address = "Indirizzo di consegna obbligatorio.";
  if (!cn || cn.length < 2) e.contact_name = "Nome del referente obbligatorio.";
  if (!cp || !/^[0-9 +().-]{6,30}$/.test(cp)) e.contact_phone = "Telefono non valido.";
  for (const k of ["pickup_postal_code", "delivery_postal_code"]) { const v = get(k, 5); if (v && !/^\d{5}$/.test(v)) e[k] = "CAP non valido."; }
  if (!bool(fd, "consent")) e.consent = "Serve il consenso per condividere i dati con il trasportatore scelto.";
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const listing = get("listing_id", 40), uv = get("user_vehicle_id", 40);
  const cat = get("vehicle_category", 20) ?? "auto";
  const supabase = await createClient();
  const { data, error } = await supabase.from("transport_requests").insert({
    vehicle_desc: vehicle!, vehicle_drivable: bool(fd, "vehicle_drivable"), service: service!,
    pickup_city: pc!, pickup_postal_code: get("pickup_postal_code", 5), pickup_region: pr!,
    delivery_city: dc!, delivery_postal_code: get("delivery_postal_code", 5), delivery_region: dr!,
    date_from: from!, date_to: to!, urgency: get("urgency", 20) === "urgente" ? "urgente" : "programmato",
    vehicle_category: CATEGORIES.includes(cat) ? cat : "auto", vehicle_condition: get("vehicle_condition", 500), notes: get("notes", 2000),
    listing_id: listing && isUuid(listing) ? listing : null, user_vehicle_id: uv && isUuid(uv) ? uv : null,
    photo_paths: fd.getAll("photo_paths").map(String).filter((p) => PHOTO.test(p) && p.startsWith(`${user.id}/`)).slice(0, 6),
  }).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  const { error: e2 } = await supabase.from("transport_request_addresses").insert({ request_id: data.id, pickup_address: pa!, delivery_address: da!, contact_name: cn!, contact_phone: cp! });
  if (e2) return fail(dbErrorMessage(e2));
  redirect(`/dashboard/trasporti/${data.id}?creata=1`);
}

export async function sendTransportQuote(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/trasporti");
  const id = str(fd, "id", 40), amount = num(fd, "amount", 10, 1000000), pd = str(fd, "pickup_date", 10), dd = str(fd, "delivery_date", 10);
  const e: Record<string, string> = {};
  if (amount === null) e.amount = "Indica il prezzo totale (minimo € 10).";
  if (!pd || !DATE.test(pd)) e.pickup_date = "Data di ritiro non valida.";
  if (!dd || !DATE.test(dd) || (pd && dd < pd)) e.delivery_date = "La consegna deve seguire il ritiro.";
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const notes = [str(fd, "transport_type", 100) && `Tipo di trasporto: ${str(fd, "transport_type", 100)}`, str(fd, "extras", 400) && `Costi aggiuntivi: ${str(fd, "extras", 400)}`,
    str(fd, "conditions", 1000) && `Condizioni: ${str(fd, "conditions", 1000)}`].filter(Boolean).join("\n");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_transport_quote", { request_id: id, amount_cents: Math.round(amount! * 100), pickup_date: pd!, delivery_date: dd!,
    includes_insurance: bool(fd, "includes_insurance"), notes: notes || undefined, valid_days: int(fd, "valid_days", 1, 30) ?? 7 });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/trasporti/${id}`);
  return ok("Preventivo inviato.");
}

export async function acceptTransportQuote(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/trasporti");
  const q = str(fd, "quote_id", 40), id = str(fd, "id", 40);
  if (!q || !isUuid(q)) return fail("Preventivo non valido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_transport_quote", { quote_id: q });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/trasporti/${id}`);
  return ok("Preventivo accettato: il trasportatore riceve indirizzi e contatti.");
}

const NEXT = ["ritiro_programmato", "in_transito", "completata", "annullata", "contestata"];
export async function updateTransportStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/trasporti");
  const id = str(fd, "id", 40), st = str(fd, "status", 30);
  if (!id || !isUuid(id) || !st || !NEXT.includes(st)) return fail("Operazione non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_transport_status", { request_id: id, new_status: st, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/trasporti/${id}`);
  return ok("Stato aggiornato.");
}

export async function addTransportReport(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/trasporti");
  const id = str(fd, "id", 40), kind = str(fd, "kind", 10);
  if (!id || !isUuid(id) || (kind !== "ritiro" && kind !== "consegna")) return fail("Dati non validi.");
  const photos = fd.getAll("photo_paths").map(String).filter((p) => PHOTO.test(p) && p.startsWith(`${user.id}/`)).slice(0, 12);
  if (!photos.length) return fail("Aggiungi almeno una fotografia del veicolo.");
  if (!bool(fd, "confirmed")) return fail("Conferma che il verbale è stato condiviso con la persona presente.", { confirmed: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_transport_report", { request_id: id, kind, odometer_km: int(fd, "odometer_km", 0, 2000000) ?? undefined,
    fuel_level: str(fd, "fuel_level", 10) ?? undefined, damages: str(fd, "damages", 2000) ?? undefined, notes: str(fd, "notes", 2000) ?? undefined,
    photo_paths: photos, counterpart_name: str(fd, "counterpart_name", 120) ?? undefined, accessories: str(fd, "accessories", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/trasporti/${id}`);
  return ok(`Verbale di ${kind} registrato con data e ora.`);
}

export async function saveTransportOperator(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/trasporti/operatore");
  const profile = str(fd, "profile_id", 40);
  const services = many(fd, "services", ["carro_attrezzi", "bisarca", "pianale_chiuso", "con_autista"]);
  const regions = many(fd, "regions", REGIONS);
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (!services.length) return fail("Scegli almeno un servizio.");
  if (!regions.length) return fail("Scegli almeno una regione servita.");
  const insured = bool(fd, "insurance_declared"), notes = str(fd, "insurance_notes", 1000);
  if (insured && (!notes || notes.length < 10)) return fail("Descrivi la copertura (compagnia, massimale): lo staff la verificherà.", { insurance_notes: "Obbligatorio." });
  const row = { services, regions, max_distance_km: int(fd, "max_distance_km", 10, 3000), insurance_declared: insured, insurance_notes: notes, price_notes: str(fd, "price_notes", 1000) };
  const supabase = await createClient();
  const { data: ex } = await supabase.from("transport_operators").select("profile_id").eq("profile_id", profile).maybeSingle();
  const { error } = ex ? await supabase.from("transport_operators").update(row).eq("profile_id", profile) : await supabase.from("transport_operators").insert({ profile_id: profile, ...row });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/trasporti/operatore");
  return ok(ex ? "Dati aggiornati." : "Servizio registrato: lo staff verificherà documenti e copertura prima dell'attivazione.");
}
