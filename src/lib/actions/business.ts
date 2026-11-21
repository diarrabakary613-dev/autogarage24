"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { romeLocalToIso } from "@/lib/bookings/time";
import { BUSINESS_COOKIE, LEAD_SOURCES, LEAD_STATUS, MEMBER_ROLES, PERMISSIONS } from "@/lib/business/context";
import type { FormState } from "@/lib/validation/form-state";
import { bool, dbErrorMessage, fail, int, isUuid, many, ok, str } from "./helpers";

export async function selectBusiness(fd: FormData): Promise<void> {
  await requireUser("/business");
  const id = str(fd, "profile_id", 40);
  if (id && isUuid(id)) (await cookies()).set(BUSINESS_COOKIE, id, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 60 * 60 * 24 * 180 });
  redirect(str(fd, "back", 200)?.startsWith("/business") ? str(fd, "back", 200)! : "/business");
}

export async function setLeadStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/lead");
  const pid = str(fd, "profile_id", 40), source = str(fd, "source", 20), id = str(fd, "source_id", 40), status = str(fd, "status", 30), assigned = str(fd, "assigned_to", 40);
  if (!pid || !isUuid(pid) || !source || !(source in LEAD_SOURCES) || !id || !isUuid(id) || !status || !(status in LEAD_STATUS)) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_lead_status", { profile_id: pid, source, source_id: id, status, assigned_to: assigned && isUuid(assigned) ? assigned : undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/lead");
  return ok("Contatto aggiornato.");
}

