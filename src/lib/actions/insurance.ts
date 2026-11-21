"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { COVERAGES, PARTNER_TYPES, PROVINCES } from "@/lib/insurance/labels";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, many, num, ok, str } from "./helpers";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS = /^https:\/\/[^\s]+$/;

export async function createInsuranceRequest(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/assicurazione-auto/richiesta");
  const make = str(fd, "vehicle_make", 60), model = str(fd, "vehicle_model", 80), prov = str(fd, "province", 2)?.toUpperCase();
  const coverages = many(fd, "coverages", Object.keys(COVERAGES)), partners = fd.getAll("partner_ids").map(String).filter(isUuid);
  const e: Record<string, string> = {};
  if (!make) e.vehicle_make = "Obbligatoria."; if (!model) e.vehicle_model = "Obbligatorio.";
  if (!prov || !PROVINCES.includes(prov)) e.province = "Scegli la provincia di residenza.";
  if (!coverages.length) e.coverages = "Scegli almeno una copertura.";
  if (!partners.length) e.partner_ids = "Scegli almeno un partner.";
  if (!bool(fd, "consent")) e.consent = "Serve il consenso esplicito alla trasmissione.";
  const channel = str(fd, "contact_channel", 20) ?? "piattaforma";
  const phone = str(fd, "contact_phone", 30);
  if (channel === "telefono" && (!phone || !/^[0-9 +().-]{6,30}$/.test(phone))) e.contact_phone = "Indica un telefono valido.";
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const reg = str(fd, "registration_date", 10), start = str(fd, "desired_start", 10), uv = str(fd, "user_vehicle_id", 40), cap = str(fd, "postal_code", 5);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_insurance_request", {
    p_vehicle_make: make!, p_vehicle_model: model!, p_coverages: coverages, p_province: prov!, p_partner_ids: partners, p_consent: true,
    p_vehicle_year: int(fd, "vehicle_year", 1950, 2100) ?? undefined, p_fuel: str(fd, "fuel", 30) ?? undefined, p_power_kw: int(fd, "power_kw", 1, 1500) ?? undefined,
    p_registration_date: reg && DATE.test(reg) ? reg : undefined, p_plate: str(fd, "plate", 12) ?? undefined, p_postal_code: cap && /^\d{5}$/.test(cap) ? cap : undefined,
    p_desired_start: start && DATE.test(start) ? start : undefined, p_contact_channel: ["piattaforma", "email", "telefono"].includes(channel) ? channel : "piattaforma",
    p_contact_phone: phone ?? undefined, p_notes: str(fd, "notes", 1000) ?? undefined, p_user_vehicle_id: uv && isUuid(uv) ? uv : undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/assicurazioni/${data}?creata=1`);
}

export async function withdrawInsuranceRequest(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/assicurazioni");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const del = bool(fd, "delete_data");
  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_insurance_request", { request_id: id, delete_data: del });
  if (error) return fail(dbErrorMessage(error));
  if (del) redirect("/dashboard/assicurazioni?eliminata=1");
  revalidatePath(`/dashboard/assicurazioni/${id}`);
  return ok("Richiesta ritirata: i partner sono stati avvisati.");
}

export async function partnerUpdateRequest(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/assicurazioni/partner");
  const id = str(fd, "id", 40), st = str(fd, "status", 30);
  if (!id || !isUuid(id) || !st) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("partner_update_insurance_request", { request_partner_id: id, new_status: st, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/assicurazioni/partner");
  return ok("Stato aggiornato e cliente avvisato.");
}

export async function submitInsuranceQuote(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/assicurazioni/partner");
  const id = str(fd, "id", 40), name = str(fd, "product_name", 160), premium = num(fd, "premium", 10, 1000000), cov = str(fd, "coverages", 2000);
  const months = int(fd, "duration_months", 1, 36), docs = str(fd, "documents_url", 500), until = str(fd, "valid_until", 10), buy = str(fd, "purchase_url", 500);
  const e: Record<string, string> = {};
  if (!name) e.product_name = "Obbligatorio."; if (premium === null) e.premium = "Indica il premio annuo.";
  if (!cov || cov.length < 5) e.coverages = "Descrivi le coperture incluse."; if (!months) e.duration_months = "Obbligatoria.";
  if (!docs || !HTTPS.test(docs)) e.documents_url = "Link https al set informativo (DIP, DIP aggiuntivo, condizioni).";
  if (!until || !DATE.test(until)) e.valid_until = "Obbligatoria.";
  if (buy && !HTTPS.test(buy)) e.purchase_url = "Link https non valido.";
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_insurance_quote", { request_partner_id: id, product_name: name!, annual_premium_cents: Math.round(premium! * 100), coverages: cov!,
    duration_months: months!, documents_url: docs!, valid_until: until!, deductibles: str(fd, "deductibles", 1000) ?? undefined, limits: str(fd, "limits", 1000) ?? undefined,
    exclusions: str(fd, "exclusions", 2000) ?? undefined, purchase_url: buy ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/assicurazioni/partner");
  return ok("Preventivo inviato al cliente.");
}

const ADMIN = "/admin/assicurazioni";
export async function adminSavePartner(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("insurance.manage", ADMIN);
  const id = str(fd, "id", 40), name = str(fd, "name", 120), type = str(fd, "partner_type", 30), legal = str(fd, "legal_name", 200);
  if (!name || !legal || !type || !(type in PARTNER_TYPES)) return fail("Nome, ragione sociale e tipo sono obbligatori.");
  const url = (k: string) => { const v = str(fd, k, 500); return v && HTTPS.test(v) ? v : null; };
  const checked = str(fd, "registry_checked_at", 10);
  const row = {
    name, partner_type: type, legal_name: legal, vat_number: str(fd, "vat_number", 11), rui_section: str(fd, "rui_section", 1), rui_number: str(fd, "rui_number", 20)?.toUpperCase() ?? null,
    ivass_company_code: str(fd, "ivass_company_code", 20), registry_checked_at: checked && DATE.test(checked) ? checked : null, registry_evidence: str(fd, "registry_evidence", 1000),
    description: str(fd, "description", 2000), coverages: many(fd, "coverages", Object.keys(COVERAGES)), website_url: url("website_url"), privacy_url: url("privacy_url"),
    contact_email: str(fd, "contact_email", 200), contact_phone: str(fd, "contact_phone", 30),
  };
  const supabase = await createClient();
  const { error } = id && isUuid(id) ? await supabase.from("insurance_partners").update(row).eq("id", id) : await supabase.from("insurance_partners").insert(row);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Partner salvato. Lo stato «verificato» richiede iscrizione controllata e informativa privacy.");
}

export async function adminPartnerStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("insurance.manage", ADMIN);
  const id = str(fd, "id", 40), st = str(fd, "status", 20);
  if (!id || !isUuid(id) || !st) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_insurance_partner_status", { partner_id: id, new_status: st, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Stato aggiornato.");
}

export async function adminAddPartnerUser(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("insurance.manage", ADMIN);
  const id = str(fd, "id", 40), email = str(fd, "email", 200);
  if (!id || !isUuid(id) || !email) return fail("Indica l'email del referente.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_insurance_partner_user", { partner_id: id, user_email: email });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Referente abilitato.");
}

export async function adminSaveIntegration(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("insurance.manage", ADMIN);
  const partner = str(fd, "partner_id", 40), kind = str(fd, "kind", 20), status = str(fd, "status", 20);
  if (!partner || !isUuid(partner) || !kind || !["api", "webhook", "link_esterno", "email"].includes(kind)) return fail("Dati non validi.");
  if (status === "attivo" && !str(fd, "contract_ref", 200)) return fail("Per attivare un'integrazione indica il riferimento del contratto con il partner.");
  const env = str(fd, "secret_env_name", 60);
  if (env && !/^[A-Z][A-Z0-9_]{2,60}$/.test(env)) return fail("Il nome della variabile deve essere in maiuscolo (es. INSURANCE_PARTNER_KEY). Non inserire mai la chiave.");
  const endpoint = str(fd, "endpoint_url", 500);
  const supabase = await createClient();
  const { error } = await supabase.from("insurance_integrations").insert({ partner_id: partner, kind, status: ["non_configurato", "in_test", "attivo", "disattivato"].includes(status ?? "") ? status! : "non_configurato",
    endpoint_url: endpoint && HTTPS.test(endpoint) ? endpoint : null, secret_env_name: env, contract_ref: str(fd, "contract_ref", 200), notes: str(fd, "notes", 1000) });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Integrazione registrata.");
}
