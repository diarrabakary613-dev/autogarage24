"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AUDIENCES, buildSegment, LP_SECTIONS, safeInternalPath } from "@/lib/growth/labels";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, int, isUuid, ok, oneOf, str } from "./helpers";

const G = "/admin/growth";

export async function saveLanding(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const e: Record<string, string> = {};
  const slug = str(fd, "slug", 60)?.toLowerCase();
  const title = str(fd, "title", 70);
  const headline = str(fd, "headline", 120);
  const cta_label = str(fd, "cta_label", 40);
  const cta_path = safeInternalPath(str(fd, "cta_path", 200));
  const vb = str(fd, "variant_b_headline", 120);
  const vbc = str(fd, "variant_b_cta_label", 40);
  const experiment = fd.get("experiment_active") === "on";
  if (!slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3) e.slug = "Solo lettere minuscole, numeri e trattini (min. 3).";
  if (!title || title.length < 5) e.title = "Da 5 a 70 caratteri.";
  if (!headline || headline.length < 5) e.headline = "Almeno 5 caratteri.";
  if (!cta_label || cta_label.length < 2) e.cta_label = "Obbligatorio.";
  if (!cta_path) e.cta_path = "Percorso interno, es. /registrati o /auto-per-neopatentati.";
  if (experiment && !vb && !vbc) e.variant_b_headline = "Per l'esperimento serve almeno un elemento della variante B.";
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const campaign = str(fd, "campaign_id", 40);
  const row = {
    slug: slug!, title: title!, headline: headline!, cta_label: cta_label!, cta_path: cta_path!,
    meta_description: str(fd, "meta_description", 160), subheadline: str(fd, "subheadline", 300), body: str(fd, "body", 4000),
    bullets: (str(fd, "bullets", 2000) ?? "").split("\n").map((b) => b.trim()).filter(Boolean).slice(0, 8),
    audience: oneOf(fd, "audience", Object.keys(AUDIENCES) as (keyof typeof AUDIENCES)[]) ?? "generale",
    section: oneOf(fd, "section", Object.keys(LP_SECTIONS) as (keyof typeof LP_SECTIONS)[]) ?? "nessuna",
    variant_b_headline: vb, variant_b_cta_label: vbc, experiment_active: experiment,
    campaign_id: campaign && isUuid(campaign) ? campaign : null, indexable: fd.get("indexable") === "on",
    status: oneOf(fd, "status", ["bozza", "pubblicata", "archiviata"] as const) ?? "bozza",
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  const { error } = id && isUuid(id) ? await supabase.from("landing_pages").update(row).eq("id", id) : await supabase.from("landing_pages").insert(row);
  if (error) return fail(error.code === "23505" ? "Esiste già una landing con questo indirizzo." : dbErrorMessage(error));
  revalidatePath(G);
  if (!id) redirect(`${G}?tab=landing&salvata=1`);
  return ok(row.status === "pubblicata" ? `Landing pubblicata su /lp/${row.slug}.` : "Landing salvata.");
}

export async function saveMessage(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const e: Record<string, string> = {};
  const subject = str(fd, "subject", 120);
  const body = str(fd, "body", 4000);
  const channels = ["email", "in_app"].filter((c) => fd.get(`ch_${c}`) === "on");
  const cta = str(fd, "cta_path", 200);
  if (!subject || subject.length < 5) e.subject = "Da 5 a 120 caratteri.";
  if (!body || body.length < 20) e.body = "Almeno 20 caratteri.";
  if (!channels.length) e.channels = "Scegli almeno un canale.";
  if (cta && !safeInternalPath(cta)) e.cta_path = "Percorso interno, es. /offerte.";
  if (Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const segment = buildSegment({ citta: str(fd, "citta", 80), ruolo: str(fd, "ruolo", 30), inattivi: int(fd, "inattivi", 1, 999), registrati: int(fd, "registrati", 1, 999), campagna: str(fd, "campagna", 80) });
  const campaign = str(fd, "campaign_id", 40);
  const row = {
    subject: subject!, body: body!, channels, segment, cta_path: safeInternalPath(cta), cta_label: str(fd, "cta_label", 40),
    campaign_id: campaign && isUuid(campaign) ? campaign : null, status: fd.get("submit") === "1" ? "da_approvare" : "bozza",
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  const { error } = id && isUuid(id) ? await supabase.from("marketing_messages").update(row).eq("id", id) : await supabase.from("marketing_messages").insert(row);
  if (error) return fail(error.code === "42501" ? error.message : dbErrorMessage(error));
  revalidatePath(G);
  if (!id) redirect(`${G}?tab=email&salvato=1`);
  return ok(row.status === "da_approvare" ? "Inviato al fondatore per l'approvazione." : "Bozza salvata.");
}

export async function approveMessage(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_approve_marketing_message", { message_id: id });
  if (error) return fail(["42501", "22023"].includes(error.code ?? "") ? error.message : dbErrorMessage(error));
  revalidatePath(G);
  return ok("Messaggio approvato. L'invio resta un'azione separata.");
}

export async function sendMessage(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_send_marketing_message", { message_id: id });
  if (error) return fail(["42501", "22023"].includes(error.code ?? "") ? error.message : dbErrorMessage(error));
  revalidatePath(G);
  const r = (data ?? {}) as { email_in_coda?: number; esclusi?: number };
  return ok(`Fatto: ${r.email_in_coda ?? 0} email in coda, ${r.esclusi ?? 0} persone escluse (consenso, preferenze o limite). Le email partono solo con un provider configurato.`);
}

export async function cancelMessage(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_messages").update({ status: "annullato" }).eq("id", id);
  if (error) return fail(error.code === "42501" ? error.message : dbErrorMessage(error));
  revalidatePath(G);
  return ok("Messaggio annullato.");
}

export async function saveWorkflow(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const key = str(fd, "key", 40);
  const title = str(fd, "title", 120);
  const body = str(fd, "body", 600);
  const link = safeInternalPath(str(fd, "link", 200));
  const delay = int(fd, "delay_days", 1, 365);
  const e: Record<string, string> = {};
  if (!title || title.length < 5) e.title = "Almeno 5 caratteri.";
  if (!body || body.length < 10) e.body = "Almeno 10 caratteri.";
  if (!link) e.link = "Percorso interno.";
  if (!delay) e.delay_days = "Da 1 a 365.";
  if (!key || Object.keys(e).length) return fail("Controlla i campi evidenziati.", e);
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_workflows").update({
    title: title!, body: body!, link: link!, delay_days: delay!, send_email: fd.get("send_email") === "on",
    max_per_user: int(fd, "max_per_user", 1, 5) ?? 1, cooldown_days: int(fd, "cooldown_days", 1, 365) ?? 30,
  }).eq("key", key);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(G);
  return ok("Automazione salvata. Se era attiva, va riattivata dal fondatore dopo le modifiche al testo.");
}

export async function toggleWorkflow(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("growth.manage", G);
  const key = str(fd, "key", 40);
  const on = fd.get("active") === "1";
  if (!key) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("marketing_workflows").update({ active: on }).eq("key", key);
  if (error) return fail(error.code === "42501" ? error.message : dbErrorMessage(error));
  revalidatePath(G);
  return ok(on ? "Automazione attivata." : "Automazione disattivata.");
}

export async function setWorkflowsSwitch(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requirePermission("growth.manage", G);
  const on = fd.get("enabled") === "1";
  if (on && !user.roles.includes("super_admin")) return fail("Solo il fondatore può accendere le automazioni.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_setting", { setting_key: "marketing_workflows_enabled", setting_value: on as never });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(G);
  return ok(on ? "Automazioni accese (partono solo quelle attive)." : "Tutte le automazioni sono ferme.");
}