export async function addLeadNote(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/lead");
  const pid = str(fd, "profile_id", 40), source = str(fd, "source", 20), id = str(fd, "source_id", 40), body = str(fd, "body", 2000);
  if (!pid || !isUuid(pid) || !source || !id || !isUuid(id)) return fail("Dati non validi.");
  if (!body) return fail("Scrivi la nota.", { body: "Obbligatoria." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_lead_note", { profile_id: pid, source, source_id: id, body });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/lead/dettaglio");
  return ok("Nota interna salvata (non visibile al cliente).");
}

const KINDS = ["rispondere", "richiamare", "preventivo", "confermare_appuntamento", "aggiornare_annuncio", "rispondere_recensione", "altro"];
export async function saveTask(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/attivita");
  const pid = str(fd, "profile_id", 40), id = str(fd, "id", 40), title = str(fd, "title", 160);
  if (!pid || !isUuid(pid)) return fail("Azienda non valida.");
  if (!title || title.length < 2) return fail("Indica il titolo.", { title: "Obbligatorio." });
  const kind = str(fd, "kind", 30), prio = str(fd, "priority", 10), assigned = str(fd, "assigned_to", 40), due = romeLocalToIso(str(fd, "due_at", 20));
  const src = str(fd, "lead_source", 20), lid = str(fd, "lead_id", 40);
  const row = { title, description: str(fd, "description", 2000), kind: kind && KINDS.includes(kind) ? kind : "altro", priority: prio && ["bassa", "media", "alta"].includes(prio) ? prio : "media",
    due_at: due, assigned_to: assigned && isUuid(assigned) ? assigned : null, lead_source: src && src in LEAD_SOURCES ? src : null, lead_id: lid && isUuid(lid) ? lid : null };
  const supabase = await createClient();
  const { error } = id && isUuid(id) ? await supabase.from("business_tasks").update(row).eq("id", id) : await supabase.from("business_tasks").insert({ profile_id: pid, ...row });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/attivita");
  return ok("Attività salvata.");
}

export async function setTaskStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/attivita");
  const id = str(fd, "id", 40), st = str(fd, "status", 20);
  if (!id || !isUuid(id) || !st || !["aperta", "completata", "annullata"].includes(st)) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.from("business_tasks").update({ status: st }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/attivita");
  return ok(st === "completata" ? "Attività completata." : "Attività aggiornata.");
}

export async function inviteMember(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/team");
  const pid = str(fd, "profile_id", 40), email = str(fd, "email", 200), role = str(fd, "role", 20);
  if (!pid || !isUuid(pid)) return fail("Azienda non valida.");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Email non valida.", { email: "Email non valida." });
  if (!role || !(role in MEMBER_ROLES)) return fail("Scegli il ruolo.");
  const perms = many(fd, "permissions", Object.keys(PERMISSIONS));
  const supabase = await createClient();
  const { error } = await supabase.rpc("invite_business_member", { profile_id: pid, email, role, permissions: perms.length ? perms : undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/team");
  return ok("Invito creato. Se la persona ha già un account riceve una notifica; altrimenti dopo la registrazione con questa email troverà l'invito nel Business Center.");
}

export async function acceptInvite(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/team");
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Invito non valido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_business_invite", { member_id: id });
  if (error) return fail(dbErrorMessage(error));
  redirect("/business");
}

export async function updateMember(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/team");
  const id = str(fd, "id", 40), role = str(fd, "role", 20);
  if (!id || !isUuid(id)) return fail("Collaboratore non valido.");
  const revoke = bool(fd, "revoke");
  const perms = many(fd, "permissions", Object.keys(PERMISSIONS));
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_business_member", { member_id: id, role: role && role in MEMBER_ROLES ? role : undefined, permissions: revoke ? undefined : perms, revoke });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/team");
  return ok(revoke ? "Accesso revocato." : "Permessi aggiornati.");
}

export async function businessRespond(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/business/prenotazioni");
  const pid = str(fd, "profile_id", 40), src = str(fd, "source", 20), id = str(fd, "id", 40), action = str(fd, "action", 30);
  if (!pid || !isUuid(pid) || !id || !isUuid(id) || !action) return fail("Dati non validi.");
  const when = action === "proponi" ? romeLocalToIso(str(fd, "new_starts_at", 20)) : null;
  if (action === "proponi" && !when) return fail("Indica data e ora.");
  const supabase = await createClient();
  const note = str(fd, "note", 500) ?? undefined;
  const { error } = src === "revisione"
    ? await supabase.rpc("business_respond_inspection", { profile_id: pid, appointment_id: id, action, new_starts_at: when ?? undefined, note, outcome: str(fd, "outcome", 20) ?? undefined, mileage_km: int(fd, "mileage_km", 0, 2000000) ?? undefined })
    : await supabase.rpc("business_respond_booking", { profile_id: pid, booking_id: id, action, new_starts_at: when ?? undefined, note });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/business/prenotazioni");
  return ok("Aggiornato. Il cliente riceve una notifica.");
}

export async function adminAssignPlan(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("business.manage", "/admin/business");
  const pid = str(fd, "profile_id", 40), plan = str(fd, "plan_code", 30);
  if (!pid || !isUuid(pid) || !plan) return fail("Dati non validi.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_assign_plan", { profile_id: pid, plan_code: plan, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/business");
  return ok("Piano assegnato.");
}

export async function adminSetPlanLimits(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("business.manage", "/admin/business");
  const plan = str(fd, "plan_code", 30);
  if (!plan) return fail("Piano non valido.");
  const opt = (k: string) => { const v = str(fd, k, 10); return v === null ? null : Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : null; };
  const limits = { max_vehicle_listings: opt("max_vehicle_listings"), max_part_listings: opt("max_part_listings"), max_members: opt("max_members") ?? 0, max_active_offers: opt("max_active_offers"),
    analytics_days: Math.min(Math.max(opt("analytics_days") ?? 90, 7), 3650), exports_enabled: bool(fd, "exports_enabled"), promo_visibility: bool(fd, "promo_visibility"), advanced_features: bool(fd, "advanced_features") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_plan_limits", { plan_code: plan, limits });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/admin/business");
  return ok("Limiti aggiornati (vuoto = illimitato).");
}
