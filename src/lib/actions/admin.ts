"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sanitizeCms, CMS_FIELDS } from "@/config/cms";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums, Json } from "@/lib/supabase/database.types";
import type { Permission } from "@/lib/auth/permissions";
import { dbErrorMessage, fail, isUuid, ok, str } from "./helpers";

/**
 * Tutte le azioni amministrative passano da funzioni del database che verificano
 * il permesso e scrivono l'audit log. Il controllo qui sotto è un secondo livello.
 */
async function guard(permission: Permission, path: string) {
  await requirePermission(permission, path);
  return createClient();
}
const done = (msg: string, ...paths: string[]) => { paths.forEach((p) => revalidatePath(p)); return ok(msg); };

export async function adminAccountStatus(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("users.manage", "/admin/utenti");
  const user = str(fd, "user_id", 40); const status = str(fd, "status", 20) as Enums<"account_status"> | null;
  const reason = str(fd, "reason", 500);
  if (!user || !isUuid(user) || !status) return fail("Dati non validi.");
  if (status !== "attivo" && !reason) return fail("Indica la motivazione.", { reason: "Obbligatoria per sospendere." });
  const { error } = await supabase.rpc("admin_set_account_status", { target_user: user, new_status: status, reason: reason ?? undefined });
  return error ? fail(dbErrorMessage(error)) : done("Stato dell'account aggiornato.", "/admin/utenti");
}

export async function adminRole(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("roles.manage", "/admin/utenti");
  const user = str(fd, "user_id", 40); const role = str(fd, "role", 30) as Enums<"app_role"> | null; const op = str(fd, "op", 10);
  if (!user || !isUuid(user) || !role) return fail("Dati non validi.");
  const { error } = op === "revoca"
    ? await supabase.rpc("admin_revoke_role", { target_user: user, role_to_revoke: role })
    : await supabase.rpc("admin_grant_role", { target_user: user, role_to_grant: role });
  return error ? fail(dbErrorMessage(error)) : done(op === "revoca" ? "Ruolo revocato." : "Ruolo assegnato.", "/admin/utenti");
}

export async function adminModerateListing(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("listings.moderate", "/admin/moderazione");
  const id = str(fd, "id", 40); const action = str(fd, "action", 30);
  if (!id || !isUuid(id) || !action) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_moderate_listing", { listing_id: id, action, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("listings", "max");
  return done("Annuncio aggiornato.", "/admin/moderazione");
}

export async function adminModeratePart(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("listings.moderate", "/admin/moderazione");
  const id = str(fd, "id", 40); const action = str(fd, "action", 30);
  if (!id || !isUuid(id) || !action) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_moderate_part", { part_id: id, action, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("parts", "max");
  return done("Ricambio aggiornato.", "/admin/moderazione");
}

