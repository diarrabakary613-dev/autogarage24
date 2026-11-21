"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PROVINCES } from "@/lib/insurance/labels";
import { REGIONS } from "@/lib/geo/regions";
import { ACCIDENTS, CONDITIONS, INSPECTION_STATES, OPTIONS } from "@/lib/valuation/labels";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, many, num, ok, oneOf, str } from "./helpers";

const FUELS = ["benzina", "diesel", "gpl", "metano", "ibrida", "ibrida_plugin", "elettrica", "altra"] as const;
const TRANS = ["manuale", "automatico", "altro"] as const;
const PHOTO = /^[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/;

function readVehicle(fd: FormData, userId: string) {
  const e: Record<string, string> = {};
  const make = str(fd, "make", 60), model = str(fd, "model", 80), year = int(fd, "year", 1950, 2100), km = int(fd, "mileage_km", 0, 2000000);
  const condition = str(fd, "condition", 20), prov = str(fd, "province", 2)?.toUpperCase(), region = str(fd, "region", 40);
  if (!make) e.make = "Obbligatoria."; if (!model) e.model = "Obbligatorio."; if (!year) e.year = "Anno non valido."; if (km === null) e.mileage_km = "Indica i chilometri.";
  if (!condition || !(condition in CONDITIONS)) e.condition = "Scegli le condizioni.";
  if (!prov || !PROVINCES.includes(prov)) e.province = "Scegli la provincia.";
  if (!region || !(REGIONS as readonly string[]).includes(region)) e.region = "Scegli la regione.";
  const uv = str(fd, "user_vehicle_id", 40);
  const row = {
    user_vehicle_id: uv && isUuid(uv) ? uv : null, make: make!, model: model!, version: str(fd, "version", 120), year: year!, mileage_km: km!,
    fuel: oneOf(fd, "fuel", FUELS), transmission: oneOf(fd, "transmission", TRANS), power_kw: int(fd, "power_kw", 1, 1500), engine_cc: int(fd, "engine_cc", 50, 10000),
    condition: condition!, owners_count: int(fd, "owners_count", 1, 20), accidents: (str(fd, "accidents", 20) && str(fd, "accidents", 20)! in ACCIDENTS ? str(fd, "accidents", 20)! : "non_so"),
    damage_notes: str(fd, "damage_notes", 1000), inspection_status: (str(fd, "inspection_status", 20) && str(fd, "inspection_status", 20)! in INSPECTION_STATES ? str(fd, "inspection_status", 20)! : "non_so"),
    options: many(fd, "options", OPTIONS), region: region!, province: prov!,
    photo_paths: fd.getAll("photo_paths").map(String).filter((p) => PHOTO.test(p) && p.startsWith(`${userId}/`)).slice(0, 12),
  };
  return { e, row };
}

export async function createValuation(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/valuta-la-tua-auto");
  const { e, row } = readVehicle(fd, user.id);
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_valuations").insert(row).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  const { error: e2 } = await supabase.rpc("estimate_valuation", { valuation_id: data.id });
  if (e2) return fail(dbErrorMessage(e2));
  const trade = str(fd, "permuta", 40);
  redirect(`/dashboard/valutazioni/${data.id}${trade && isUuid(trade) ? `?permuta=${trade}` : ""}`);
}

export async function updateValuation(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/valutazioni");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Valutazione non valida.");
  const { e, row } = readVehicle(fd, user.id);
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_valuations").update(row).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  const { error: e2 } = await supabase.rpc("estimate_valuation", { valuation_id: id });
  if (e2) return fail(dbErrorMessage(e2));
  revalidatePath(`/dashboard/valutazioni/${id}`);
  return ok("Dati aggiornati e stima ricalcolata.");
}

export async function deleteValuation(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/valutazioni");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Valutazione non valida.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_valuations").delete().eq("id", id).select("id");
  if (error) return fail(dbErrorMessage(error));
  if (!data?.length) return fail("Non puoi eliminare una valutazione collegata a una permuta in corso.");
  redirect("/dashboard/valutazioni");
}

