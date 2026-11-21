"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { findBrand } from "@/config/brands";
import { BODY_LABELS, CONDITION_LABELS, FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, num, ok, str } from "./helpers";

function oneOf<T extends string>(v: string | null, map: Record<T, string>): T | null {
  return v && v in map ? (v as T) : null;
}

/** Dati del veicolo e dell'annuncio letti dal modulo, con validazione lato server. */
function readListing(fd: FormData) {
  const errors: Record<string, string> = {};
  const brand = findBrand(str(fd, "make_slug", 40));
  const otherMake = str(fd, "make_other", 40);
  const makeName = brand?.name ?? otherMake;
  const makeSlug = brand?.slug ?? (otherMake ? otherMake.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) : null);
  const model = str(fd, "model", 80);
  const year = int(fd, "year", 1950, new Date().getFullYear() + 1);
  const priceEuro = str(fd, "price", 20);
  const price = priceEuro ? Math.round(Number(priceEuro.replace(/\./g, "").replace(",", ".")) * 100) : null;
  if (!makeName || !makeSlug) errors.make_slug = "Seleziona la marca.";
  if (!model) errors.model = "Indica il modello.";
  if (str(fd, "year", 6) && year === null) errors.year = "Anno non valido.";
  if (priceEuro && (price === null || !Number.isFinite(price) || price < 0 || price > 1_000_000_000)) errors.price = "Prezzo non valido.";
  const firstReg = str(fd, "first_registration_date", 10);
  if (firstReg && !/^\d{4}-\d{2}-\d{2}$/.test(firstReg)) errors.first_registration_date = "Data non valida.";
  const cap = str(fd, "postal_code", 5);
  if (cap && !/^\d{5}$/.test(cap)) errors.postal_code = "CAP non valido (5 cifre).";

  const vehicle: Omit<TablesInsert<"vehicles">, "owner_id"> = {
    make_slug: makeSlug ?? "",
    make_name: makeName ?? "",
    model: model ?? "",
    version: str(fd, "version", 120),
    variant_code: str(fd, "variant_code", 60),
    year,
    first_registration_date: firstReg,
    mileage_km: int(fd, "mileage_km", 0, 2_000_000),
    fuel: oneOf<Enums<"fuel_type">>(str(fd, "fuel", 30), FUEL_LABELS),
    transmission: oneOf<Enums<"transmission_type">>(str(fd, "transmission", 30), TRANSMISSION_LABELS),
    body_type: oneOf<Enums<"body_type">>(str(fd, "body_type", 30), BODY_LABELS),
    condition: oneOf<Enums<"vehicle_condition">>(str(fd, "condition", 30), CONDITION_LABELS) ?? "usato",
    engine_cc: int(fd, "engine_cc", 50, 10000),
    power_kw: num(fd, "power_kw", 1, 1500),
    tare_kg: int(fd, "tare_kg", 300, 10000),
    power_to_tare_documented: num(fd, "power_to_tare_documented", 1, 1000),
    doors: int(fd, "doors", 1, 7),
    seats: int(fd, "seats", 1, 9),
    color: str(fd, "color", 40),
    consumption_l100: num(fd, "consumption_l100", 0, 50),
    consumption_kwh100: num(fd, "consumption_kwh100", 0, 100),
    co2_g_km: int(fd, "co2_g_km", 0, 1000),
    emission_class: str(fd, "emission_class", 20),
    owners_count: int(fd, "owners_count", 0, 20),
    equipment: (str(fd, "equipment", 3000) ?? "").split(/[\n,]/).map((s) => s.trim()).filter(Boolean).slice(0, 60).map((s) => s.slice(0, 80)),
  };
  const title = str(fd, "title", 140) ?? [makeName, model, str(fd, "version", 60)].filter(Boolean).join(" ");
  const listing = {
    title: title.slice(0, 140),
    price_cents: price,
    negotiable: str(fd, "negotiable", 5) === "on",
    description: str(fd, "description", 6000),
    condition_notes: str(fd, "condition_notes", 3000),
    maintenance_notes: str(fd, "maintenance_notes", 3000),
    interventions_notes: str(fd, "interventions_notes", 3000),
    known_defects: str(fd, "known_defects", 3000),
    extra_info: str(fd, "extra_info", 3000),
    city: str(fd, "city", 80),
    postal_code: cap,
    province: str(fd, "province", 2)?.toUpperCase() ?? null,
    region: str(fd, "region", 40),
  };
  return { errors, vehicle, listing };
}

