import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Card, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { AdminPage } from "@/components/admin/simple";
import { MarketingTabs, QuickStatus, StatusBadge, KINDS } from "@/components/marketing-admin/shared";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteMarketingRow, saveCampaign } from "@/lib/actions/marketing";
import { AUDIENCES, CHANNELS, MARKETING_STATUSES, CAMPAIGN_AUDIENCES, CAMPAIGN_TARGETS } from "@/lib/marketing/brief";
import { formatDate } from "@/lib/utils";
import { formatPrice } from "@/lib/format";
import type { Tables } from "@/lib/supabase/database.types";

export const metadata: Metadata = { title: "Campagne marketing", robots: { index: false } };
const LANDINGS = ["/milano", "/prima-auto", "/trova-officina", "/trova-ricambi", "/diventa-partner", "/diventa-officina-partner", "/diventa-concessionario-partner", "/partner"];

export default function CampaignsPage(props: PageProps<"/admin/marketing/campagne">) {
  return <AdminPage title="Campagne" description="Ogni campagna ha un codice UTM: usalo nei link delle inserzioni per misurare visite e conversioni senza dati personali."><MarketingTabs current="campagne" /><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("marketing.manage", "/admin/marketing/campagne");
  const sp = await searchParams;
  const supabase = await createClient();
  const id = typeof sp.id === "string" && /^[0-9a-f-]{36}$/.test(sp.id) ? sp.id : null;
  if (id) {
    const [{ data: c }, { data: items }] = await Promise.all([
      supabase.from("marketing_campaigns").select("*").eq("id", id).maybeSingle(),
      supabase.from("marketing_items").select("id, title, kind, status, planned_at").eq("campaign_id", id).order("planned_at", { nullsFirst: false }),
    ]);
    if (!c) return <EmptyState title="Campagna non trovata" />;
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="flex flex-col gap-4">
          <Link href="/admin/marketing/campagne" className="text-sm font-semibold text-muted hover:text-ink">← Tutte le campagne</Link>
          <Card className="p-5">
            <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">{c.name} <StatusBadge status={c.status} /></h2>
            <p className="text-sm text-muted">{AUDIENCES[c.audience as keyof typeof AUDIENCES]} · {c.channels.map((x) => CHANNELS[x as keyof typeof CHANNELS] ?? x).join(", ") || "nessun canale"} · {c.start_on ? formatDate(c.start_on) : "—"} → {c.end_on ? formatDate(c.end_on) : "—"}</p>
            {c.utm_campaign && <p className="mt-2 break-all rounded-lg bg-mist p-2 font-mono text-xs">Link di esempio: {(process.env.NEXT_PUBLIC_SITE_URL ?? "https://autogarage24.it")}{c.landing_path ?? "/milano"}?utm_source=instagram&amp;utm_medium=paid_social&amp;utm_campaign={c.utm_campaign}</p>}
            <div className="mt-3"><QuickStatus id={c.id} table="campagna" status={c.status} /></div>
          </Card>
          <Card className="p-5"><div className="mb-2 flex justify-between"><h2 className="font-bold">Contenuti della campagna</h2><Link className="text-sm underline" href={`/admin/marketing/contenuti?nuovo=1&campagna=${c.id}`}>Aggiungi contenuto</Link></div>
            {!items?.length ? <p className="text-sm text-muted">Nessun contenuto collegato.</p> : <ul className="flex flex-col gap-2 text-sm">{items.map((i) => <li key={i.id} className="flex flex-wrap items-center gap-2"><Link className="font-semibold hover:underline" href={`/admin/marketing/contenuti?id=${i.id}`}>{i.title}</Link><span className="text-muted">{KINDS[i.kind as keyof typeof KINDS]}{i.planned_at ? ` · ${formatDate(i.planned_at)}` : ""}</span><StatusBadge status={i.status} /></li>)}</ul>}
          </Card>
          <ActionForm action={deleteMarketingRow} submitLabel="Elimina campagna" variant="ghost" size="sm" hidden={{ id: c.id, table: "campagna" }} confirm="Eliminare la campagna? I contenuti restano, scollegati." />
        </div>
        <Card className="p-5"><h2 className="mb-3 font-bold">Modifica</h2><CampaignForm c={c} /></Card>
      </div>
    );
  }
  const { data } = await supabase.from("marketing_campaigns").select("*").order("updated_at", { ascending: false });
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      {!data?.length ? <EmptyState title="Nessuna campagna" description="Crea la prima campagna con il modulo." /> : (
        <ul className="flex flex-col gap-3">{data.map((c) => (
          <li key={c.id}><Link href={`/admin/marketing/campagne?id=${c.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink">
            <span><span className="block font-semibold">{c.name}</span><span className="text-sm text-muted">{AUDIENCES[c.audience as keyof typeof AUDIENCES]} · utm: {c.utm_campaign ?? "—"} · budget previsto {formatPrice(c.budget_planned_cents)}</span></span><StatusBadge status={c.status} />
          </Link></li>
        ))}</ul>
      )}
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start"><h2 className="mb-3 font-bold">Nuova campagna</h2><CampaignForm /></Card>
    </div>
  );
}

function CampaignForm({ c }: { c?: Tables<"marketing_campaigns"> }) {
  return (
    <ActionForm action={saveCampaign} submitLabel={c ? "Salva" : "Crea campagna"} hidden={{ id: c?.id }}>
      {(s) => (<div className="grid gap-3">
        <Field id="mc-n" label="Nome" error={s.fieldErrors?.name}><Input id="mc-n" name="name" defaultValue={c?.name} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="mc-a" label="Pubblico"><Select id="mc-a" name="audience" defaultValue={c?.audience ?? "neopatentati"}>{Object.entries(CAMPAIGN_AUDIENCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field id="mc-s" label="Stato"><Select id="mc-s" name="status" defaultValue={c?.status ?? "bozza"}>{Object.entries(MARKETING_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="mc-t" label="Destinatari"><Select id="mc-t" name="target" defaultValue={c?.target ?? "utenti"}>{Object.entries(CAMPAIGN_TARGETS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field id="mc-pc" label="Codice promo" hint="Deve esistere davvero (coupon del partner o invito)." optional error={s.fieldErrors?.promo_code}><Input id="mc-pc" name="promo_code" defaultValue={c?.promo_code ?? ""} className="uppercase" /></Field>
        </div>
        <Field id="mc-o" label="Obiettivo" optional><Textarea id="mc-o" name="objective" rows={2} defaultValue={c?.objective ?? ""} /></Field>
        <fieldset><legend className="mb-1 text-sm font-semibold">Canali</legend><div className="flex flex-wrap gap-3">{Object.entries(CHANNELS).map(([k, l]) => <Checkbox key={k} id={`mc-ch-${k}`} name="channels" value={k} label={l} defaultChecked={c?.channels.includes(k)} />)}</div></fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field id="mc-l" label="Landing page" optional><Select id="mc-l" name="landing_path" defaultValue={c?.landing_path ?? ""}><option value="">—</option>{LANDINGS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
          <Field id="mc-u" label="Codice UTM" optional hint="Minuscole, numeri, - e _"><Input id="mc-u" name="utm_campaign" defaultValue={c?.utm_campaign ?? ""} placeholder="neo-milano-dic26" /></Field>
          <Field id="mc-sd" label="Inizio" optional><Input id="mc-sd" name="start_on" type="date" defaultValue={c?.start_on ?? ""} /></Field>
          <Field id="mc-ed" label="Fine" optional><Input id="mc-ed" name="end_on" type="date" defaultValue={c?.end_on ?? ""} /></Field>
          <Field id="mc-b" label="Budget previsto (€)" optional hint="Solo pianificazione: nessuna spesa viene avviata."><Input id="mc-b" name="budget_planned" inputMode="decimal" defaultValue={c?.budget_planned_cents ? String(c.budget_planned_cents / 100) : ""} /></Field>
          <Field id="mc-pd" label="Data reale di pubblicazione" optional hint="Solo se lo stato è «pubblicato»."><Input id="mc-pd" name="published_on" type="date" defaultValue={c?.published_at?.slice(0, 10) ?? ""} /></Field>
        </div>
        <Field id="mc-no" label="Note" optional><Textarea id="mc-no" name="notes" rows={2} defaultValue={c?.notes ?? ""} /></Field>
      </div>)}
    </ActionForm>
  );
}
