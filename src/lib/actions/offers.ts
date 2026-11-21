"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NEO_TOPICS, OFFER_CATEGORIES } from "@/lib/offers/labels";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, ok, str } from "./helpers";

const P = "/dashboard/offerte";
const date = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const euro = (fd: FormData, k: string) => { const v = str(fd, k, 20); if (!v) return null; const n = Math.round(Number(v.replace(/\./g, "").replace(",", ".")) * 100); return Number.isFinite(n) && n > 0 ? n : null; };

export async function saveOffer(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(P);
  const profile = str(fd, "profile_id", 40);
  const errors: Record<string, string> = {};
  const title = str(fd, "title", 120);
  const description = str(fd, "description", 3000);
  const conditions = str(fd, "conditions", 2000);
  const category = str(fd, "category", 20);
  const original = euro(fd, "original_price");
  const promo = euro(fd, "promo_price");
  const starts = date(str(fd, "starts_on", 10));
  const ends = date(str(fd, "ends_on", 10));
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (!title || title.length < 5) errors.title = "Almeno 5 caratteri.";
  if (!description || description.length < 20) errors.description = "Almeno 20 caratteri.";
  if (!conditions || conditions.length < 10) errors.conditions = "Indica le condizioni (almeno 10 caratteri).";
  if (!category || !(category in OFFER_CATEGORIES)) errors.category = "Scegli una categoria.";
  if (!original) errors.original_price = "Prezzo non valido.";
  if (!promo) errors.promo_price = "Prezzo non valido.";
  if (original && promo && promo >= original) errors.promo_price = "Deve essere inferiore al prezzo originale.";
  if (!starts) errors.starts_on = "Data obbligatoria.";
  if (!ends) errors.ends_on = "Data obbligatoria.";
  if (starts && ends && ends < starts) errors.ends_on = "Deve seguire la data di inizio.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const neo = bool(fd, "neo_dedicated");
  const topic = str(fd, "neo_topic", 30);
  const row = {
    title: title!, description: description!, conditions: conditions!, category: category!, original_price_cents: original!, promo_price_cents: promo!,
    starts_on: starts!, ends_on: ends!, quantity_total: int(fd, "quantity_total", 1, 100000), neo_dedicated: neo,
    neo_topic: neo && topic && topic in NEO_TOPICS ? topic : null, image_path: str(fd, "image_path", 400),
    status: fd.get("submit") === "1" ? "in_revisione" : "bozza",
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  if (id && isUuid(id)) {
    const { image_path, ...rest } = row;
    const { error } = await supabase.from("promotional_offers").update({ ...rest, ...(image_path ? { image_path } : {}) }).eq("id", id).eq("owner_id", user.id);
    if (error) return fail(dbErrorMessage(error));
    revalidatePath(P); revalidateTag("offers", "max");
    return ok(row.status === "in_revisione" ? "Offerta inviata in revisione: lo staff la controllerà prima della pubblicazione." : "Offerta salvata.");
  }
  const { error } = await supabase.from("promotional_offers").insert({ ...row, profile_id: profile, slug: "x" });
  if (error) return fail(dbErrorMessage(error));
  redirect(`${P}?salvata=1`);
}

export async function setOfferStatus(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(P);
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 20);
  if (!id || !isUuid(id) || !status || !["bozza", "in_revisione", "sospesa"].includes(status)) return fail("Operazione non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("promotional_offers").update({ status }).eq("id", id).eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P); revalidateTag("offers", "max");
  return ok(status === "sospesa" ? "Offerta sospesa." : status === "in_revisione" ? "Inviata in revisione." : "Riportata in bozza.");
}

export async function deleteOffer(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser(P);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Offerta non valida.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("promotional_offers").delete({ count: "exact" }).eq("id", id).eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  if (!count) return fail("Si possono eliminare solo bozze o offerte rifiutate senza richieste: per le altre usa «Sospendi».");
  revalidatePath(P);
  return ok("Offerta eliminata.");
}

export async function saveCoupon(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(P);
  const profile = str(fd, "profile_id", 40);
  const code = str(fd, "code", 24)?.toUpperCase().replace(/[^A-Z0-9-]/g, "") ?? "";
  const type = str(fd, "discount_type", 20);
  const value = int(fd, "discount_value", 1, 100000);
  const until = date(str(fd, "valid_until", 10));
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (code.length < 4) return fail("Codice di almeno 4 caratteri (lettere, numeri, trattino).", { code: "Non valido." });
  if (!type || !["percentuale", "importo"].includes(type) || !value) return fail("Indica tipo e valore dello sconto.");
  if (type === "percentuale" && value > 90) return fail("Lo sconto percentuale non può superare il 90%.");
  if (!until) return fail("Indica la scadenza.", { valid_until: "Obbligatoria." });
  const offer = str(fd, "offer_id", 40);
  const cats = fd.getAll("categories").filter((c): c is string => typeof c === "string" && c in OFFER_CATEGORIES);
  const min = euro(fd, "min_amount");
  const supabase = await createClient();
  const { error } = await supabase.from("promotional_coupons").insert({
    profile_id: profile, offer_id: offer && isUuid(offer) ? offer : null, code, discount_type: type, discount_value: value,
    max_uses: int(fd, "max_uses", 1, 100000), per_user_limit: int(fd, "per_user_limit", 1, 10) ?? 1, min_amount_cents: min,
    categories: cats, valid_from: date(str(fd, "valid_from", 10)) ?? new Date().toISOString().slice(0, 10), valid_until: until,
  });
  if (error) return fail(error.code === "23505" ? "Questo codice esiste già: scegline un altro." : dbErrorMessage(error));
  revalidatePath(P);
  return ok("Coupon creato.");
}

export async function toggleCoupon(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(P);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Coupon non valido.");
  const supabase = await createClient();
  const { error } = await supabase.from("promotional_coupons").update({ active: fd.get("active") === "1" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Coupon aggiornato.");
}

/** Riscatto: crea una RICHIESTA/PRENOTAZIONE con codice personale. Nessun acquisto. */
export async function claimOffer(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const id = str(fd, "offer_id", 40);
  const back = str(fd, "return_to", 200) ?? "/offerte";
  if (!user) redirect(`/accedi?next=${encodeURIComponent(back)}`);
  if (!id || !isUuid(id)) return fail("Offerta non valida.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_offer", { offer_id: id, coupon_code: str(fd, "coupon", 24) ?? undefined, message: str(fd, "message", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  const row = (data as { claim_code: string; estimated_cents: number }[] | null)?.[0];
  revalidatePath("/dashboard/le-mie-offerte");
  return ok(`Richiesta inviata. Il tuo codice è ${row?.claim_code ?? ""}: mostralo al partner. Il partner confermerà disponibilità e condizioni; nessun pagamento avviene su AutoGarage24.`);
}

export async function updateClaim(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard");
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 20);
  if (!id || !isUuid(id) || !status) return fail("Operazione non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_offer_claim", { claim_id: id, new_status: status });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P); revalidatePath("/dashboard/le-mie-offerte");
  return ok("Richiesta aggiornata.");
}

export async function adminModerateOffer(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("offers.moderate", "/admin/offerte");
  const id = str(fd, "id", 40);
  const decision = str(fd, "decision", 20);
  if (!id || !isUuid(id) || !decision) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_moderate_offer", { offer_id: id, decision, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/offerte"); revalidateTag("offers", "max");
  return ok("Decisione registrata.");
}

export async function adminSetSetting(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("settings.manage", "/admin/impostazioni");
  const key = str(fd, "key", 60);
  const raw = str(fd, "value", 2000);
  if (!key || raw === null) return fail("Dati non validi.");
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return fail("Valore non valido (formato JSON)."); }
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_setting", { setting_key: key, setting_value: value as never });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/impostazioni");
  return ok("Impostazione salvata e registrata nel registro attività.");
}
