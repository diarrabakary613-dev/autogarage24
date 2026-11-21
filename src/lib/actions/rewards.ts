"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { BENEFIT_TYPES, ITEM_CATEGORIES } from "@/lib/rewards/labels";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, int, isUuid, ok, oneOf, str } from "./helpers";

const U = "/dashboard/rewards";
const PARTNER = "/dashboard/rewards/partner";
const ADMIN = "/admin/rewards";

// ---------------- Utente ----------------
export async function redeemReward(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(U);
  const item = str(fd, "item_id", 40);
  const key = str(fd, "idempotency_key", 80);
  if (!item || !isUuid(item) || !key || key.length < 8) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_reward", { item_id: item, idempotency_key: key });
  if (error) return fail(error.code === "22023" || error.code === "23505" || error.code === "42501" || error.code === "P0002" ? error.message : dbErrorMessage(error));
  revalidatePath(U);
  const r = data?.[0];
  return ok(r ? `Premio riscattato. Il tuo codice è ${r.code}: mostralo al partner.` : "Premio riscattato.");
}

export async function cancelMyRedemption(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(U);
  const id = str(fd, "id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reward_redemption", { redemption_id: id });
  if (error) return fail(error.code === "22023" ? error.message : dbErrorMessage(error));
  revalidatePath(U);
  return ok("Riscatto annullato: i punti sono tornati nel tuo saldo.");
}

export async function getReferralCode(): Promise<FormState> {
  await requireUser(U);
  const supabase = await createClient();
  const { error } = await supabase.rpc("my_referral_code");
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(U);
  return ok("Il tuo link di invito è pronto.");
}

// ---------------- Partner ----------------
export async function saveRewardItem(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(PARTNER);
  const profile = str(fd, "profile_id", 40);
  const errors: Record<string, string> = {};
  const title = str(fd, "title", 120);
  const description = str(fd, "description", 2000);
  const conditions = str(fd, "conditions", 2000);
  const category = oneOf(fd, "category", Object.keys(ITEM_CATEGORIES) as (keyof typeof ITEM_CATEGORIES)[]);
  const benefit = oneOf(fd, "benefit_type", Object.keys(BENEFIT_TYPES) as (keyof typeof BENEFIT_TYPES)[]);
  const value = int(fd, "benefit_value", 1, 100000);
  const cost = int(fd, "points_cost", 50, 1000000);
  const until = str(fd, "valid_until", 10);
  if (!profile || !isUuid(profile)) return fail("Profilo non valido.");
  if (!title || title.length < 5) errors.title = "Almeno 5 caratteri.";
  if (!description || description.length < 20) errors.description = "Almeno 20 caratteri.";
  if (!conditions || conditions.length < 10) errors.conditions = "Indica le condizioni (almeno 10 caratteri).";
  if (!category) errors.category = "Scegli una categoria.";
  if (!benefit) errors.benefit_type = "Scegli il tipo di premio.";
  if (benefit && benefit !== "servizio" && !value) errors.benefit_value = "Indica il valore dello sconto.";
  if (benefit === "percentuale" && value && value > 100) errors.benefit_value = "Massimo 100%.";
  if (!cost) errors.points_cost = "Da 50 a 1.000.000 punti.";
  if (!until || !/^\d{4}-\d{2}-\d{2}$/.test(until) || until < new Date().toISOString().slice(0, 10)) errors.valid_until = "Data futura obbligatoria.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const row = {
    title: title!, description: description!, conditions: conditions!, category: category!, benefit_type: benefit!,
    benefit_value: benefit === "servizio" ? null : value, points_cost: cost!, valid_until: until!,
    min_amount_cents: (() => { const v = int(fd, "min_amount", 1, 100000); return v ? v * 100 : null; })(),
    quantity_total: int(fd, "quantity_total", 1, 100000), per_user_limit: int(fd, "per_user_limit", 1, 20) ?? 1,
    voucher_days: int(fd, "voucher_days", 7, 365) ?? 60, min_tier: oneOf(fd, "min_tier", ["silver", "gold", "platinum"]),
    status: fd.get("submit") === "1" ? "in_revisione" : "bozza",
  };
  const supabase = await createClient();
  const id = str(fd, "id", 40);
  if (id && isUuid(id)) {
    const { error } = await supabase.from("reward_items").update(row).eq("id", id).eq("profile_id", profile);
    if (error) return fail(error.code === "42501" ? error.message : dbErrorMessage(error));
    revalidatePath(PARTNER);
    return ok(row.status === "in_revisione" ? "Premio inviato allo staff per l'approvazione." : "Premio salvato.");
  }
  const { error } = await supabase.from("reward_items").insert({ ...row, profile_id: profile });
  if (error) return fail(error.code === "42501" ? error.message : dbErrorMessage(error));
  redirect(`${PARTNER}?salvato=1`);
}

export async function setRewardItemStatus(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(PARTNER);
  const id = str(fd, "id", 40);
  const status = oneOf(fd, "status", ["bozza", "in_revisione", "sospeso"] as const);
  if (!id || !isUuid(id) || !status) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.from("reward_items").update({ status }).eq("id", id);
  if (error) return fail(error.code === "42501" ? error.message : dbErrorMessage(error));
  revalidatePath(PARTNER);
  return ok(status === "in_revisione" ? "Inviato in approvazione." : status === "sospeso" ? "Premio sospeso." : "Riportato in bozza.");
}

export async function consumeRewardCode(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(PARTNER);
  const code = str(fd, "code", 20)?.toUpperCase();
  if (!code || !/^RW-[A-Z0-9]{10}$/.test(code)) return fail("Codice non valido (formato RW-XXXXXXXXXX).");
  const supabase = await createClient();
  const { error } = await supabase.rpc("use_reward_code", { p_code: code });
  if (error) return fail(["23505", "22023", "P0002"].includes(error.code ?? "") ? error.message : dbErrorMessage(error));
  revalidatePath(PARTNER);
  return ok(`Codice ${code} segnato come utilizzato.`);
}

