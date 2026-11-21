import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { ShareInvite } from "@/components/rewards/share-invite";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/env";
import { cancelMyRedemption, getReferralCode, redeemReward } from "@/lib/actions/rewards";
import { benefitText, fmtPoints, ITEM_CATEGORIES, LEDGER_KIND, REDEMPTION_STATUS, REFERRAL_STATUS, tierProgress, type Wallet } from "@/lib/rewards/labels";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "AutoGarage24 Rewards", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;
const TABS = ["panoramica", "catalogo", "premi", "movimenti", "invita"] as const;

export default function RewardsPage(props: PageProps<"/dashboard/rewards">) {
  return (
    <>
      <PageHeader eyebrow="Rewards" title="AutoGarage24 Rewards" description="Punti che guadagni con i servizi completati sulla piattaforma e che puoi usare per i premi dei partner. I punti non sono denaro: non si convertono, non si cedono e non si prelevano." actions={<ButtonLink href="/regolamento-rewards" variant="outline">Regolamento</ButtonLink>} />
      <Suspense fallback={<Skeleton className="h-96" />}><Content searchParams={props.searchParams} /></Suspense>
    </>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser("/dashboard/rewards");
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as (typeof TABS)[number]) : "panoramica";
  const supabase = await createClient();
  const { data } = await supabase.rpc("rewards_wallet");
  const w = data as unknown as Wallet | null;
  if (!w) return <Alert tone="error">Impossibile caricare il saldo. Riprova tra poco.</Alert>;
  return (
    <>
      {!w.enabled && <Alert tone="info" className="mb-4">Il programma Rewards non è ancora attivo: per ora non vengono assegnati punti e non è possibile riscattare premi. Riceverai una notifica all&apos;attivazione.</Alert>}
      <TabLinks current={tab} items={[
        { key: "panoramica", label: "Saldo e livello", href: "/dashboard/rewards" }, { key: "catalogo", label: "Catalogo premi", href: "/dashboard/rewards?tab=catalogo" },
        { key: "premi", label: "Premi riscattati", href: "/dashboard/rewards?tab=premi" }, { key: "movimenti", label: "Movimenti", href: "/dashboard/rewards?tab=movimenti" },
        { key: "invita", label: "Invita amici", href: "/dashboard/rewards?tab=invita" },
      ]} />
      {tab === "panoramica" && <Overview w={w} supabase={supabase} />}
      {tab === "catalogo" && <Catalog w={w} supabase={supabase} />}
      {tab === "premi" && <Redemptions userId={user.id} supabase={supabase} />}
      {tab === "movimenti" && <Ledger userId={user.id} supabase={supabase} />}
      {tab === "invita" && <Invite userId={user.id} supabase={supabase} />}
    </>
  );
}
type SB = Awaited<ReturnType<typeof createClient>>;

async function Overview({ w, supabase }: { w: Wallet; supabase: SB }) {
  const { data: rules } = await supabase.from("reward_rules").select("key, label, description, points, max_per_user").eq("active", true).gt("points", 0).order("points");
  const pct = tierProgress(w);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5"><p className="text-sm text-muted">Saldo disponibile</p><p className="text-3xl font-extrabold">{fmtPoints(w.balance)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Guadagnati in totale</p><p className="text-2xl font-bold">{fmtPoints(w.earned)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">Usati per premi</p><p className="text-2xl font-bold">{fmtPoints(w.spent)}</p></Card>
        <Card className="p-5"><p className="text-sm text-muted">In scadenza entro 60 giorni</p><p className="text-2xl font-bold">{fmtPoints(w.expiring_soon)}</p>{w.expired > 0 && <p className="text-xs text-muted">Già scaduti: {fmtPoints(w.expired)}</p>}</Card>
      </div>
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">Livello <Badge tone="dark">{w.tier.name}</Badge></p>
          <p className="text-sm text-muted">{fmtPoints(w.tier_points)} guadagnati negli ultimi {w.tier_window_months} mesi</p></div>
        {w.next_tier ? (
          <>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-mist" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`Avanzamento verso ${w.next_tier.name}`}><div className="h-full bg-orange" style={{ width: `${pct}%` }} /></div>
            <p className="mt-2 text-sm">Mancano <strong>{fmtPoints(Math.max(0, w.next_tier.min_points - w.tier_points))}</strong> per il livello {w.next_tier.name}{w.next_tier.bonus_pct ? ` (bonus ${w.next_tier.bonus_pct}% sui punti)` : ""}.</p>
          </>
        ) : <p className="mt-2 text-sm">Hai raggiunto il livello più alto.</p>}
        {w.tier.benefits.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm">{w.tier.benefits.map((b) => <li key={b}>{b}</li>)}</ul>}
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">Come guadagnare punti</h2>
        <p className="mt-1 text-sm text-muted">I punti arrivano solo quando l&apos;operazione è confermata dal professionista o dal partner (non alla semplice richiesta). Le recensioni non danno punti. Se l&apos;operazione viene annullata, i punti vengono stornati.</p>
        {!rules?.length ? <p className="mt-3 text-sm">Nessuna regola attiva al momento.</p> : (
          <ul className="mt-3 divide-y divide-line">{rules.map((r) => <li key={r.key} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span><strong>{r.label}</strong> · {r.description}{r.max_per_user === 1 ? " (una volta)" : ""}</span><span className="font-bold">+{r.points}</span></li>)}</ul>
        )}
      </Card>
    </div>
  );
}

