import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { TabLinks } from "@/components/ui/misc";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  adminAdjustPoints, adminCancelRedemption, adminReviewItem, adminReviewReferral, adminRevokePoints, adminSaveRule, adminSaveTier, adminSetRewardsEnabled,
} from "@/lib/actions/rewards";
import { benefitText, fmtPoints, FRAUD_SIGNALS, ITEM_STATUS, LEDGER_KIND, REDEMPTION_STATUS, REFERRAL_STATUS } from "@/lib/rewards/labels";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Rewards", robots: { index: false } };
const TABS = ["panoramica", "regole", "livelli", "premi", "riscatti", "referral", "rettifiche"] as const;

export default function AdminRewardsPage(props: PageProps<"/admin/rewards">) {
  return <AdminPage title="AutoGarage24 Rewards" description="Regole dei punti, livelli, approvazione dei premi dei partner, inviti e rettifiche. Ogni intervento manuale richiede una motivazione ed è registrato."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("rewards.manage", "/admin/rewards");
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as (typeof TABS)[number]) : "panoramica";
  const supabase = await createClient();
  const label: Record<(typeof TABS)[number], string> = { panoramica: "Panoramica", regole: "Regole punti", livelli: "Livelli", premi: "Catalogo premi", riscatti: "Riscatti", referral: "Inviti", rettifiche: "Rettifiche e revoche" };
  return (
    <>
      <TabLinks current={tab} items={TABS.map((t) => ({ key: t, label: label[t], href: t === "panoramica" ? "/admin/rewards" : `/admin/rewards?tab=${t}` }))} />
      {tab === "panoramica" && <Overview supabase={supabase} />}
      {tab === "regole" && <Rules supabase={supabase} />}
      {tab === "livelli" && <Tiers supabase={supabase} />}
      {tab === "premi" && <Items supabase={supabase} status={typeof sp.stato === "string" && sp.stato in ITEM_STATUS ? sp.stato : "in_revisione"} />}
      {tab === "riscatti" && <Redemptions supabase={supabase} />}
      {tab === "referral" && <Referrals supabase={supabase} />}
      {tab === "rettifiche" && <Adjust supabase={supabase} />}
    </>
  );
}
type SB = Awaited<ReturnType<typeof createClient>>;

async function Overview({ supabase }: { supabase: SB }) {
  const { data } = await supabase.rpc("admin_rewards_stats");
  const s = (data ?? {}) as Record<string, number | boolean | Record<string, number>>;
  const n = (k: string) => Number(s[k] ?? 0);
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="font-bold">Stato del programma: {s.enabled ? <Badge tone="success">Attivo</Badge> : <Badge>Disattivato</Badge>}</h2>
        {!s.enabled ? (
          <>
            <Alert tone="warning" className="mt-3">Prima di attivare: regolamento definitivo validato da un consulente, verifica della disciplina sulle manifestazioni a premio (DPR 430/2001: comunicazioni, cauzione, eventuali esclusioni), trattamento fiscale dei premi e accordi scritti con i partner che li erogano. AutoGarage24 non ha ancora completato queste verifiche.</Alert>
            <ActionForm action={adminSetRewardsEnabled} submitLabel="Attiva il programma" hidden={{ enabled: "1" }} confirm="Attivare l'assegnazione dei punti e i riscatti?" className="mt-3">
              {(state) => <Checkbox id="confirm_legal" name="confirm_legal" error={state.fieldErrors?.confirm_legal} label="Confermo che regolamento, verifiche fiscali/normative e accordi con i partner sono stati completati." />}
            </ActionForm>
          </>
        ) : <ActionForm action={adminSetRewardsEnabled} submitLabel="Disattiva il programma" variant="outline" hidden={{ enabled: "0" }} confirm="Sospendere nuovi punti e riscatti? Saldi e codici esistenti restano." className="mt-3" />}
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[["Punti assegnati", n("punti_assegnati")], ["Punti riscattati", n("punti_riscattati")], ["Punti in circolazione", n("punti_in_circolazione")], ["Partecipanti", n("partecipanti")],
          ["Premi pubblicati", n("premi_pubblicati")], ["Premi da approvare", n("premi_da_approvare")], ["Riscatti (utilizzati)", `${n("riscatti")} (${n("riscatti_utilizzati")})`], ["Inviti (in verifica)", `${n("inviti")} (${n("inviti_in_verifica")})`]]
          .map(([l, v]) => <Card key={String(l)} className="p-4"><p className="text-sm text-muted">{l}</p><p className="text-2xl font-bold">{typeof v === "number" ? new Intl.NumberFormat("it-IT").format(v) : v}</p></Card>)}
      </div>
      <Card className="p-5"><h2 className="font-bold">Punti assegnati per regola</h2>
        {Object.keys((s.per_regola as Record<string, number>) ?? {}).length === 0 ? <p className="mt-2 text-sm text-muted">Nessun punto assegnato.</p> :
          <ul className="mt-2 text-sm">{Object.entries(s.per_regola as Record<string, number>).map(([k, v]) => <li key={k}>{k}: {fmtPoints(v)}</li>)}</ul>}
      </Card>
    </div>
  );
}

