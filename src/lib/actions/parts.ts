"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { findBrand } from "@/config/brands";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, ok, str } from "./helpers";

const DELIVERY = ["ritiro", "spedizione", "consegna_locale"];

/** Crea o aggiorna la bozza di un ricambio (validazione lato server; nessuna pubblicazione automatica). */
export async function savePart(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/ricambi");
  const supabase = await createClient();
  const errors: Record<string, string> = {};
  const title = str(fd, "title", 160);
  const category = str(fd, "category_id", 40);
  const condition = str(fd, "condition", 20) as Enums<"part_condition"> | null;
  const priceStr = str(fd, "price", 20);
  const cents = priceStr ? Math.round(Number(priceStr.replace(/\./g, "").replace(",", ".")) * 100) : null;
  if (!title || title.length < 3) errors.title = "Indica il nome del ricambio.";
  if (!category || !isUuid(category)) errors.category_id = "Scegli la categoria.";
  if (!condition || !["nuovo", "usato", "ricondizionato"].includes(condition)) errors.condition = "Scegli la condizione.";
  if (condition === "ricondizionato" && !str(fd, "refurbishment_notes", 2000)) errors.refurbishment_notes = "Descrivi il processo di ricondizionamento.";
  if (priceStr && (cents === null || !Number.isFinite(cents) || cents < 0)) errors.price = "Prezzo non valido.";
  const cap = str(fd, "postal_code", 5);
  if (cap && !/^\d{5}$/.test(cap)) errors.postal_code = "CAP non valido.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const row = {
    title: title!, category_id: category!, condition: condition!, manufacturer_brand: str(fd, "manufacturer_brand", 80),
    oem_code: str(fd, "oem_code", 60), manufacturer_code: str(fd, "manufacturer_code", 60), description: str(fd, "description", 4000),
    refurbishment_notes: condition === "ricondizionato" ? str(fd, "refurbishment_notes", 2000) : null, price_cents: cents,
    quantity: int(fd, "quantity", 0, 100000), delivery_options: fd.getAll("delivery_options").map(String).filter((d) => DELIVERY.includes(d)),
    warranty_text: str(fd, "warranty_text", 500), shipping_info: str(fd, "shipping_info", 600), city: str(fd, "city", 80), postal_code: cap, province: str(fd, "province", 2)?.toUpperCase() ?? null,
  };
  const id = str(fd, "part_id", 40);
  if (id && isUuid(id)) {
    const { data, error } = await supabase.from("part_listings").update(row).eq("id", id).eq("owner_id", user.id).select("slug").maybeSingle();
    if (error) return fail(dbErrorMessage(error));
    if (data) revalidateTag(`part:${data.slug}`, "max");
    revalidatePath(`/dashboard/ricambi/${id}`);
    return ok("Modifiche salvate. Le modifiche sostanziali a un ricambio pubblicato lo rimandano in revisione.");
  }
  const { data, error } = await supabase.from("part_listings").insert({ ...row, owner_id: user.id, slug: "", status: "bozza" }).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/ricambi/${data.id}?creato=1`);
}

export async function addPartCompatibility(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/ricambi");
  const id = str(fd, "part_id", 40);
  const make = findBrand(str(fd, "make_slug", 40))?.slug ?? null;
  const model = str(fd, "model", 80);
  if (!id || !isUuid(id)) return fail("Ricambio non valido.");
  if (!make || !model) return fail("Indica marca e modello.", { model: "Indica marca e modello." });
  const basis = str(fd, "basis", 30) === "codice_oem" ? "codice_oem" : "dichiarazione_venditore";
  const supabase = await createClient();
  const { data: own } = await supabase.from("part_listings").select("id").eq("id", id).eq("owner_id", user.id).maybeSingle();
  if (!own) return fail("Ricambio non trovato.");
  const { error } = await supabase.from("part_compatibility").insert({
    part_id: id, make_slug: make, model, generation: str(fd, "generation", 60), version: str(fd, "version", 120),
    year_from: int(fd, "year_from", 1950, 2100), year_to: int(fd, "year_to", 1950, 2100), engine: str(fd, "engine", 80),
    engine_code: str(fd, "engine_code", 40), oem_reference: str(fd, "oem_reference", 60), basis, notes: str(fd, "notes", 300),
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/ricambi/${id}`);
  return ok("Compatibilità aggiunta.");
}

export async function deletePartCompatibility(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/ricambi");
  const id = str(fd, "compat_id", 40); const part = str(fd, "part_id", 40);
  if (!id || !isUuid(id)) return fail("Dato non valido.");
  const supabase = await createClient();
  const { error } = await supabase.from("part_compatibility").delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  if (part) revalidatePath(`/dashboard/ricambi/${part}`);
  return ok("Compatibilità rimossa.");
}