async function Catalog({ w, supabase }: { w: Wallet; supabase: SB }) {
  const { data: items } = await supabase.from("reward_items").select("*, professional_profiles(display_name, slug, city)").eq("status", "pubblicato").order("points_cost").limit(100);
  if (!items?.length) return <EmptyState title="Nessun premio disponibile" description="Il catalogo si popola con i premi proposti dai partner e approvati dallo staff." />;
  const tierSort: Record<string, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
  return (
    <ul className="grid gap-4 md:grid-cols-2">{items.map((i) => {
      const p = i.professional_profiles as unknown as { display_name: string; slug: string; city: string | null } | null;
      const locked = i.min_tier ? (tierSort[w.tier.code] ?? 0) < (tierSort[i.min_tier] ?? 0) : false;
      const enough = w.balance >= i.points_cost;
      return (
        <li key={i.id}><Card className="flex h-full flex-col gap-2 p-5">
          <div className="flex flex-wrap items-center gap-2"><Badge tone="orange">{fmtPoints(i.points_cost)}</Badge><Badge>{ITEM_CATEGORIES[i.category as keyof typeof ITEM_CATEGORIES]}</Badge>{i.min_tier && <Badge tone="dark">Livello {i.min_tier}</Badge>}</div>
          <h3 className="text-lg font-bold">{i.title}</h3>
          <p className="text-sm font-semibold">{benefitText(i.benefit_type, i.benefit_value)}{i.min_amount_cents ? ` · spesa minima ${i.min_amount_cents / 100} €` : ""}</p>
          {p && <p className="text-sm">Presso <Link className="underline" href={`/professionisti/${p.slug}`}>{p.display_name}</Link>{p.city ? ` · ${p.city}` : ""}</p>}
          <p className="text-sm text-muted">{i.description}</p>
          <p className="text-xs"><strong>Condizioni:</strong> {i.conditions}</p>
          <p className="text-xs text-muted">Riscattabile fino al {formatDate(i.valid_until)} · codice valido {i.voucher_days} giorni{i.quantity_left !== null ? ` · ${i.quantity_left} disponibili` : ""}</p>
          <div className="mt-auto pt-2">
            {!w.enabled ? <p className="text-sm text-muted">Riscatti disponibili all&apos;attivazione del programma.</p>
              : locked ? <p className="text-sm text-muted">Riservato al livello {i.min_tier}.</p>
              : !enough ? <p className="text-sm text-muted">Ti mancano {fmtPoints(i.points_cost - w.balance)}.</p>
              : <ActionForm action={redeemReward} submitLabel={`Riscatta per ${i.points_cost} punti`} pendingLabel="Riscatto in corso…" size="sm" hidden={{ item_id: i.id, idempotency_key: crypto.randomUUID() }} confirm={`Usare ${i.points_cost} punti per «${i.title}»?`} />}
          </div>
        </Card></li>
      );
    })}</ul>
  );
}

async function Redemptions({ userId, supabase }: { userId: string; supabase: SB }) {
  const { data } = await supabase.from("reward_redemptions").select("*, reward_items(title, benefit_type, benefit_value, conditions), professional_profiles(display_name, slug)").eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (!data?.length) return <EmptyState title="Nessun premio riscattato" action={<ButtonLink href="/dashboard/rewards?tab=catalogo">Vai al catalogo</ButtonLink>} />;
  return (
    <ul className="flex flex-col gap-3">{data.map((r) => {
      const i = r.reward_items as unknown as { title: string; benefit_type: string; benefit_value: number | null; conditions: string } | null;
      const p = r.professional_profiles as unknown as { display_name: string; slug: string } | null;
      return (
        <li key={r.id}><Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div><p className="font-bold">{i?.title}</p>
            <p className="text-sm">Codice <span className="font-mono text-lg font-extrabold">{r.code}</span> · {i ? benefitText(i.benefit_type, i.benefit_value) : ""}</p>
            <p className="text-xs text-muted">{p && <>Presso <Link className="underline" href={`/professionisti/${p.slug}`}>{p.display_name}</Link> · </>}valido fino al {formatDate(r.valid_until)} · {fmtPoints(r.points_spent)}</p>
            {r.cancel_reason && <p className="text-xs text-muted">Motivo: {r.cancel_reason}</p>}</div>
          <div className="flex items-center gap-2"><Badge tone={r.status === "emesso" ? "orange" : r.status === "utilizzato" ? "success" : "neutral"}>{REDEMPTION_STATUS[r.status as keyof typeof REDEMPTION_STATUS]}</Badge>
            {r.status === "emesso" && <ActionForm action={cancelMyRedemption} submitLabel="Annulla e recupera i punti" size="sm" variant="ghost" hidden={{ id: r.id }} confirm="Annullare il codice? I punti tornano nel saldo." />}</div>
        </Card></li>
      );
    })}</ul>
  );
}

