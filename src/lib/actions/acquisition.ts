"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { CRM_STATUS_KEYS, type CrmStatus } from "@/lib/crm";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, isUuid, ok, str } from "./helpers";

const P = "/admin/acquisizione";

/** Sposta un contatto nella pipeline (pulsanti avanti/indietro o scelta diretta). */
export async function moveContact(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("acquisition.manage", P);
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 30) as CrmStatus | null;
  if (!id || !isUuid(id) || !status || !CRM_STATUS_KEYS.includes(status)) return fail("Dati non validi.");
  const reason = str(fd, "lost_reason", 500);
  if (status === "non_interessato" && !reason) return fail("Indica il motivo (resta nello storico).", { lost_reason: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.from("field_contacts").update({ status, lost_reason: reason }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Stato aggiornato.");
}

export async function assignContact(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePermission("acquisition.manage", P);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Contatto non valido.");
  const supabase = await createClient();
  const { error } = await supabase.from("field_contacts").update({ assigned_to: fd.get("unassign") ? null : me.id }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Assegnazione aggiornata.");
}

export async function reviewApplication(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("acquisition.manage", P);
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 20);
  if (!id || !isUuid(id) || !status) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_application", { application_id: id, new_status: status, note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Candidatura aggiornata.");
}

export async function setFoundingPartner(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("acquisition.manage", P);
  const contact = str(fd, "contact_id", 40);
  if (!contact || !isUuid(contact)) return fail("Contatto non valido.");
  const admit = str(fd, "admit", 5) === "1";
  const supabase = await createClient();
  let profileId: string | null = null;
  const slug = str(fd, "profile_slug", 160);
  if (slug) {
    const { data } = await supabase.from("professional_profiles").select("id").eq("slug", slug.replace(/^.*\//, "")).maybeSingle();
    if (!data) return fail("Profilo pubblico non trovato: controlla l'indirizzo.", { profile_slug: "Non trovato." });
    profileId = data.id;
  }
  const { error } = await supabase.rpc("admin_set_founding_partner", { contact_id: contact, profile_id: profileId as string, admit, note: str(fd, "note", 2000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok(admit ? "Partner ammesso al programma Founding Partners." : "Ammissione revocata.");
}

export async function updateBetaSignup(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("acquisition.manage", P);
  const id = str(fd, "id", 40);
  const status = str(fd, "status", 20);
  if (!id || !isUuid(id) || !status || !["iscritto", "invitato", "attivo", "annullato"].includes(status)) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.from("beta_signups").update({ status, ...(status === "invitato" ? { invited_at: new Date().toISOString() } : {}) }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P);
  return ok("Iscrizione aggiornata. Ricorda: l'invito va inviato da te, la piattaforma non invia email automatiche.");
}