export async function adminToggleService(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("listings.moderate", "/admin/moderazione");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Dati non validi.");
  const { error } = await supabase.from("professional_services").update({ active: str(fd, "active", 2) === "1" }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("profiles", "max");
  return done("Servizio aggiornato.", "/admin/moderazione");
}

export async function adminReviewProfile(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("professionals.verify", "/admin/verifiche");
  const id = str(fd, "id", 40); const decision = str(fd, "decision", 20) as Enums<"profile_review_status"> | null;
  if (!id || !isUuid(id) || !decision) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_review_professional_profile", { profile_id: id, decision, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("profiles", "max");
  return done("Esito registrato.", "/admin/verifiche", "/admin/professionisti");
}

export async function adminReviewVerification(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("professionals.verify", "/admin/verifiche");
  const id = str(fd, "id", 40); const decision = str(fd, "decision", 20) as Enums<"verification_status"> | null;
  if (!id || !isUuid(id) || !decision) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_review_verification", { request_id: id, decision, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("profiles", "max");
  return done("Verifica aggiornata.", "/admin/verifiche");
}

export async function adminVerifyCertification(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("professionals.verify", "/admin/verifiche");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_verify_certification", { certification_id: id, approve: str(fd, "approve", 2) === "1" });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("profiles", "max");
  return done("Certificazione aggiornata.", "/admin/verifiche");
}

export async function adminClearBadge(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("professionals.verify", "/admin/verifiche");
  const user = str(fd, "user_id", 40); const badge = str(fd, "badge", 30) as Enums<"verification_type"> | null; const reason = str(fd, "reason", 500);
  if (!user || !isUuid(user) || !badge || !reason) return fail("Indica la motivazione.", { reason: "Obbligatoria." });
  const { error } = await supabase.rpc("admin_clear_badge", { target_user: user, badge, reason });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("profiles", "max");
  return done("Badge revocato.", "/admin/verifiche");
}

export async function adminModerateReview(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("reviews.moderate", "/admin/recensioni");
  const id = str(fd, "id", 40); const status = str(fd, "status", 20); const note = str(fd, "note", 1000);
  if (!id || !isUuid(id) || !status || !note) return fail("Indica la motivazione.", { note: "Obbligatoria." });
  const { error } = await supabase.rpc("admin_moderate_review", { review_id: id, new_status: status, note });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("profiles", "max");
  return done("Recensione aggiornata.", "/admin/recensioni");
}

export async function adminUpdateReport(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("reports.manage", "/admin/segnalazioni");
  const id = str(fd, "id", 40); const status = str(fd, "status", 20);
  if (!id || !isUuid(id) || !status) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_update_report", { report_id: id, new_status: status, new_priority: str(fd, "priority", 20) ?? undefined, resolution_text: str(fd, "resolution", 2000) ?? undefined, assign_to_me: str(fd, "assign", 2) === "1" });
  return error ? fail(dbErrorMessage(error)) : done("Segnalazione aggiornata.", "/admin/segnalazioni");
}

/** Accesso eccezionale ai messaggi di una conversazione segnalata: motivazione obbligatoria, tracciato. */
export async function adminReadConversation(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("conversations.moderate", "/admin/segnalazioni");
  const id = str(fd, "conversation_id", 40); const why = str(fd, "justification", 500);
  if (!id || !isUuid(id)) return fail("Conversazione non valida.");
  if (!why || why.length < 10) return fail("Indica una motivazione (almeno 10 caratteri).", { justification: "Obbligatoria." });
  const { data, error } = await supabase.rpc("admin_read_conversation", { conversation_id: id, justification: why });
  if (error) return fail(dbErrorMessage(error));
  return { status: "success", message: "Accesso registrato nell'audit log.", values: { transcript: JSON.stringify(data) } };
}

export async function adminUpdateTicket(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("support.manage", "/admin/supporto");
  const id = str(fd, "id", 40); const status = str(fd, "status", 20);
  if (!id || !isUuid(id) || !status) return fail("Dati non validi.");
  const { error } = await supabase.rpc("admin_update_ticket", { ticket_id: id, new_status: status, assign_to_me: str(fd, "assign", 2) === "1" });
  return error ? fail(dbErrorMessage(error)) : done("Ticket aggiornato.", "/admin/supporto");
}

export async function adminSaveContent(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("content.manage", "/admin/contenuti");
  const key = str(fd, "key", 60);
  if (!key || !(key in CMS_FIELDS)) return fail("Contenuto non valido.");
  const raw: Record<string, unknown> = {};
  for (const f of CMS_FIELDS[key]) raw[f.name] = fd.get(f.name);
  const content = sanitizeCms(key, raw);
  const publish = str(fd, "publish", 2) === "1";
  const { error } = await supabase.rpc("admin_save_content", { content_key: key, content: content as Json, publish });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag(`content:${key}`, "max");
  return done(publish ? "Contenuto pubblicato." : "Bozza salvata (non ancora visibile sul sito).", "/admin/contenuti");
}

export async function adminUnpublishContent(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("content.manage", "/admin/contenuti");
  const key = str(fd, "key", 60);
  if (!key) return fail("Contenuto non valido.");
  const { error } = await supabase.rpc("admin_unpublish_content", { content_key: key });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag(`content:${key}`, "max");
  return done("Pubblicazione ritirata: il sito mostra i testi predefiniti.", "/admin/contenuti");
}

export async function adminProcessDeletion(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("gdpr.manage", "/admin/gdpr");
  const id = str(fd, "id", 40); const decision = str(fd, "decision", 20); const note = str(fd, "note", 1000);
  if (!id || !isUuid(id) || !decision || !note) return fail("Indica una nota.", { note: "Obbligatoria." });
  const { error } = await supabase.rpc("admin_process_deletion", { request_id: id, decision, note });
  return error ? fail(dbErrorMessage(error)) : done("Richiesta aggiornata.", "/admin/gdpr");
}

/** Categorie (servizi e ricambi) gestibili senza modificare il codice. */
export async function adminSaveCategory(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("categories.manage", "/admin/categorie");
  const table = str(fd, "table", 30);
  const name = str(fd, "name", 80);
  const slug = (str(fd, "slug", 60) ?? name ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!name || !slug) return fail("Indica il nome.", { name: "Obbligatorio." });
  const active = fd.getAll("active").map(String).includes("on");
  if (table === "business_categories") {
    const applies = str(fd, "applies_to", 20);
    if (!applies || !["officina", "meccanico", "entrambi"].includes(applies)) return fail("Scegli a chi si applica.");
    const { error } = await supabase.from("business_categories").upsert({ slug, name, applies_to: applies, active, position: Number(str(fd, "position", 5) ?? 100) || 100 });
    if (error) return fail(dbErrorMessage(error));
  } else if (table === "part_categories") {
    const parent = str(fd, "parent_id", 40);
    const id = str(fd, "id", 40);
    const row = { slug, name, parent_id: parent && isUuid(parent) ? parent : null, active, position: Number(str(fd, "position", 5) ?? 100) || 100 };
    const { error } = id && isUuid(id) ? await supabase.from("part_categories").update(row).eq("id", id) : await supabase.from("part_categories").insert(row);
    if (error) return fail(dbErrorMessage(error));
  } else return fail("Tabella non valida.");
  return done("Categoria salvata.", "/admin/categorie");
}

export async function adminSavePlan(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("plans.manage", "/admin/piani");
  const code = str(fd, "code", 40); const name = str(fd, "name", 80); const audience = str(fd, "audience", 30);
  if (!code || !name || !audience) return fail("Compila codice, nome e destinatari.");
  const features = (str(fd, "features", 2000) ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  // I piani restano NON attivi: l'attivazione commerciale richiede l'approvazione del fondatore e un provider di pagamento.
  const { error } = await supabase.from("subscription_plans").upsert({ code: code.toLowerCase().replace(/[^a-z0-9_]/g, "_"), name, audience, features, price_note: str(fd, "price_note", 200), active: false }, { onConflict: "code" });
  return error ? fail(dbErrorMessage(error)) : done("Piano salvato (non attivo).", "/admin/piani");
}

// ---------------------------------------------------------------------
// Regole neopatentati: bozza → test → pubblicazione (con fonte e motivazione)
// ---------------------------------------------------------------------
function ruleFromForm(fd: FormData) {
  const n = (k: string) => { const v = str(fd, k, 20); const x = v ? Number(v.replace(",", ".")) : NaN; return Number.isFinite(x) ? x : null; };
  const date = (k: string) => { const v = str(fd, k, 10); return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
  const sources = (str(fd, "sources", 4000) ?? "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter(([t, u]) => t && u && /^https:\/\//.test(u)).map(([title, url]) => ({ title, url }));
  const params = {
    license_categories: ["B"], duration_months: n("duration_months"), max_power_to_tare_kw_t: n("max_power_to_tare_kw_t"), max_power_kw: n("max_power_kw"),
    max_power_kw_categories: ["M1"], borderline_margin_pct: n("borderline_margin_pct") ?? 2, documented_ratio_required_for_fuels: ["elettrica", "ibrida_plugin"],
  };
  return {
    version_label: str(fd, "version_label", 60), license_obtained_from: date("license_obtained_from"), license_obtained_to: date("license_obtained_to"),
    effective_from: date("effective_from"), effective_to: date("effective_to"), consulted_on: date("consulted_on"), reason: str(fd, "reason", 2000), params, sources,
  };
}

export async function adminSaveRuleDraft(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("neo_rules.manage", "/admin/neopatentati");
  const me = (await supabase.auth.getClaims()).data?.claims?.sub;
  const r = ruleFromForm(fd);
  const errors: Record<string, string> = {};
  if (!r.version_label) errors.version_label = "Indica un nome per la versione.";
  if (!r.effective_from) errors.effective_from = "Indica la data di entrata in vigore.";
  if (!r.params.duration_months || !r.params.max_power_to_tare_kw_t) errors.duration_months = "Durata e rapporto potenza/tara sono obbligatori.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const id = str(fd, "id", 40);
  const copyExceptions = str(fd, "copy_from", 40);
  let exceptions: Json = [];
  if (copyExceptions && isUuid(copyExceptions)) {
    const { data } = await supabase.from("legal_rule_versions").select("exceptions").eq("id", copyExceptions).maybeSingle();
    exceptions = (data?.exceptions ?? []) as Json;
  }
  if (id && isUuid(id)) {
    const { error } = await supabase.from("legal_rule_versions").update({ ...r, version_label: r.version_label!, effective_from: r.effective_from! }).eq("id", id).eq("status", "bozza");
    if (error) return fail(dbErrorMessage(error));
    return done("Bozza aggiornata: esegui di nuovo il test prima di pubblicare.", "/admin/neopatentati");
  }
  const { data: rule } = await supabase.from("legal_rules").select("id").eq("code", "neopatentati_potenza_b").single();
  if (!rule) return fail("Regola di base non trovata.");
  const { error } = await supabase.from("legal_rule_versions").insert({ ...r, version_label: r.version_label!, effective_from: r.effective_from!, rule_id: rule.id, status: "bozza", created_by: me, exceptions });
  if (error) return fail(dbErrorMessage(error));
  return done("Bozza creata. Ora esegui il test.", "/admin/neopatentati");
}

export async function adminTestRule(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("neo_rules.manage", "/admin/neopatentati");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Versione non valida.");
  const { data, error } = await supabase.rpc("admin_test_rule_version", { version_id: id });
  if (error) return fail(dbErrorMessage(error));
  const d = data as { total?: number; by_result?: Record<string, number>; changes?: unknown[] } | null;
  return done(`Test eseguito su ${d?.total ?? 0} veicoli del marketplace: ${Object.entries(d?.by_result ?? {}).map(([k, v]) => `${v} ${k.replace("_", " ")}`).join(", ")}; esiti che cambierebbero: ${d?.changes?.length ?? 0}.`, "/admin/neopatentati");
}

export async function adminPublishRule(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("neo_rules.manage", "/admin/neopatentati");
  const id = str(fd, "id", 40); const reason = str(fd, "reason", 1000);
  if (!id || !isUuid(id)) return fail("Versione non valida.");
  if (!reason) return fail("Indica la motivazione della pubblicazione.", { reason: "Obbligatoria." });
  const { error } = await supabase.rpc("admin_publish_rule_version", { version_id: id, publish_reason: reason });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("neo-rules", "max"); revalidateTag("listings", "max");
  return done("Versione pubblicata: gli annunci sono stati ricalcolati e lo storico delle verifiche precedenti è conservato.", "/admin/neopatentati");
}

export async function adminArchiveRule(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("neo_rules.manage", "/admin/neopatentati");
  const id = str(fd, "id", 40); const reason = str(fd, "reason", 1000);
  if (!id || !isUuid(id) || !reason) return fail("Indica la motivazione.", { reason: "Obbligatoria." });
  const { error } = await supabase.rpc("admin_archive_rule_version", { version_id: id, archive_reason: reason });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("neo-rules", "max");
  return done("Versione archiviata.", "/admin/neopatentati");
}

/** Fase 13: modifica dei testi/prezzo di un annuncio da parte dello staff (motivazione obbligatoria, notifica al venditore). */
export async function adminEditListing(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("listings.moderate", "/admin/moderazione");
  const id = str(fd, "id", 40);
  const title = str(fd, "title", 140);
  const reason = str(fd, "reason", 500);
  const priceRaw = str(fd, "price", 20);
  const price = priceRaw ? Math.round(Number(priceRaw.replace(/\./g, "").replace(",", ".")) * 100) : null;
  if (!id || !isUuid(id) || !title || title.length < 3) return fail("Titolo non valido.");
  if (!reason || reason.length < 5) return fail("Indica la motivazione della modifica.", { reason: "Obbligatoria." });
  if (priceRaw && (!Number.isFinite(price) || (price ?? 0) <= 0)) return fail("Prezzo non valido.", { price: "Non valido." });
  const { error } = await supabase.rpc("admin_edit_listing", { listing_id: id, new_title: title, new_description: str(fd, "description", 6000) ?? "", new_price_cents: price as number, reason });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("listings", "max");
  return done("Annuncio modificato. Il venditore è stato avvisato.", "/admin/moderazione");
}

/** Fase 13: eliminazione definitiva di un annuncio NON pubblico, con motivazione registrata nel registro attività. */
export async function adminDeleteListing(_p: FormState, fd: FormData): Promise<FormState> {
  const supabase = await guard("listings.moderate", "/admin/moderazione");
  const id = str(fd, "id", 40);
  const reason = str(fd, "reason", 500);
  if (!id || !isUuid(id)) return fail("Annuncio non valido.");
  if (!reason || reason.length < 10) return fail("Indica una motivazione di almeno 10 caratteri.", { reason: "Obbligatoria." });
  const { error } = await supabase.rpc("admin_delete_listing", { listing_id: id, reason });
  if (error) return fail(dbErrorMessage(error));
  revalidateTag("listings", "max");
  return done("Annuncio eliminato e registrato nel registro attività.", "/admin/moderazione");
}