export async function requestProfessional(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/valutazioni");
  const id = str(fd, "id", 40), pros = fd.getAll("profile_ids").map(String).filter(isUuid);
  if (!id || !isUuid(id)) return fail("Valutazione non valida.");
  if (!pros.length) return fail("Scegli almeno un professionista.");
  if (!bool(fd, "consent")) return fail("Serve il consenso alla condivisione dei dati.", { consent: "Obbligatorio." });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_professional_valuation", { valuation_id: id, profile_ids: pros.slice(0, 5), shared_photos: fd.getAll("shared_photos").map(String),
    share_estimate: bool(fd, "share_estimate"), intent: str(fd, "intent", 20) === "valutazione" ? "valutazione" : "vendita", message: str(fd, "message", 1000) ?? undefined, consent: true });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/valutazioni/richiesta/${data}`);
}

export async function professionalAction(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/valutazioni/professionista");
  const id = str(fd, "id", 40), action = str(fd, "action", 20);
  if (!id || !isUuid(id) || !action || !["info", "rifiuta", "proposta"].includes(action)) return fail("Operazione non valida.");
  const amount = num(fd, "amount", 100, 10000000);
  if (action === "proposta" && amount === null) return fail("Indica l'importo.", { amount: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("professional_valuation_action", { request_id: id, action, amount_cents: amount !== null ? Math.round(amount * 100) : undefined,
    kind: str(fd, "kind", 20) === "valutazione" ? "valutazione" : "offerta_acquisto", conditions: str(fd, "conditions", 1000) ?? undefined,
    requires_inspection: bool(fd, "requires_inspection"), valid_days: int(fd, "valid_days", 1, 30) ?? 7, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/valutazioni/professionista/${id}`);
  return ok(action === "proposta" ? "Proposta inviata al cliente." : action === "info" ? "Richiesta inviata nella conversazione." : "Richiesta rifiutata.");
}

export async function respondOffer(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/valutazioni");
  const id = str(fd, "offer_id", 40), action = str(fd, "action", 20), back = str(fd, "back", 200) ?? "/dashboard/valutazioni";
  if (!id || !isUuid(id) || !action || !["accetta", "rifiuta", "controproposta"].includes(action)) return fail("Operazione non valida.");
  const counter = num(fd, "counter", 100, 10000000);
  if (action === "controproposta" && counter === null) return fail("Indica l'importo della controproposta.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_valuation_offer", { offer_id: id, action, counter_cents: counter !== null ? Math.round(counter * 100) : undefined, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  if (back.startsWith("/dashboard/")) revalidatePath(back);
  return ok(action === "accetta" ? "Proposta accettata: accordo preliminare da perfezionare con ispezione e documenti." : action === "rifiuta" ? "Proposta rifiutata." : "Controproposta inviata.");
}

export async function withdrawRequest(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/valutazioni");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_valuation_request", { request_id: id });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/valutazioni/richiesta/${id}`);
  return ok("Richiesta ritirata.");
}

export async function proposeTradeIn(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/valutazioni");
  const listing = str(fd, "listing_id", 40), val = str(fd, "valuation_id", 40), value = num(fd, "value", 100, 10000000);
  if (!listing || !isUuid(listing) || !val || !isUuid(val)) return fail("Dati non validi.");
  if (value === null) return fail("Indica il valore che proponi per la tua auto.", { value: "Obbligatorio." });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("propose_trade_in", { listing_id: listing, valuation_id: val, proposed_value_cents: Math.round(value * 100), message: str(fd, "message", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/permute/${data}`);
}

export async function respondTradeIn(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/permute");
  const id = str(fd, "id", 40), action = str(fd, "action", 20);
  if (!id || !isUuid(id) || !action || !["valuta", "ispezione", "controproposta", "accetta", "rifiuta", "ritira"].includes(action)) return fail("Operazione non valida.");
  const counter = num(fd, "counter", 100, 10000000);
  if (action === "controproposta" && counter === null) return fail("Indica il valore della controproposta.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_trade_in", { proposal_id: id, action, counter_cents: counter !== null ? Math.round(counter * 100) : undefined, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/permute/${id}`);
  return ok("Trattativa aggiornata.");
}

