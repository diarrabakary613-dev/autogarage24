"use server";

import { createClient } from "@/lib/supabase/server";
import { BUSINESS_TYPES, BETA_AUDIENCES, PROGRAMS } from "@/lib/crm";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, ok, str } from "./helpers";

const EMAIL = /^[^@\s]{1,64}@[^@\s]+\.[^@\s]{2,}$/;
const PHONE = /^[0-9 +().-]{6,30}$/;
const landing = (v: string | null) => (v && /^\/[a-z0-9/_-]{0,199}$/.test(v) ? v : null);
const utm = (v: string | null) => (v ? v.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 80) || null : null);

function values(fd: FormData) {
  const out: Record<string, string> = {};
  for (const k of ["business_name", "contact_name", "email", "phone", "address", "city", "cars_available", "message", "applicant_type"]) {
    const v = fd.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

/** Candidatura partner (pubblica, anche senza account). Nessuna email automatica a terzi. */
export async function submitPartnerApplication(_p: FormState, fd: FormData): Promise<FormState> {
  const program = str(fd, "program", 30) ?? "partner_professionisti";
  const type = str(fd, "applicant_type", 30);
  const errors: Record<string, string> = {};
  const business = str(fd, "business_name", 160);
  const contact = str(fd, "contact_name", 120);
  const email = str(fd, "email", 254)?.toLowerCase() ?? null;
  const phone = str(fd, "phone", 30);
  const city = str(fd, "city", 80);
  if (!(program in PROGRAMS)) return fail("Programma non valido.");
  if (!type || !(type in BUSINESS_TYPES)) errors.applicant_type = "Scegli la tipologia.";
  if (!business || business.length < 2) errors.business_name = "Indica il nome dell'attività.";
  if (!contact || contact.length < 2) errors.contact_name = "Indica il referente.";
  if (!email || !EMAIL.test(email)) errors.email = "Email non valida.";
  if (!phone || !PHONE.test(phone)) errors.phone = "Telefono non valido.";
  if (!city || city.length < 2) errors.city = "Indica la città.";
  if (!bool(fd, "privacy")) errors.privacy = "Serve la presa visione dell'informativa.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors, values(fd));
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_partner_application", {
    p_program: program, p_applicant_type: type!, p_business_name: business!, p_contact_name: contact!, p_email: email!, p_phone: phone!,
    p_address: str(fd, "address", 200) ?? "", p_city: city!, p_cars_available: int(fd, "cars_available", 0, 10000) as number,
    p_message: str(fd, "message", 2000) ?? "", p_founding_interest: bool(fd, "founding"), p_privacy_accepted: true,
    p_landing: landing(str(fd, "landing", 200)) ?? undefined, p_utm_source: utm(str(fd, "utm_source", 80)) ?? undefined,
    p_utm_medium: utm(str(fd, "utm_medium", 80)) ?? undefined, p_utm_campaign: utm(str(fd, "utm_campaign", 80)) ?? undefined,
    p_website: str(fd, "website", 200) ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error), undefined, values(fd));
  return ok("Candidatura ricevuta. Il team AutoGarage24 la esaminerà e ti contatterà ai recapiti indicati.");
}

export async function joinBeta(_p: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 254)?.toLowerCase() ?? null;
  const audience = str(fd, "audience", 20) ?? "altro";
  if (!email || !EMAIL.test(email)) return fail("Email non valida.", { email: "Email non valida." });
  if (!(audience in BETA_AUDIENCES)) return fail("Scegli un'opzione.");
  if (!bool(fd, "privacy")) return fail("Serve la presa visione dell'informativa.", { privacy: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_beta", {
    p_email: email, p_audience: audience, p_city: str(fd, "city", 80) ?? "", p_privacy_accepted: true,
    p_landing: landing(str(fd, "landing", 200)) ?? undefined, p_utm_source: utm(str(fd, "utm_source", 80)) ?? undefined,
    p_utm_medium: utm(str(fd, "utm_medium", 80)) ?? undefined, p_utm_campaign: utm(str(fd, "utm_campaign", 80)) ?? undefined,
    p_website: str(fd, "website", 200) ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  return ok("Iscrizione registrata. Ti scriveremo quando la Beta sarà disponibile per te.");
}