async function Rules({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("reward_rules").select("*").order("key");
  return (
    <div className="flex flex-col gap-3">
      <Alert tone="info">Le regole valgono per gli eventi futuri. I punti si assegnano solo su conferme della controparte; non esistono regole per le recensioni.</Alert>
      {(data ?? []).map((r) => (
        <Card key={r.key} className="p-4">
          <p className="font-bold">{r.label} <span className="font-mono text-xs text-muted">{r.key}</span> {r.active ? <Badge tone="success">Attiva</Badge> : <Badge>Non attiva</Badge>}</p>
          <p className="text-sm text-muted">{r.description}</p>
          <ActionForm action={adminSaveRule} submitLabel="Salva" size="sm" hidden={{ key: r.key }} className="mt-2">
            {(state) => (
              <div className="grid gap-3 sm:grid-cols-5">
                <Field id={`p-${r.key}`} label="Punti" error={state.fieldErrors?.points}><Input id={`p-${r.key}`} name="points" type="number" min={0} defaultValue={r.points} /></Field>
                <Field id={`m-${r.key}`} label="Max per utente" optional><Input id={`m-${r.key}`} name="max_per_user" type="number" min={1} defaultValue={r.max_per_user ?? ""} /></Field>
                <Field id={`f-${r.key}`} label="Dal" optional><Input id={`f-${r.key}`} name="valid_from" type="date" defaultValue={r.valid_from?.slice(0, 10) ?? ""} /></Field>
                <Field id={`t-${r.key}`} label="Al" optional><Input id={`t-${r.key}`} name="valid_to" type="date" defaultValue={r.valid_to?.slice(0, 10) ?? ""} /></Field>
                <div className="flex flex-col justify-end gap-1 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={r.active} className="size-4 accent-orange" />Attiva</label>
                  <label className="flex items-center gap-2"><input type="checkbox" name="tier_bonus" defaultChecked={r.tier_bonus} className="size-4 accent-orange" />Bonus livello</label></div>
              </div>
            )}
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}

async function Tiers({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("reward_tiers").select("*").order("sort");
  return (
    <div className="grid gap-4 md:grid-cols-2">{(data ?? []).map((t) => (
      <Card key={t.code} className="p-4"><p className="font-bold">{t.name}</p>
        <ActionForm action={adminSaveTier} submitLabel="Salva" size="sm" hidden={{ code: t.code }} className="mt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`min-${t.code}`} label="Punti minimi (finestra)"><Input id={`min-${t.code}`} name="min_points" type="number" min={0} defaultValue={t.min_points} disabled={t.code === "bronze"} /></Field>
            <Field id={`b-${t.code}`} label="Bonus %"><Input id={`b-${t.code}`} name="bonus_pct" type="number" min={0} max={100} defaultValue={t.bonus_pct} /></Field>
            <Field id={`bn-${t.code}`} label="Vantaggi (uno per riga)" className="sm:col-span-2" optional><Textarea id={`bn-${t.code}`} name="benefits" rows={3} defaultValue={t.benefits.join("\n")} /></Field>
          </div>
        </ActionForm>
      </Card>
    ))}</div>
  );
}

async function Items({ supabase, status }: { supabase: SB; status: string }) {
  const { data } = await supabase.from("reward_items").select("*, professional_profiles(display_name, slug, review_status)").eq("status", status).order("updated_at").limit(100);
  return (
    <>
      <nav aria-label="Filtra per stato" className="mb-4 flex flex-wrap gap-2 text-sm">{Object.entries(ITEM_STATUS).map(([k, v]) => <Link key={k} href={`/admin/rewards?tab=premi&stato=${k}`} className={`rounded-full border px-3 py-1 ${k === status ? "border-ink bg-ink text-white" : "border-line-strong"}`}>{v}</Link>)}</nav>
      {!data?.length ? <EmptyState title="Nessun premio in questo stato" /> : (
        <ul className="flex flex-col gap-3">{data.map((i) => {
          const p = i.professional_profiles as unknown as { display_name: string; slug: string; review_status: string } | null;
          return (
            <li key={i.id}><Card className="p-4">
              <p className="font-bold">{i.title} · {fmtPoints(i.points_cost)}</p>
              <p className="text-sm">{benefitText(i.benefit_type, i.benefit_value)} · {p ? <Link className="underline" href={`/professionisti/${p.slug}`}>{p.display_name}</Link> : "—"} {p?.review_status !== "approvato" && <Badge tone="warning">Profilo non approvato</Badge>}</p>
              <p className="mt-1 text-sm text-muted">{i.description}</p>
              <p className="text-xs"><strong>Condizioni:</strong> {i.conditions} · fino al {formatDate(i.valid_until)} · quantità {i.quantity_total ?? "illimitata"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {i.status !== "pubblicato" && <ActionForm action={adminReviewItem} submitLabel="Approva e pubblica" size="sm" hidden={{ id: i.id, decision: "pubblicato" }} />}
                <ActionForm action={adminReviewItem} submitLabel={i.status === "pubblicato" ? "Sospendi" : "Rifiuta"} size="sm" variant="outline" hidden={{ id: i.id, decision: i.status === "pubblicato" ? "sospeso" : "rifiutato" }}>
                  <Field id={`n-${i.id}`} label="Motivazione per il partner"><Input id={`n-${i.id}`} name="note" required /></Field>
                </ActionForm>
              </div>
            </Card></li>
          );
        })}</ul>
      )}
    </>
  );
}

async function Redemptions({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("reward_redemptions").select("id, code, status, points_spent, valid_until, created_at, used_at, cancel_reason, reward_items(title), professional_profiles(display_name)").order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title="Nessun riscatto" />;
  return (
    <ul className="flex flex-col gap-2">{data.map((r) => (
      <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
        <span><span className="font-mono font-bold">{r.code}</span> · {(r.reward_items as unknown as { title: string } | null)?.title} · {(r.professional_profiles as unknown as { display_name: string } | null)?.display_name} · {fmtPoints(r.points_spent)} · {formatDateTime(r.created_at)}{r.cancel_reason ? ` · ${r.cancel_reason}` : ""}</span>
        <span className="flex items-center gap-2"><Badge>{REDEMPTION_STATUS[r.status as keyof typeof REDEMPTION_STATUS]}</Badge>
          {r.status === "emesso" && <ActionForm action={adminCancelRedemption} submitLabel="Annulla e rimborsa" size="sm" variant="ghost" hidden={{ id: r.id }}>
            {(state) => <Field id={`cr-${r.id}`} label="Motivo" error={state.fieldErrors?.reason}><Input id={`cr-${r.id}`} name="reason" required /></Field>}
          </ActionForm>}</span>
      </Card></li>
    ))}</ul>
  );
}

async function Referrals({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("referrals").select("*").order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title="Nessun invito registrato" />;
  const ids = [...new Set(data.flatMap((r) => [r.referrer_id, r.referred_id]))];
  const { data: people } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  const who = new Map((people ?? []).map((p) => [p.id, `${p.full_name ?? "—"} (${p.email ?? ""})`]));
  return (
    <ul className="flex flex-col gap-3">{data.map((r) => (
      <li key={r.id}><Card className="p-4 text-sm">
        <p><strong>{who.get(r.referrer_id)}</strong> ha invitato <strong>{who.get(r.referred_id)}</strong> · {r.program} · codice {r.code} · {formatDateTime(r.created_at)}</p>
        <p className="mt-1 flex flex-wrap items-center gap-2"><Badge tone={r.status === "in_verifica" ? "warning" : r.status === "premiato" ? "success" : "neutral"}>{REFERRAL_STATUS[r.status as keyof typeof REFERRAL_STATUS]}</Badge>
          {r.signals.map((s) => <Badge key={s} tone="danger">{FRAUD_SIGNALS[s] ?? s}</Badge>)}{r.review_note && <span className="text-muted">Nota: {r.review_note}</span>}</p>
        {["in_verifica", "registrato"].includes(r.status) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {r.status === "in_verifica" && <ActionForm action={adminReviewReferral} submitLabel="Sblocca" size="sm" variant="outline" hidden={{ id: r.id, decision: "registrato" }}>
              <Field id={`ok-${r.id}`} label="Motivazione"><Input id={`ok-${r.id}`} name="note" required /></Field></ActionForm>}
            <ActionForm action={adminReviewReferral} submitLabel="Respingi" size="sm" variant="ghost" hidden={{ id: r.id, decision: "respinto" }}>
              <Field id={`ko-${r.id}`} label="Motivazione"><Input id={`ko-${r.id}`} name="note" required /></Field></ActionForm>
          </div>
        )}
      </Card></li>
    ))}</ul>
  );
}

async function Adjust({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("points_ledger").select("id, user_id, amount, kind, rule_key, reason, created_at").order("created_at", { ascending: false }).limit(100);
  const ids = [...new Set((data ?? []).map((l) => l.user_id))];
  const { data: people } = ids.length ? await supabase.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const mail = new Map((people ?? []).map((p) => [p.id, p.email]));
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5"><h2 className="font-bold">Rettifica manuale</h2>
        <p className="text-sm text-muted">Usa valori negativi per togliere punti. La motivazione è comunicata all&apos;utente e salvata nel registro attività. Non puoi rettificare il tuo saldo.</p>
        <ActionForm action={adminAdjustPoints} submitLabel="Registra rettifica" resetOnSuccess className="mt-3" confirm="Registrare la rettifica?">
          {(state) => { const e = state.fieldErrors ?? {}; return (
            <div className="grid gap-3 sm:grid-cols-3">
              <Field id="email" label="Email dell'utente" error={e.email}><Input id="email" name="email" type="email" required /></Field>
              <Field id="amount" label="Punti (+/−)" error={e.amount}><Input id="amount" name="amount" type="number" required /></Field>
              <Field id="reason" label="Motivazione" error={e.reason}><Input id="reason" name="reason" required minLength={10} /></Field>
            </div>); }}
        </ActionForm>
      </Card>
      <Card className="p-5"><h2 className="font-bold">Ultimi movimenti</h2>
        {!data?.length ? <p className="mt-2 text-sm text-muted">Nessun movimento.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{data.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>{formatDateTime(l.created_at)} · {mail.get(l.user_id) ?? "utente"} · {LEDGER_KIND[l.kind as keyof typeof LEDGER_KIND]}{l.rule_key ? ` (${l.rule_key})` : ""}{l.reason ? ` · ${l.reason}` : ""} · <strong>{l.amount > 0 ? "+" : ""}{l.amount}</strong></span>
              {l.kind === "guadagno" && <ActionForm action={adminRevokePoints} submitLabel="Revoca" size="sm" variant="ghost" hidden={{ ledger_id: String(l.id) }}>
                {(state) => <Field id={`rv-${l.id}`} label="Motivazione" error={state.fieldErrors?.reason}><Input id={`rv-${l.id}`} name="reason" required minLength={10} /></Field>}
              </ActionForm>}
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}
