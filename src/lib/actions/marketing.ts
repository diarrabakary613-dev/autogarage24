"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AUDIENCES, CHANNELS, MARKETING_STATUSES, CAMPAIGN_AUDIENCES } from "@/lib/marketing/brief";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, num, ok, str } from "./helpers";

const P = "/admin/marketing";
const date = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const cents = (fd: FormData, k: string) => { const n = num(fd, k, 0, 1_000_000_000); return n === null ? null : Math.round(n * 100); };
type MStatus = Enums<"marketing_status">;
const status = (fd: FormData): MStatus => { const s = str(fd, "status", 20); return (s && s in MARKETING_STATUSES ? s : "bozza") as MStatus; };

/** "Pubblicato" richiede la data e (per i contenuti) il link reale: non si dichiara pubblicato ciò che non lo è. */
function publishedFields(fd: FormData, st: MStatus, needsUrl: boolean): { ok: true; fields: { published_at: string | null; published_url?: string | null } } | { ok: false; error: string } {
  if (st !== "pubblicato") return { ok: true, fields: { published_at: null } };
  const at = date(str(fd, "published_on", 10));
  const url = str(fd, "published_url", 500);
  if (!at) return { ok: false, error: "Per segnare come pubblicato indica la data reale di pubblicazione." };
  if (needsUrl && (!url || !/^https:\/\//.test(url))) return { ok: false, error: "Per segnare come pubblicato inserisci il link al contenuto pubblicato." };
  return { ok: true, fields: { published_at: new Date(`${at}T12:00:00Z`).toISOString(), ...(needsUrl ? { published_url: url } : {}) } };
}

export async function saveCampaign(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("marketing.manage", P);
  const name = str(fd, "name", 140);
  const audience = str(fd, "audience", 20);
  if (!name || name.length < 3) return fail("Indica il nome della campagna.", { name: "Obbligatorio." });
  if (!audience || !(audience in CAMPAIGN_AUDIENCES)) return fail("Scegli il pubblico.");
  const promoRaw = str(fd, "promo_code", 30)?.toUpperCase() ?? null;
  if (promoRaw && !/^[A-Z0-9-]{4,30}$/.test(promoRaw)) return fail("Codice promo non valido.", { promo_code: "4–30 caratteri: lettere, numeri e trattini." });
  const st = status(fd);
  const pub = publishedFields(fd, st, false);
  if (!pub.ok) return fail(pub.error);
  const utmRaw = str(fd, "utm_campaign", 60);
  const utm = utmRaw ? utmRaw.toLowerCase().replace(/[^a-z0-9_-]/g, "-") : null;
  const channels = fd.getAll("channels").filter((c): c is string => typeof c === "string" && c in CHANNELS);
  const row = {
    name, audience, objective: str(fd, "objective", 500), channels, landing_path: str(fd, "landing_path", 200),
    utm_campaign: utm, start_on: date(str(fd, "start_on", 10)), end_on: date(str(fd, "end_on", 10)),
    budget_planned_cents: cents(fd, "budget_planned"), notes: str(fd, "notes", 4000), status: st, published_at: pub.fields.published_at,
    target: fd.get("target") === "partner" ? "partner" : "utenti", promo_code: promoRaw,
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  if (id && isUuid(id)) {
    const { error } = await supabase.from("marketing_campaigns").update(row).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
    revalidatePath(P, "layout");
    return ok("Campagna salvata.");
  }
  const { data, error } = await supabase.from("marketing_campaigns").insert(row).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  redirect(`${P}/campagne?id=${data.id}`);
}

export async function saveMarketingItem(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("marketing.manage", P);
  const title = str(fd, "title", 160);
  const kind = str(fd, "kind", 20) ?? "creativita";
  if (!title || title.length < 3) return fail("Indica un titolo.", { title: "Obbligatorio." });
  if (!["creativita", "contenuto_social", "video", "materiale", "landing", "brief"].includes(kind)) return fail("Tipo non valido.");
  const st = status(fd);
  const pub = publishedFields(fd, st, true);
  if (!pub.ok) return fail(pub.error);
  const plannedDate = date(str(fd, "planned_on", 10));
  const plannedTime = str(fd, "planned_time", 5);
  const planned = plannedDate ? new Date(`${plannedDate}T${plannedTime && /^\d{2}:\d{2}$/.test(plannedTime) ? plannedTime : "09:00"}:00+01:00`).toISOString() : null;
  const camp = str(fd, "campaign_id", 40);
  const audience = str(fd, "audience", 20);
  const channel = str(fd, "channel", 20);
  const assetUrl = str(fd, "asset_url", 500);
  let variants: unknown = [];
  try { variants = JSON.parse(str(fd, "variants", 8000) ?? "[]"); } catch { variants = []; }
  const row = {
    kind, title, campaign_id: camp && isUuid(camp) ? camp : null, audience: audience && audience in AUDIENCES ? audience : null,
    service: str(fd, "service", 60), objective: str(fd, "objective", 60), channel: channel && channel in CHANNELS ? channel : null,
    format: str(fd, "format", 40), tone: str(fd, "tone", 40), planned_at: planned, duration_seconds: int(fd, "duration_seconds", 1, 3600),
    hook: str(fd, "hook", 300), headline: str(fd, "headline", 200), body: str(fd, "body", 8000), cta: str(fd, "cta", 120),
    visual_brief: str(fd, "visual_brief", 4000), generation_prompt: str(fd, "generation_prompt", 4000),
    variants: Array.isArray(variants) ? variants.slice(0, 10) : [],
    asset_url: assetUrl && /^(https:\/\/|\/)/.test(assetUrl) ? assetUrl : null, asset_origin: str(fd, "asset_origin", 30),
    asset_rights_note: str(fd, "asset_rights_note", 500), notes: str(fd, "notes", 4000), status: st, ...pub.fields,
  };
  if (row.asset_url && !row.asset_origin) return fail("Indica l'origine dell'asset e i diritti d'uso.", { asset_origin: "Obbligatorio con un asset." });
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  if (id && isUuid(id)) {
    const { error } = await supabase.from("marketing_items").update(row as never).eq("id", id);
    if (error) return fail(dbErrorMessage(error));
    revalidatePath(P, "layout");
    return ok("Contenuto salvato.");
  }
  const { data, error } = await supabase.from("marketing_items").insert(row as never).select("id").single();
  if (error) return fail(dbErrorMessage(error));
  redirect(`${P}/contenuti?id=${(data as { id: string }).id}`);
}

export async function setMarketingStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("marketing.manage", P);
  const id = str(fd, "id", 40);
  const table = str(fd, "table", 30) === "campagna" ? "marketing_campaigns" : "marketing_items";
  const st = status(fd);
  if (!id || !isUuid(id)) return fail("Elemento non valido.");
  if (st === "pubblicato") return fail("Per segnare come pubblicato apri la scheda e inserisci data e link reali.");
  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ status: st }).eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P, "layout");
  return ok(`Stato: ${MARKETING_STATUSES[st]}.`);
}