export async function registerPartImage(partId: string, path: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser("/dashboard/ricambi");
  if (!isUuid(partId) || typeof path !== "string" || !path.startsWith(`${user.id}/`) || path.includes("..")) return { ok: false, error: "File non valido." };
  const supabase = await createClient();
  const { count } = await supabase.from("part_images").select("id", { count: "exact", head: true }).eq("part_id", partId);
  if ((count ?? 0) >= 12) return { ok: false, error: "Massimo 12 foto." };
  const { error } = await supabase.from("part_images").insert({ part_id: partId, storage_path: path, position: count ?? 0, is_cover: (count ?? 0) === 0 });
  if (error) { await supabase.storage.from("listing-images").remove([path]); return { ok: false, error: dbErrorMessage(error) }; }
  revalidatePath(`/dashboard/ricambi/${partId}`);
  return { ok: true };
}

export async function deletePartImage(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/ricambi");
  const id = str(fd, "image_id", 40); const part = str(fd, "part_id", 40);
  if (!id || !isUuid(id) || !part || !isUuid(part)) return fail("Foto non valida.");
  const supabase = await createClient();
  const { data, error } = await supabase.from("part_images").delete().eq("id", id).eq("part_id", part).select("storage_path, is_cover").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data?.storage_path.startsWith(`${user.id}/`)) await supabase.storage.from("listing-images").remove([data.storage_path]);
  if (data?.is_cover) {
    const { data: next } = await supabase.from("part_images").select("id").eq("part_id", part).order("position").limit(1).maybeSingle();
    if (next) await supabase.from("part_images").update({ is_cover: true }).eq("id", next.id);
  }
  revalidatePath(`/dashboard/ricambi/${part}`);
  return ok("Foto eliminata.");
}

export async function submitPart(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/ricambi");
  const id = str(fd, "part_id", 40);
  if (!id || !isUuid(id)) return fail("Ricambio non valido.");
  const missing = ["declare_accuracy", "declare_photos", "accept_terms"].filter((k) => str(fd, k, 5) !== "on");
  if (missing.length) return fail("Conferma tutte le dichiarazioni.", Object.fromEntries(missing.map((k) => [k, "Obbligatorio."])));
  const now = new Date().toISOString();
  const supabase = await createClient();
  const { error } = await supabase.from("part_listings").update({ declared_accuracy_at: now, declared_photo_rights_at: now, accepted_terms_at: now, status: "in_revisione" }).eq("id", id).eq("owner_id", user.id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/ricambi");
  return ok("Ricambio inviato in revisione: sarà pubblico solo dopo l'approvazione.");
}

const TRANSITIONS: Record<string, Enums<"part_status">> = { pubblica: "pubblicato", sospendi: "sospeso", riattiva: "pubblicato", esaurito: "esaurito", disponibile: "pubblicato", venduto: "venduto", rinnova: "in_revisione" };

export async function partOwnerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/ricambi");
  const id = str(fd, "part_id", 40); const action = str(fd, "action", 20);
  if (!id || !isUuid(id) || !action) return fail("Operazione non valida.");
  const supabase = await createClient();
  if (action === "elimina") {
    const { data: imgs } = await supabase.from("part_images").select("storage_path").eq("part_id", id);
    const { error } = await supabase.from("part_listings").delete().eq("id", id).eq("owner_id", user.id);
    if (error) return fail(dbErrorMessage(error));
    if (imgs?.length) await supabase.storage.from("listing-images").remove(imgs.map((i) => i.storage_path));
    revalidatePath("/dashboard/ricambi");
    return ok("Bozza eliminata.");
  }
  const status = TRANSITIONS[action];
  if (!status) return fail("Operazione non valida.");
  const { data, error } = await supabase.from("part_listings").update({ status }).eq("id", id).eq("owner_id", user.id).select("slug").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data) revalidateTag(`part:${data.slug}`, "max");
  revalidatePath("/dashboard/ricambi");
  return ok("Stato aggiornato.");
}

export async function updatePartStock(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/ricambi");
  const id = str(fd, "part_id", 40);
  if (!id || !isUuid(id)) return fail("Ricambio non valido.");
  const priceStr = str(fd, "price", 20);
  const cents = priceStr ? Math.round(Number(priceStr.replace(/\./g, "").replace(",", ".")) * 100) : undefined;
  if (cents !== undefined && (!Number.isFinite(cents) || cents < 0)) return fail("Prezzo non valido.");
  const qty = str(fd, "quantity", 10) !== null ? int(fd, "quantity", 0, 100000) : undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.from("part_listings").update({ ...(cents !== undefined ? { price_cents: cents } : {}), ...(qty !== undefined ? { quantity: qty } : {}) }).eq("id", id).eq("owner_id", user.id).select("slug").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data) revalidateTag(`part:${data.slug}`, "max");
  revalidatePath("/dashboard/ricambi");
  return ok("Prezzo e disponibilità aggiornati.");
}