export async function partnerCancelRedemption(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser(PARTNER);
  const id = str(fd, "id", 40);
  const reason = str(fd, "reason", 500);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  if (!reason || reason.length < 5) return fail("Indica il motivo.", { reason: "Almeno 5 caratteri." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reward_redemption", { redemption_id: id, reason });
  if (error) return fail(error.code === "22023" ? error.message : dbErrorMessage(error));
  revalidatePath(PARTNER);
  return ok("Riscatto annullato: i punti sono stati restituiti al cliente.");
}

// ---------------- Staff ----------------
export async function adminSetRewardsEnabled(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const on = fd.get("enabled") === "1";
  if (on && fd.get("confirm_legal") !== "on") return fail("Conferma di aver completato le verifiche richieste.", { confirm_legal: "Obbligatorio per l'attivazione." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_setting", { setting_key: "rewards_enabled", setting_value: on as never });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok(on ? "Programma Rewards attivato." : "Programma Rewards disattivato: nessun nuovo punto né riscatto.");
}

export async function adminSaveRule(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const key = str(fd, "key", 40);
  const points = int(fd, "points", 0, 100000);
  if (!key || points === null) return fail("Valori non validi.", { points: "Da 0 a 100.000." });
  const max = int(fd, "max_per_user", 1, 1000);
  const supabase = await createClient();
  const { error } = await supabase.from("reward_rules").update({
    points, active: fd.get("active") === "on", tier_bonus: fd.get("tier_bonus") === "on", max_per_user: max,
    valid_from: str(fd, "valid_from", 10) || null, valid_to: str(fd, "valid_to", 10) || null, updated_by: (await requireUser(ADMIN)).id, updated_at: new Date().toISOString(),
  }).eq("key", key);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Regola aggiornata. Vale per i nuovi eventi, non modifica i punti già assegnati.");
}

export async function adminSaveTier(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const code = str(fd, "code", 20);
  const min = int(fd, "min_points", 0, 10000000);
  const bonus = int(fd, "bonus_pct", 0, 100);
  if (!code || min === null || bonus === null) return fail("Valori non validi.");
  const benefits = (str(fd, "benefits", 2000) ?? "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  const supabase = await createClient();
  const { error } = await supabase.from("reward_tiers").update({ min_points: code === "bronze" ? 0 : min, bonus_pct: bonus, benefits }).eq("code", code);
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Livello aggiornato.");
}

export async function adminReviewItem(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const id = str(fd, "id", 40);
  const decision = oneOf(fd, "decision", ["pubblicato", "rifiutato", "sospeso"] as const);
  if (!id || !isUuid(id) || !decision) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_reward_item", { item_id: id, decision, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(error.code === "22023" ? error.message : dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Decisione registrata.");
}

export async function adminAdjustPoints(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const email = str(fd, "email", 200)?.toLowerCase();
  const amount = Number(str(fd, "amount", 10));
  const reason = str(fd, "reason", 500);
  const errors: Record<string, string> = {};
  if (!email) errors.email = "Email obbligatoria.";
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) errors.amount = "Numero intero diverso da 0 (es. 50 o -50).";
  if (!reason || reason.length < 10) errors.reason = "Motivazione obbligatoria (almeno 10 caratteri).";
  if (Object.keys(errors).length) return fail("Controlla i campi.", errors);
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("id").eq("email", email!).maybeSingle();
  if (!p) return fail("Nessun utente con questa email.", { email: "Utente non trovato." });
  const { error } = await supabase.rpc("admin_adjust_points", { user_id: p.id, amount, reason: reason! });
  if (error) return fail(["22023", "42501"].includes(error.code ?? "") ? error.message : dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Rettifica registrata nel registro attività.");
}

export async function adminRevokePoints(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const id = int(fd, "ledger_id", 1);
  const reason = str(fd, "reason", 500);
  if (!id) return fail("Movimento non valido.");
  if (!reason || reason.length < 10) return fail("Motivazione obbligatoria (almeno 10 caratteri).", { reason: "Almeno 10 caratteri." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_revoke_points", { ledger_id: id, reason });
  if (error) return fail(["22023", "23505"].includes(error.code ?? "") ? error.message : dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Punti revocati.");
}

export async function adminCancelRedemption(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const id = str(fd, "id", 40);
  const reason = str(fd, "reason", 500);
  if (!id || !isUuid(id) || !reason || reason.length < 5) return fail("Indica il motivo.", { reason: "Almeno 5 caratteri." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_reward_redemption", { redemption_id: id, reason });
  if (error) return fail(error.code === "22023" ? error.message : dbErrorMessage(error));
  revalidatePath(ADMIN);
  return ok("Riscatto annullato e punti restituiti.");
}

export async function adminReviewReferral(_p: FormState, fd: FormData): Promise<FormState> {
  await requirePermission("rewards.manage", ADMIN);
  const id = str(fd, "id", 40);
  const decision = oneOf(fd, "decision", ["registrato", "respinto"] as const);
  const note = str(fd, "note", 500);
  if (!id || !isUuid(id) || !decision) return fail("Richiesta non valida.");
  if (!note || note.length < 5) return fail("Indica la motivazione.", { note: "Almeno 5 caratteri." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_referral", { referral_id: id, decision, note });
  if (error) return fail(error.message);
  revalidatePath(ADMIN);
  return ok(decision === "registrato" ? "Invito sbloccato: sarà premiato al primo servizio verificato." : "Invito respinto.");
}