export async function deleteMarketingRow(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("marketing.manage", P);
  const id = str(fd, "id", 40);
  const t = str(fd, "table", 30);
  const table = t === "campagna" ? "marketing_campaigns" : t === "esperimento" ? "growth_experiments" : t === "budget" ? "ad_budget_entries" : "marketing_items";
  if (!id || !isUuid(id)) return fail("Elemento non valido.");
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(P, "layout");
  return ok("Eliminato.");
}

export async function saveExperiment(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("marketing.manage", P);
  const title = str(fd, "title", 160);
  const hypothesis = str(fd, "hypothesis", 1000);
  const change = str(fd, "change_description", 1000);
  const metric = str(fd, "metric", 120);
  const a = str(fd, "variant_a", 500);
  const b = str(fd, "variant_b", 500);
  if (!title || !hypothesis || hypothesis.length < 10 || !change || !metric || !a || !b) return fail("Compila titolo, ipotesi (almeno 10 caratteri), modifica, metrica e le due varianti.");
  const st = str(fd, "status", 20) ?? "pianificato";
  const decision = str(fd, "decision", 20) ?? "nessuna";
  const camp = str(fd, "campaign_id", 40);
  const row = {
    title, hypothesis, change_description: change, metric, variant_a: a, variant_b: b, audience: str(fd, "audience", 60),
    campaign_id: camp && isUuid(camp) ? camp : null, start_on: date(str(fd, "start_on", 10)), end_on: date(str(fd, "end_on", 10)),
    sample_a: int(fd, "sample_a", 0), sample_b: int(fd, "sample_b", 0), conversions_a: int(fd, "conversions_a", 0), conversions_b: int(fd, "conversions_b", 0),
    status: ["pianificato", "in_corso", "concluso", "annullato"].includes(st) ? st : "pianificato",
    decision: ["nessuna", "adotta_a", "adotta_b", "ripeti", "abbandona"].includes(decision) ? decision : "nessuna",
    result_notes: str(fd, "result_notes", 2000),
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  const { error } = id && isUuid(id) ? await supabase.from("growth_experiments").update(row).eq("id", id) : await supabase.from("growth_experiments").insert(row);
  if (error) {
    if (error.code === "23514" && /min_sample/.test(error.message)) return fail("Per scegliere una variante vincente servono almeno 100 osservazioni (visite) per ciascuna variante.");
    return fail(dbErrorMessage(error));
  }
  revalidatePath(`${P}/esperimenti`);
  return ok("Esperimento salvato.");
}

export async function saveBudgetEntry(_p: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePermission("marketing.manage", P);
  const platform = str(fd, "platform", 20);
  const start = date(str(fd, "period_start", 10));
  const end = date(str(fd, "period_end", 10));
  const planned = cents(fd, "planned");
  if (!platform || !start || !end || planned === null) return fail("Indica piattaforma, periodo e budget previsto.");
  const approve = fd.get("founder_approved") === "on";
  if (approve && !me.roles.includes("super_admin")) return fail("Solo il fondatore (Super Admin) può approvare una spesa.");
  const camp = str(fd, "campaign_id", 40);
  const row = {
    platform, period_start: start, period_end: end, planned_cents: planned, actual_cents: cents(fd, "actual"),
    impressions: int(fd, "impressions", 0), clicks: int(fd, "clicks", 0), leads: int(fd, "leads", 0),
    campaign_id: camp && isUuid(camp) ? camp : null, notes: str(fd, "notes", 2000), founder_approved: approve,
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  const { error } = id && isUuid(id) ? await supabase.from("ad_budget_entries").update(row).eq("id", id) : await supabase.from("ad_budget_entries").insert(row);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`${P}/budget`);
  return ok("Voce di budget salvata. Nessuna spesa viene effettuata dalla piattaforma.");
}