/**
 * Salva la bozza (crea veicolo + annuncio la prima volta, poi aggiorna).
 * Non pubblica nulla: la pubblicazione richiede revisione e approvazione.
 */
export async function saveListingDraft(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/annunci/nuovo");
  const { errors, vehicle, listing } = readListing(fd);
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const listingId = str(fd, "listing_id", 40);

  if (listingId && isUuid(listingId)) {
    const { data: existing } = await supabase.from("vehicle_listings").select("id, vehicle_id, slug, owner_id").eq("id", listingId).maybeSingle();
    if (!existing || existing.owner_id !== user.id) return fail("Annuncio non trovato.");
    const { error: ve } = await supabase.from("vehicles").update(vehicle as TablesUpdate<"vehicles">).eq("id", existing.vehicle_id);
    if (ve) return fail(dbErrorMessage(ve));
    const { error: le } = await supabase.from("vehicle_listings").update(listing).eq("id", existing.id);
    if (le) return fail(dbErrorMessage(le));
    revalidateTag(`listing:${existing.slug}`, "max");
    revalidatePath("/dashboard/annunci");
    return { status: "success", message: "Modifiche salvate.", values: { listing_id: existing.id } };
  }

  const fieldContact = str(fd, "field_contact_id", 40);
  const fromField = Boolean(fieldContact && isUuid(fieldContact) && user.permissions.includes("field.manage"));
  const { data: v, error: ve } = await supabase.from("vehicles").insert({ ...vehicle, owner_id: user.id }).select("id").single();
  if (ve || !v) return fail(dbErrorMessage(ve));
  const { data: l, error: le } = await supabase
    .from("vehicle_listings")
    .insert({ ...listing, vehicle_id: v.id, owner_id: user.id, status: "bozza", source: fromField ? "field_manager" : "venditore", field_contact_id: fromField ? fieldContact : null, slug: "" })
    .select("id")
    .single();
  if (le || !l) {
    await supabase.from("vehicles").delete().eq("id", v.id);
    return fail(dbErrorMessage(le));
  }
  revalidatePath("/dashboard/annunci");
  return { status: "success", message: "Bozza salvata. Ora puoi aggiungere le fotografie.", values: { listing_id: l.id } };
}

/** Invio in revisione con le dichiarazioni obbligatorie del venditore. */
export async function submitListingForReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/annunci");
  const id = str(fd, "listing_id", 40);
  if (!id || !isUuid(id)) return fail("Annuncio non valido.");
  const required = ["declare_accuracy", "declare_availability", "declare_right", "declare_photos", "accept_terms"];
  const missing = required.filter((k) => str(fd, k, 5) !== "on");
  if (missing.length) return fail("Per inviare l'annuncio devi confermare tutte le dichiarazioni.", Object.fromEntries(missing.map((k) => [k, "Conferma obbligatoria."])));
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicle_listings")
    .update({
      declared_accuracy_at: now, declared_availability_at: now, declared_right_to_publish_at: now,
      declared_photo_rights_at: now, accepted_terms_at: now, status: "in_revisione",
    })
    .eq("id", id)
    .eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/annunci");
  return ok("Annuncio inviato in revisione. Riceverai una notifica quando sarà approvato: nessun annuncio diventa pubblico prima dell'approvazione.");
}

const OWNER_TRANSITIONS: Record<string, Enums<"listing_status">> = {
  pubblica: "pubblicato", sospendi: "sospeso", riattiva: "pubblicato", venduto: "venduto", rinnova: "in_revisione",
};

