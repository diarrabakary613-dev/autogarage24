"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATION_CATEGORY_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, isUuid, ok, str } from "./helpers";

export async function conversationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/messaggi");
  const id = str(fd, "conversation_id", 40);
  const action = str(fd, "action", 20);
  if (!id || !isUuid(id)) return fail("Conversazione non valida.");
  const supabase = await createClient();
  let error;
  if (action === "archivia" || action === "riattiva") ({ error } = await supabase.rpc("set_conversation_archived", { conversation_id: id, archived: action === "archivia" }));
  else if (action === "chiudi") ({ error } = await supabase.rpc("close_conversation", { conversation_id: id }));
  else return fail("Operazione non valida.");
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/messaggi");
  revalidatePath(`/dashboard/messaggi/${id}`);
  return ok(action === "archivia" ? "Conversazione archiviata." : action === "riattiva" ? "Conversazione riportata tra quelle attive." : "Conversazione chiusa: la cronologia resta consultabile.");
}

/** Blocco di un utente: da quel momento non può inviarti messaggi (e viceversa). */
export async function blockUser(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/messaggi");
  const other = str(fd, "user_id", 40);
  const conv = str(fd, "conversation_id", 40);
  if (!other || !isUuid(other) || other === user.id) return fail("Utente non valido.");
  const supabase = await createClient();
  const unblock = str(fd, "unblock", 2) === "1";
  const { error } = unblock
    ? await supabase.from("user_blocks").delete().eq("blocker_id", user.id).eq("blocked_id", other)
    : await supabase.from("user_blocks").insert({ blocker_id: user.id, blocked_id: other });
  if (error && error.code !== "23505") return fail(dbErrorMessage(error));
  if (conv) revalidatePath(`/dashboard/messaggi/${conv}`);
  return ok(unblock ? "Utente sbloccato." : "Utente bloccato: non potrà più scriverti. Se c'è un problema serio, segnalalo al team.");
}

export async function markNotifications(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/notifiche");
  const id = str(fd, "notification_id", 40);
  const action = str(fd, "action", 20);
  const supabase = await createClient();
  const now = new Date().toISOString();
  let error;
  if (action === "tutte_lette") ({ error } = await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null));
  else if (id && isUuid(id) && action === "letta") ({ error } = await supabase.from("notifications").update({ read_at: now }).eq("id", id));
  else if (id && isUuid(id) && action === "archivia") ({ error } = await supabase.from("notifications").update({ archived_at: now, read_at: now }).eq("id", id));
  else if (id && isUuid(id) && action === "elimina") ({ error } = await supabase.from("notifications").delete().eq("id", id));
  else return fail("Operazione non valida.");
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/notifiche");
  revalidatePath("/dashboard", "layout");
  return ok("Notifiche aggiornate.");
}

/** Apre una notifica: la segna letta e porta all'elemento collegato (solo percorsi interni). */
export async function openNotification(fd: FormData) {
  await requireUser("/dashboard/notifiche");
  const id = str(fd, "notification_id", 40);
  const supabase = await createClient();
  if (!id || !isUuid(id)) redirect("/dashboard/notifiche");
  const { data } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id).select("link").maybeSingle();
  const link = data?.link && data.link.startsWith("/") && !data.link.startsWith("//") ? data.link : "/dashboard/notifiche";
  redirect(link);
}

const CATEGORIES = Object.keys(NOTIFICATION_CATEGORY_LABELS);
/** Le comunicazioni di servizio sull'account restano sempre attive in-app. */
export async function saveNotificationPreferences(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/impostazioni/notifiche");
  const inApp: Record<string, boolean> = {};
  const email: Record<string, boolean> = {};
  for (const c of CATEGORIES) {
    inApp[c] = c === "account" || c === "amministrazione" ? true : fd.get(`app_${c}`) === "on";
    email[c] = fd.get(`mail_${c}`) === "on";
  }
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({ user_id: user.id, in_app: inApp, email });
  if (error) return fail(dbErrorMessage(error));
  // Consenso promozionale separato dalle comunicazioni di servizio.
  const marketing = fd.get("marketing") === "on";
  const { error: pe } = await supabase.from("profiles").update({ marketing_consent: marketing }).eq("id", user.id);
  if (pe) return fail(dbErrorMessage(pe));
  revalidatePath("/dashboard/impostazioni/notifiche");
  return ok("Preferenze salvate.");
}

const TICKET_CATS = ["account", "annunci", "acquisto_vendita", "officine", "meccanici", "ricambi", "funzionamento", "privacy", "segnalazioni", "reclamo", "partner", "altro"];

export async function openTicket(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser("/dashboard/supporto");
  const category = str(fd, "category", 30);
  const subject = str(fd, "subject", 160);
  const message = str(fd, "message", 4000);
  const errors: Record<string, string> = {};
  if (!category || !TICKET_CATS.includes(category)) errors.category = "Scegli una categoria.";
  if (!subject || subject.length < 3) errors.subject = "Indica l'oggetto.";
  if (!message || message.length < 10) errors.message = "Descrivi il problema (almeno 10 caratteri).";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_support_ticket", { category: category!, subject: subject!, message: message! });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/supporto");
  const { data: t } = await supabase.from("support_tickets").select("conversation_id").eq("id", data).maybeSingle();
  return { status: "success", message: "Richiesta di assistenza aperta. Ti risponderemo nella conversazione collegata.", values: { conversation_id: t?.conversation_id ?? "" } };
}