async function Ledger({ userId, supabase }: { userId: string; supabase: SB }) {
  const { data } = await supabase.from("points_ledger").select("id, amount, kind, rule_key, reason, expires_at, created_at, reward_rules(label)").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title="Nessun movimento" description="Qui trovi ogni punto guadagnato, usato, restituito o scaduto." />;
  return (
    <Card className="overflow-x-auto p-0"><table className="w-full min-w-[560px] text-sm">
      <thead className="bg-mist text-left"><tr><th className="p-3">Data</th><th className="p-3">Movimento</th><th className="p-3">Dettaglio</th><th className="p-3 text-right">Punti</th></tr></thead>
      <tbody>{data.map((l) => (
        <tr key={l.id} className="border-t border-line"><td className="p-3 whitespace-nowrap">{formatDateTime(l.created_at)}</td><td className="p-3">{LEDGER_KIND[l.kind as keyof typeof LEDGER_KIND]}</td>
          <td className="p-3">{(l.reward_rules as unknown as { label: string } | null)?.label ?? l.reason ?? "—"}{l.kind === "guadagno" && l.expires_at ? <span className="block text-xs text-muted">Scadenza {formatDate(l.expires_at)}</span> : null}</td>
          <td className={`p-3 text-right font-bold ${l.amount > 0 ? "text-success" : ""}`}>{l.amount > 0 ? "+" : ""}{l.amount}</td></tr>
      ))}</tbody>
    </table></Card>
  );
}

async function Invite({ userId, supabase }: { userId: string; supabase: SB }) {
  const [{ data: code }, { data: refs }, { data: rules }] = await Promise.all([
    supabase.from("referral_codes").select("code").eq("user_id", userId).maybeSingle(),
    supabase.from("referrals").select("id, program, status, created_at, rewarded_at").eq("referrer_id", userId).order("created_at", { ascending: false }).limit(100),
    supabase.from("reward_rules").select("key, points, active").in("key", ["referral_invitante", "referral_invitato", "referral_partner"]),
  ]);
  const rule = (k: string) => rules?.find((r) => r.key === k);
  return (
    <div className="flex flex-col gap-6">
      <Card className="p-5">
        <h2 className="font-bold">Invita amici e attività</h2>
        <p className="mt-1 text-sm text-muted">
          Il premio arriva solo quando la persona invitata completa il primo servizio verificato (per gli amici) o quando l&apos;attività invitata viene verificata e pubblicata (per i partner). La sola registrazione non dà punti. Inviti sospetti (stesso telefono, email alias, auto-inviti) vengono controllati dallo staff.
        </p>
        <ul className="mt-3 text-sm">
          <li>Amico: {rule("referral_invitante")?.active ? `${rule("referral_invitante")?.points} punti a te, ${rule("referral_invitato")?.points ?? 0} a chi inviti` : "premio non attivo"}</li>
          <li>Attività partner: {rule("referral_partner")?.active ? `${rule("referral_partner")?.points} punti a te` : "premio non attivo"}</li>
        </ul>
        <div className="mt-4">{code?.code ? <ShareInvite url={`${getSiteUrl()}/invita/${code.code}`} /> : <ActionForm action={getReferralCode} submitLabel="Crea il mio link di invito" />}</div>
      </Card>
      <Card className="p-5">
        <h2 className="font-bold">I tuoi inviti</h2>
        {!refs?.length ? <p className="mt-2 text-sm text-muted">Nessuna registrazione con il tuo codice.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{refs.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{r.program === "partner" ? "Attività" : "Amico"} registrato il {formatDate(r.created_at)}</span>
              <Badge tone={r.status === "premiato" ? "success" : r.status === "respinto" ? "danger" : "neutral"}>{REFERRAL_STATUS[r.status as keyof typeof REFERRAL_STATUS]}</Badge></li>
          ))}</ul>
        )}
        <p className="mt-2 text-xs text-muted">Per privacy non mostriamo nomi o email delle persone invitate.</p>
      </Card>
    </div>
  );
}