/** Azioni del titolare sull'annuncio (le transizioni ammesse sono verificate dal database). */
export async function ownerListingAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/annunci");
  const id = str(fd, "listing_id", 40);
  const action = str(fd, "action", 20);
  if (!id || !isUuid(id) || !action) return fail("Operazione non valida.");
  const supabase = await createClient();
  if (action === "elimina") {
    const { data: imgs } = await supabase.from("vehicle_images").select("storage_path").eq("listing_id", id);
    const { data: row } = await supabase.from("vehicle_listings").select("vehicle_id").eq("id", id).eq("owner_id", user.id).maybeSingle();
    const { error } = await supabase.from("vehicle_listings").delete().eq("id", id).eq("owner_id", user.id);
    if (error) return fail(dbErrorMessage(error));
    if (imgs?.length) await supabase.storage.from("listing-images").remove(imgs.map((i) => i.storage_path));
    if (row) await supabase.from("vehicles").delete().eq("id", row.vehicle_id);
    revalidatePath("/dashboard/annunci");
    return ok("Bozza eliminata.");
  }
  const status = OWNER_TRANSITIONS[action];
  if (!status) return fail("Operazione non valida.");
  const { data, error } = await supabase.from("vehicle_listings").update({ status }).eq("id", id).eq("owner_id", user.id).select("slug").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data) revalidateTag(`listing:${data.slug}`, "max");
  revalidateTag("listings", "max");
  revalidatePath("/dashboard/annunci");
  const msg: Record<string, string> = {
    pubblica: "Annuncio pubblicato.", sospendi: "Annuncio sospeso: non è più visibile.", riattiva: "Annuncio di nuovo visibile.",
    venduto: "Annuncio segnato come venduto.", rinnova: "Annuncio inviato di nuovo in revisione.",
  };
  return ok(msg[action]);
}

/** Aggiornamento rapido del prezzo (non richiede nuova revisione). */
export async function updateListingPrice(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/annunci");
  const id = str(fd, "listing_id", 40);
  const priceEuro = str(fd, "price", 20);
  const cents = priceEuro ? Math.round(Number(priceEuro.replace(/\./g, "").replace(",", ".")) * 100) : NaN;
  if (!id || !isUuid(id)) return fail("Annuncio non valido.");
  if (!Number.isFinite(cents) || cents < 0) return fail("Prezzo non valido.", { price: "Prezzo non valido." });
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_listings").update({ price_cents: cents }).eq("id", id).eq("owner_id", user.id).select("slug").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data) revalidateTag(`listing:${data.slug}`, "max");
  revalidatePath("/dashboard/annunci");
  return ok("Prezzo aggiornato.");
}

/** Ordine delle foto e scelta della copertina (solo sulle proprie immagini, garantito da RLS). */
export async function saveImageOrder(listingId: string, orderedIds: string[], coverId: string | null): Promise<{ ok: boolean; error?: string }> {
  await requireUser("/dashboard/annunci");
  if (!isUuid(listingId) || orderedIds.some((i) => !isUuid(i))) return { ok: false, error: "Dati non validi." };
  const supabase = await createClient();
  // Prima si toglie la copertina (indice univoco), poi si riassegnano posizioni e copertina.
  const { error: e1 } = await supabase.from("vehicle_images").update({ is_cover: false }).eq("listing_id", listingId);
  if (e1) return { ok: false, error: dbErrorMessage(e1) };
  for (const [position, id] of orderedIds.entries()) {
    const { error } = await supabase.from("vehicle_images").update({ position, is_cover: id === (coverId ?? orderedIds[0]) }).eq("id", id).eq("listing_id", listingId);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  revalidatePath(`/dashboard/annunci/${listingId}`);
  return { ok: true };
}

export async function deleteListingImage(listingId: string, imageId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/dashboard/annunci");
  if (!isUuid(listingId) || !isUuid(imageId)) return { ok: false, error: "Dati non validi." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("vehicle_images").delete().eq("id", imageId).eq("listing_id", listingId).select("storage_path").maybeSingle();
  if (error) return { ok: false, error: dbErrorMessage(error) };
  if (data?.storage_path.startsWith(`${user.id}/`)) await supabase.storage.from("listing-images").remove([data.storage_path]);
  return { ok: true };
}
