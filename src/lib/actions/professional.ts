"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DAYS, normalizeDay } from "@/lib/professionals/hours";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums, TablesUpdate } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, num, ok, str } from "./helpers";

const PRO_KINDS = ["officina", "meccanico", "venditore_ricambi", "venditore_auto"] as const;
type ProKind = (typeof PRO_KINDS)[number];

async function ownProfile(profileId: string | null) {
  const user = await requireUser("/dashboard/profilo-professionale");
  if (!profileId || !isUuid(profileId)) return { user, profile: null, supabase: await createClient() };
  const supabase = await createClient();
  const { data } = await supabase.from("professional_profiles").select("id, slug, user_id, professional_type, review_status").eq("id", profileId).eq("user_id", user.id).maybeSingle();
  return { user, profile: data, supabase };
}

/** Attiva un profilo professionale per un utente già registrato (bozza, nessuna pubblicazione). */
export async function activateProfessional(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/professionisti");
  const kind = str(fd, "kind", 30) as ProKind | null;
  const name = str(fd, "business_name", 120);
  if (!kind || !PRO_KINDS.includes(kind)) return fail("Tipologia non valida.");
  if (!name || name.length < 2) return fail("Indica il nome dell'attività.", { business_name: "Indica il nome dell'attività." });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("become_professional", { kind, business_name: name });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/profilo-professionale?profilo=${data}`);
}

/** Salvataggio del profilo (in qualunque momento: la registrazione può essere ripresa). */
export async function saveProfessionalProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  if (!profile) return fail("Profilo non trovato.");
  const errors: Record<string, string> = {};
  const name = str(fd, "display_name", 120);
  if (!name || name.length < 2) errors.display_name = "Indica il nome.";
  const website = str(fd, "website", 200);
  if (website && !/^https?:\/\/[^\s]+\.[^\s]+$/i.test(website)) errors.website = "Inserisci un indirizzo completo (https://…).";
  const email = str(fd, "email_public", 160);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email_public = "Email non valida.";
  const cap = str(fd, "postal_code", 5);
  if (cap && !/^\d{5}$/.test(cap)) errors.postal_code = "CAP non valido.";
  const phone = str(fd, "phone_public", 30);
  if (phone && !/^[+0-9 ()./-]{6,30}$/.test(phone)) errors.phone_public = "Telefono non valido.";
  const lat = num(fd, "latitude", -90, 90);
  const lng = num(fd, "longitude", -180, 180);
  if ((lat === null) !== (lng === null)) errors.latitude = "Indica sia latitudine sia longitudine, oppure nessuna delle due.";
  const hours: Record<string, string> = {};
  for (const [k] of DAYS) {
    const r = normalizeDay(str(fd, `h_${k}`, 60));
    if (r.error) errors[`h_${k}`] = r.error;
    else if (r.value) hours[k] = r.value;
  }
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);

  const modes = fd.getAll("work_modes").map(String).filter((m): m is Enums<"work_mode"> => ["sede", "officina_partner", "mobile"].includes(m));
  const categories = fd.getAll("categories").map(String).filter((c) => /^[a-z0-9-]{2,40}$/.test(c)).slice(0, 20);
  const brands = (str(fd, "brands_served", 600) ?? "").split(",").map((b) => b.trim()).filter(Boolean).slice(0, 30).map((b) => b.slice(0, 40));
  const update: TablesUpdate<"professional_profiles"> = {
    display_name: name!, description: str(fd, "description", 4000), phone_public: phone, email_public: email, website,
    address_line: str(fd, "address_line", 200), show_address: str(fd, "show_address", 5) === "on",
    city: str(fd, "city", 80), province: str(fd, "province", 2)?.toUpperCase() ?? null, postal_code: cap, region: str(fd, "region", 40),
    latitude: lat, longitude: lng, categories, brands_served: brands, opening_hours: hours, closed_days: str(fd, "closed_days", 300),
    contact_person: str(fd, "contact_person", 120), work_modes: modes,
    experience_years: int(fd, "experience_years", 0, 70), service_area: str(fd, "service_area", 300),
    service_radius_km: int(fd, "service_radius_km", 1, 300), accepts_appointments: str(fd, "accepts_appointments", 5) === "on",
    // Il profilo è visibile solo se approvato dal team: "is_published" indica la volontà del titolare.
    is_published: Boolean(str(fd, "city", 80)) && str(fd, "is_published", 5) !== "off",
  };
  const { error } = await supabase.from("professional_profiles").update(update).eq("id", profile.id);
  if (error) return fail(dbErrorMessage(error));

  // Dati aziendali privati (ragione sociale, P.IVA): mai pubblicati.
  const legalName = str(fd, "legal_name", 200);
  const vat = str(fd, "vat_number", 20)?.replace(/\s/g, "") ?? null;
  if (vat && !/^(IT)?\d{11}$/i.test(vat)) return fail("Partita IVA non valida (11 cifre).", { vat_number: "Partita IVA non valida (11 cifre)." });
  if (legalName || vat) {
    const { error: be } = await supabase.from("business_profiles").upsert({ user_id: profile.user_id, legal_name: legalName ?? name!, vat_number: vat, country_code: "IT" }, { onConflict: "user_id" });
    if (be) return fail(dbErrorMessage(be));
  }
  revalidateTag(`profile:${profile.slug}`, "max");
  revalidatePath("/dashboard/profilo-professionale");
  return ok(profile.review_status === "approvato" ? "Profilo aggiornato." : "Bozza salvata: puoi riprendere quando vuoi e inviarla per la verifica.");
}

export async function submitProfessionalProfile(_prev: FormState, fd: FormData): Promise<FormState> {
  const { profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  if (!profile) return fail("Profilo non trovato.");
  const { error } = await supabase.rpc("submit_professional_profile", { profile_id: profile.id });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/profilo-professionale");
  return ok("Profilo inviato per la verifica. Ti avviseremo appena il team lo avrà esaminato.");
}

/** Servizi del catalogo (crea/modifica). */
export async function saveService(_prev: FormState, fd: FormData): Promise<FormState> {
  const { profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  if (!profile) return fail("Profilo non trovato.");
  const name = str(fd, "name", 120);
  const priceType = str(fd, "price_type", 20) as Enums<"price_type"> | null;
  const priceStr = str(fd, "price", 20);
  const cents = priceStr ? Math.round(Number(priceStr.replace(/\./g, "").replace(",", ".")) * 100) : null;
  const errors: Record<string, string> = {};
  if (!name || name.length < 2) errors.name = "Indica il nome del servizio.";
  if (!priceType || !["fisso", "a_partire_da", "su_preventivo"].includes(priceType)) errors.price_type = "Scegli il tipo di prezzo.";
  if (priceType && priceType !== "su_preventivo" && (cents === null || !Number.isFinite(cents) || cents < 0)) errors.price = "Indica il prezzo o scegli «su preventivo».";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const mode = str(fd, "work_mode", 20);
  const row = {
    profile_id: profile.id, name: name!, category: str(fd, "category", 40), description: str(fd, "description", 1000),
    price_type: priceType!, price_cents: priceType === "su_preventivo" ? null : cents, duration_text: str(fd, "duration_text", 80),
    vehicle_types: str(fd, "vehicle_types", 200), work_mode: (mode === "sede" || mode === "officina_partner" || mode === "mobile" ? mode : null) as Enums<"work_mode"> | null,
    active: str(fd, "active", 5) === "on",
  };
  const id = str(fd, "service_id", 40);
  const { error } = id && isUuid(id)
    ? await supabase.from("professional_services").update(row).eq("id", id).eq("profile_id", profile.id)
    : await supabase.from("professional_services").insert(row);
  if (error) return fail(dbErrorMessage(error));
  revalidateTag(`profile:${profile.slug}`, "max");
  revalidatePath("/dashboard/servizi");
  return ok(id ? "Servizio aggiornato." : "Servizio aggiunto.");
}

export async function deleteService(_prev: FormState, fd: FormData): Promise<FormState> {
  const { profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  const id = str(fd, "service_id", 40);
  if (!profile || !id || !isUuid(id)) return fail("Servizio non valido.");
  const { error } = await supabase.from("professional_services").delete().eq("id", id).eq("profile_id", profile.id);
  if (error) return fail(dbErrorMessage(error));
  revalidateTag(`profile:${profile.slug}`, "max");
  revalidatePath("/dashboard/servizi");
  return ok("Servizio eliminato.");
}

/** Registra una foto/logo/copertina già caricati dal browser nella propria cartella. */
export async function registerBusinessMedia(profileId: string, kind: "logo" | "copertina" | "foto", path: string, _fileName?: string): Promise<{ ok: boolean; error?: string }> {
  if (!["logo", "copertina", "foto"].includes(kind) || typeof path !== "string") return { ok: false, error: "Dati non validi." };
  const { user, profile, supabase } = await ownProfile(profileId);
  if (!profile || !path.startsWith(`${user.id}/`) || path.includes("..")) return { ok: false, error: "File non valido." };
  if (kind === "logo" || kind === "copertina") {
    const { error } = await supabase.from("professional_profiles").update(kind === "logo" ? { logo_path: path } : { cover_path: path }).eq("id", profile.id);
    if (error) return { ok: false, error: dbErrorMessage(error) };
  } else {
    const { error } = await supabase.from("business_photos").insert({ profile_id: profile.id, storage_path: path, kind: "lavori", caption: null });
    if (error) return { ok: false, error: dbErrorMessage(error) };
  }
  revalidateTag(`profile:${profile.slug}`, "max");
  revalidatePath("/dashboard/profilo-professionale");
  return { ok: true };
}

export async function deleteBusinessPhoto(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user, profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  const id = str(fd, "photo_id", 40);
  if (!profile || !id || !isUuid(id)) return fail("Foto non valida.");
  const { data, error } = await supabase.from("business_photos").delete().eq("id", id).eq("profile_id", profile.id).select("storage_path").maybeSingle();
  if (error) return fail(dbErrorMessage(error));
  if (data?.storage_path.startsWith(`${user.id}/`)) await supabase.storage.from("business-media").remove([data.storage_path]);
  revalidateTag(`profile:${profile.slug}`, "max");
  revalidatePath("/dashboard/profilo-professionale");
  return ok("Foto eliminata.");
}

/** Certificazione dichiarata: diventa pubblica solo dopo la verifica del documento da parte dello staff. */
export async function addCertification(_prev: FormState, fd: FormData): Promise<FormState> {
  const { user, profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  if (!profile) return fail("Profilo non trovato.");
  const title = str(fd, "title", 160);
  const doc = str(fd, "document_path", 400);
  if (!title) return fail("Indica la certificazione.", { title: "Indica la certificazione." });
  if (doc && (!doc.startsWith(`${user.id}/`) || doc.includes(".."))) return fail("Documento non valido.");
  const { error } = await supabase.from("professional_certifications").insert({ profile_id: profile.id, title, issuer: str(fd, "issuer", 160), issued_on: str(fd, "issued_on", 10), document_path: doc });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/profilo-professionale");
  return ok("Certificazione inviata: sarà mostrata come verificata solo dopo il controllo del documento.");
}

/** Richiesta di verifica (identità, attività, documentazione) con documenti nella cartella privata. */
export async function requestVerification(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/profilo-professionale");
  const type = str(fd, "verification_type", 40) as Enums<"verification_type"> | null;
  if (!type || !["identita", "attivita_professionale", "documentazione"].includes(type)) return fail("Tipo di verifica non valido.");
  const files = fd.getAll("document_paths").map(String).filter((p) => p.startsWith(`${user.id}/`) && !p.includes("..")).slice(0, 10);
  const notes = [str(fd, "notes", 1500), files.length ? `Documenti caricati: ${files.join(", ")}` : null].filter(Boolean).join("\n");
  const supabase = await createClient();
  const { error } = await supabase.from("verification_requests").insert({ user_id: user.id, verification_type: type, user_notes: notes || null });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/profilo-professionale");
  return ok("Richiesta di verifica inviata. I documenti restano privati e sono visibili solo allo staff autorizzato.");
}

/** Il meccanico chiede di collegarsi a un'officina: serve l'accettazione dell'officina. */
export async function requestAffiliation(_prev: FormState, fd: FormData): Promise<FormState> {
  const { profile, supabase } = await ownProfile(str(fd, "profile_id", 40));
  const garageSlug = str(fd, "garage_slug", 140);
  if (!profile || profile.professional_type !== "meccanico") return fail("Solo i meccanici possono richiedere un collegamento.");
  if (!garageSlug) return fail("Indica l'officina.", { garage_slug: "Indica l'indirizzo del profilo dell'officina." });
  const slug = garageSlug.replace(/^.*\/garages\//, "").replace(/[/?#].*$/, "");
  const { data: g } = await supabase.from("professional_profiles").select("id").eq("slug", slug).eq("professional_type", "officina").maybeSingle();
  if (!g) return fail("Officina non trovata: copia l'indirizzo della sua pagina su AutoGarage24.");
  const { error } = await supabase.from("professional_affiliations").insert({ mechanic_profile_id: profile.id, garage_profile_id: g.id, status: "in_attesa", message: str(fd, "message", 500) });
  if (error) return fail(dbErrorMessage(error));
  return ok("Richiesta inviata all'officina: il collegamento sarà visibile solo dopo la sua accettazione.");
}

export async function decideAffiliation(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/garage");
  const id = str(fd, "affiliation_id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_affiliation", { affiliation_id: id, decision: str(fd, "accept", 2) === "1" ? "accettato" : str(fd, "accept", 2) === "r" ? "revocato" : "rifiutato" });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/garage");
  return ok(str(fd, "accept", 2) === "1" ? "Collegamento accettato." : "Collegamento rifiutato.");
}
