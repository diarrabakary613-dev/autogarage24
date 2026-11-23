import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { BarList, TabLinks } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { approveMessage, cancelMessage, saveLanding, saveMessage, saveWorkflow, sendMessage, setWorkflowsSwitch, toggleWorkflow } from "@/lib/actions/growth";
import { AUDIENCES, describeSegment, LP_SECTIONS, LP_STATUS, MSG_STATUS, PERIODS, SEGMENT_ROLES } from "@/lib/growth/labels";
import { significance } from "@/lib/marketing/stats";
import { thirdPartyIds } from "@/lib/consent";
import { formatDateTime } from "@/lib/utils";
import type { Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Growth Center", robots: { index: false } };
type SP = Record<string, string | string[] | undefined>;
const TABS = ["panoramica", "landing", "email", "automazioni", "integrazioni"] as const;
const q = (sp: SP, k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : null);

export default function GrowthPage(props: PageProps<"/admin/growth">) {
  return <AdminPage title="Growth Center" description="Registrazioni, attivazione, inviti, landing, email e automazioni con dati reali. Le campagne e i contenuti restano nel Centro marketing."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requirePermission("growth.manage", "/admin/growth");
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as (typeof TABS)[number]) : "panoramica";
  const supabase = await createClient();
  const label = { panoramica: "Panoramica", landing: "Landing page", email: "Email promozionali", automazioni: "Automazioni", integrazioni: "Pixel e integrazioni" };
  const founder = user.roles.includes("super_admin");
  return (
    <>
      <TabLinks current={tab} items={TABS.map((t) => ({ key: t, label: label[t], href: t === "panoramica" ? "/admin/growth" : `/admin/growth?tab=${t}` }))} />
      {tab === "panoramica" && <Overview sp={sp} supabase={supabase} />}
      {tab === "landing" && <Landings sp={sp} supabase={supabase} />}
      {tab === "email" && <Messages sp={sp} supabase={supabase} founder={founder} />}
      {tab === "automazioni" && <Workflows supabase={supabase} founder={founder} />}
      {tab === "integrazioni" && <Integrations />}
    </>
  );
}
type SB = Awaited<ReturnType<typeof createClient>>;
type GC = {
  registrazioni: number; attivati: number; servizio_completato: number; consenso_marketing: number;
  per_giorno: { giorno: string; n: number }[]; per_sorgente: { sorgente: string; n: number; attivati: number }[]; per_campagna: { campagna: string; n: number; attivati: number }[];
  per_ruolo: Record<string, number>; inviti: Record<string, number>; email: Record<string, number>; automazioni: Record<string, number>;
  sorgenti_disponibili: string[]; campagne_disponibili: string[];
};
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : "—");

async function Overview({ sp, supabase }: { sp: SP; supabase: SB }) {
  const days = PERIODS.includes(Number(sp.giorni) as (typeof PERIODS)[number]) ? Number(sp.giorni) : 30;
  const source = q(sp, "sorgente"); const campaign = q(sp, "campagna"); const role = q(sp, "ruolo");
  const { data, error } = await supabase.rpc("admin_growth_center", { days, p_source: source ?? undefined, p_campaign: campaign ?? undefined, p_role: role ?? undefined });
  if (error || !data) return <Alert tone="error">Dati non disponibili.</Alert>;
  const g = data as unknown as GC;
  const exportQs = new URLSearchParams({ giorni: String(days), ...(source ? { sorgente: source } : {}), ...(campaign ? { campagna: campaign } : {}), ...(role ? { ruolo: role } : {}) });
  return (
    <div className="flex flex-col gap-6">
      <form className="flex flex-wrap items-end gap-3" method="get">
        <Field id="giorni" label="Periodo"><Select id="giorni" name="giorni" defaultValue={String(days)}>{PERIODS.map((p) => <option key={p} value={p}>Ultimi {p} giorni</option>)}</Select></Field>
        <Field id="sorgente" label="Sorgente"><Select id="sorgente" name="sorgente" defaultValue={source ?? ""}><option value="">Tutte</option>{g.sorgenti_disponibili.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field id="campagna" label="Campagna (UTM)"><Select id="campagna" name="campagna" defaultValue={campaign ?? ""}><option value="">Tutte</option>{g.campagne_disponibili.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
        <Field id="ruolo" label="Tipo di account"><Select id="ruolo" name="ruolo" defaultValue={role ?? ""}><option value="">Tutti</option>{["cliente", "neopatentato", "officina", "meccanico", "venditore_auto", "venditore_ricambi"].map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
        <button type="submit" className="min-h-11 rounded-lg bg-ink px-4 text-sm font-semibold text-white">Applica</button>
        <a className="min-h-11 content-center rounded-lg border border-line-strong px-4 text-sm font-semibold" href={`/admin/growth/esporta?${exportQs}`}>Esporta CSV</a>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-muted">Registrazioni</p><p className="text-3xl font-extrabold">{g.registrazioni}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted">Attivati</p><p className="text-3xl font-extrabold">{g.attivati}</p><p className="text-xs text-muted">{pct(g.attivati, g.registrazioni)} · richiesta, visita, auto nel garage o profilo pubblicato</p></Card>
        <Card className="p-4"><p className="text-sm text-muted">Con un servizio completato</p><p className="text-3xl font-extrabold">{g.servizio_completato}</p><p className="text-xs text-muted">{pct(g.servizio_completato, g.registrazioni)}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted">Consenso email promozionali</p><p className="text-3xl font-extrabold">{g.consenso_marketing}</p><p className="text-xs text-muted">{pct(g.consenso_marketing, g.registrazioni)}</p></Card>
      </div>
      {g.registrazioni === 0 ? <EmptyState title="Nessuna registrazione nel periodo selezionato" /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5"><h2 className="mb-3 font-bold">Registrazioni per giorno</h2><BarList items={g.per_giorno.map((d) => ({ label: d.giorno, value: d.n }))} format={(v) => String(v)} /></Card>
          <Card className="p-5"><h2 className="mb-3 font-bold">Per sorgente (attivati)</h2><BarList items={g.per_sorgente.map((s) => ({ label: `${s.sorgente} · ${pct(s.attivati, s.n)} attivati`, value: s.n }))} format={(v) => String(v)} /></Card>
          <Card className="p-5"><h2 className="mb-3 font-bold">Per campagna</h2>{g.per_campagna.length ? <BarList items={g.per_campagna.map((s) => ({ label: `${s.campagna} · ${pct(s.attivati, s.n)} attivati`, value: s.n }))} format={(v) => String(v)} /> : <p className="text-sm text-muted">Nessuna registrazione con UTM campaign.</p>}</Card>
          <Card className="p-5"><h2 className="mb-3 font-bold">Per tipo di account</h2><BarList items={Object.entries(g.per_ruolo).map(([k, v]) => ({ label: k, value: v }))} format={(v) => String(v)} /></Card>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><h2 className="font-bold">Inviti</h2><ul className="mt-2 text-sm">
          <li>Registrati con invito: {g.inviti.registrati}</li><li>Qualificati: {g.inviti.qualificati}</li><li>Premiati: {g.inviti.premiati}</li><li>Partner invitati: {g.inviti.partner}</li>
          <li>In verifica antifrode: {g.inviti.in_verifica} {g.inviti.in_verifica > 0 && <Link className="underline" href="/admin/rewards?tab=referral">controlla</Link>}</li></ul></Card>
        <Card className="p-5"><h2 className="font-bold">Email promozionali</h2><ul className="mt-2 text-sm">
          <li>In coda: {g.email.in_coda}</li><li>Consegnate al provider: {g.email.inviate_dal_provider}</li><li>Errori: {g.email.errori}</li><li>Escluse: {g.email.esclusi}</li><li>Disiscrizioni: {g.email.disiscrizioni}</li></ul></Card>
        <Card className="p-5"><h2 className="font-bold">Automazioni (invii nel periodo)</h2>{Object.keys(g.automazioni).length ? <ul className="mt-2 text-sm">{Object.entries(g.automazioni).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul> : <p className="mt-2 text-sm text-muted">Nessun invio.</p>}</Card>
      </div>
      <p className="text-xs text-muted">L&apos;attribuzione deriva dai parametri UTM della prima pagina visitata nella stessa scheda (nessun cookie) e non viene registrata se il browser chiede di non essere tracciato. Per questo una parte delle registrazioni risulta «diretto».</p>
    </div>
  );
}

async function Landings({ sp, supabase }: { sp: SP; supabase: SB }) {
  const editId = q(sp, "id");
  const [{ data: pages }, { data: campaigns }] = await Promise.all([
    supabase.from("landing_pages").select("*").order("updated_at", { ascending: false }),
    supabase.from("marketing_campaigns").select("id, name").order("created_at", { ascending: false }).limit(100),
  ]);
  const editing = editId ? pages?.find((p) => p.id === editId) : undefined;
  const results = editing ? (await supabase.rpc("admin_landing_results", { p_slug: editing.slug, days: 90 })).data ?? [] : [];
  const a = results.find((r) => r.variant === "a"); const b = results.find((r) => r.variant === "b");
  const sig = a && b ? significance(Number(a.views), Number(a.cta_clicks), Number(b.views), Number(b.cta_clicks)) : null;
  return (
    <div className="flex flex-col gap-6">
      {sp.salvata && <Alert tone="success">Landing salvata.</Alert>}
      {editing && (
        <Card className="p-5"><h2 className="font-bold">Risultati (90 giorni)</h2>
          <table className="mt-2 w-full text-sm"><thead><tr className="text-left"><th>Variante</th><th>Viste</th><th>Clic CTA</th><th>Tasso</th></tr></thead>
            <tbody>{results.map((r) => <tr key={r.variant}><td>{r.variant.toUpperCase()}</td><td>{r.views}</td><td>{r.cta_clicks}</td><td>{pct(Number(r.cta_clicks), Number(r.views))}</td></tr>)}</tbody></table>
          {editing.experiment_active && sig && <p className="mt-2 text-sm"><Badge tone={sig.verdict === "significativa" ? "success" : "neutral"}>{sig.verdict === "dati_insufficienti" ? "Dati insufficienti" : sig.verdict === "significativa" ? "Differenza significativa" : "Differenza non significativa"}</Badge> {sig.text}</p>}
        </Card>
      )}
      <Card className="p-5"><h2 className="mb-3 font-bold">{editing ? `Modifica /lp/${editing.slug}` : "Nuova landing page"}</h2><LandingForm lp={editing} campaigns={campaigns ?? []} /></Card>
      <Card className="p-5"><h2 className="font-bold">Landing configurate</h2>
        {!pages?.length ? <p className="mt-2 text-sm text-muted">Nessuna landing creata.</p> : (
          <ul className="mt-2 divide-y divide-line text-sm">{pages.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><strong>{p.title}</strong> · /lp/{p.slug} · {AUDIENCES[p.audience as keyof typeof AUDIENCES]}{p.experiment_active ? " · A/B attivo" : ""}</span>
              <span className="flex items-center gap-2"><Badge tone={p.status === "pubblicata" ? "success" : "neutral"}>{LP_STATUS[p.status as keyof typeof LP_STATUS]}</Badge>
                {p.status === "pubblicata" && <Link className="underline" href={`/lp/${p.slug}`}>Apri</Link>}
                <Link className="underline" href={`/admin/growth?tab=landing&id=${p.id}`}>Modifica e risultati</Link></span>
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}

function LandingForm({ lp, campaigns }: { lp?: Tables<"landing_pages">; campaigns: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveLanding} submitLabel="Salva landing" hidden={lp ? { id: lp.id } : undefined}>
      {((state: FormState) => { const e = state.fieldErrors ?? {}; return (
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="slug" label="Indirizzo (/lp/…)" error={e.slug}><Input id="slug" name="slug" required defaultValue={lp?.slug} placeholder="prima-auto-milano" /></Field>
          <Field id="title" label="Titolo della pagina (SEO)" error={e.title}><Input id="title" name="title" required maxLength={70} defaultValue={lp?.title} /></Field>
          <Field id="headline" label="Titolo principale (variante A)" error={e.headline} className="md:col-span-2"><Input id="headline" name="headline" required defaultValue={lp?.headline} /></Field>
          <Field id="subheadline" label="Sottotitolo" optional className="md:col-span-2"><Input id="subheadline" name="subheadline" defaultValue={lp?.subheadline ?? ""} /></Field>
          <Field id="body" label="Testo" hint="Paragrafi separati da una riga vuota. Solo informazioni vere e verificabili." optional className="md:col-span-2"><Textarea id="body" name="body" rows={5} defaultValue={lp?.body ?? ""} /></Field>
          <Field id="bullets" label="Punti elenco (uno per riga, max 8)" optional className="md:col-span-2"><Textarea id="bullets" name="bullets" rows={3} defaultValue={lp?.bullets.join("\n")} /></Field>
          <Field id="cta_label" label="Testo del pulsante (A)" error={e.cta_label}><Input id="cta_label" name="cta_label" required defaultValue={lp?.cta_label} /></Field>
          <Field id="cta_path" label="Destinazione del pulsante" hint="Solo pagine del sito, es. /registrati" error={e.cta_path}><Input id="cta_path" name="cta_path" required defaultValue={lp?.cta_path} /></Field>
          <Field id="section" label="Sezione con dati reali"><Select id="section" name="section" defaultValue={lp?.section ?? "nessuna"}>{Object.entries(LP_SECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field id="audience" label="Pubblico"><Select id="audience" name="audience" defaultValue={lp?.audience ?? "generale"}>{Object.entries(AUDIENCES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field id="campaign_id" label="Campagna collegata" optional><Select id="campaign_id" name="campaign_id" defaultValue={lp?.campaign_id ?? ""}><option value="">Nessuna</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <Field id="meta_description" label="Descrizione per i motori di ricerca" optional><Input id="meta_description" name="meta_description" maxLength={160} defaultValue={lp?.meta_description ?? ""} /></Field>
          <Field id="variant_b_headline" label="Titolo variante B" optional error={e.variant_b_headline}><Input id="variant_b_headline" name="variant_b_headline" defaultValue={lp?.variant_b_headline ?? ""} /></Field>
          <Field id="variant_b_cta_label" label="Pulsante variante B" optional><Input id="variant_b_cta_label" name="variant_b_cta_label" defaultValue={lp?.variant_b_cta_label ?? ""} /></Field>
          <Checkbox id="experiment_active" name="experiment_active" defaultChecked={lp?.experiment_active} label="Esperimento A/B attivo (metà delle viste vede la variante B)" />
          <Checkbox id="indexable" name="indexable" defaultChecked={lp?.indexable} label="Indicizzabile sui motori di ricerca (mai durante un esperimento)" />
          <Field id="status" label="Stato"><Select id="status" name="status" defaultValue={lp?.status ?? "bozza"}>{Object.entries(LP_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        </div>); })(initialFormState)}
    </ActionForm>
  );
}

async function Messages({ sp, supabase, founder }: { sp: SP; supabase: SB; founder: boolean }) {
  const editId = q(sp, "id");
  const [{ data: msgs }, { data: campaigns }] = await Promise.all([
    supabase.from("marketing_messages").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("marketing_campaigns").select("id, name").order("created_at", { ascending: false }).limit(100),
  ]);
  const editing = editId ? msgs?.find((m) => m.id === editId && ["bozza", "da_approvare", "approvato"].includes(m.status)) : undefined;
  const previews = await Promise.all((msgs ?? []).filter((m) => ["da_approvare", "approvato"].includes(m.status)).map(async (m) => [m.id, (await supabase.rpc("admin_marketing_audience", { p_segment: m.segment as never })).data] as const));
  const prev = new Map(previews);
  return (
    <div className="flex flex-col gap-6">
      <Alert tone="info">Le email promozionali partono solo verso chi ha dato il consenso, con link di disiscrizione, dopo l&apos;approvazione del fondatore. Il provider email non è ancora configurato: i messaggi restano in coda (nessun invio reale) finché non viene collegato.</Alert>
      {sp.salvato && <Alert tone="success">Messaggio salvato.</Alert>}
      <Card className="p-5"><h2 className="mb-3 font-bold">{editing ? "Modifica messaggio" : "Nuovo messaggio"}</h2><MessageForm m={editing} campaigns={campaigns ?? []} /></Card>
      {!msgs?.length ? <EmptyState title="Nessun messaggio" /> : (
        <ul className="flex flex-col gap-3">{msgs.map((m) => {
          const a = prev.get(m.id) as Record<string, number> | undefined;
          return (
            <li key={m.id}><Card className="p-4">
              <p className="font-bold">{m.subject} <Badge tone={m.status === "inviato" ? "success" : m.status === "da_approvare" ? "warning" : "neutral"}>{MSG_STATUS[m.status as keyof typeof MSG_STATUS]}</Badge></p>
              <p className="text-sm text-muted">{describeSegment(m.segment as Record<string, string>)} · canali: {m.channels.join(", ")}{m.sent_at ? ` · inviato ${formatDateTime(m.sent_at)}: ${m.recipients} email in coda, ${m.excluded} esclusi` : ""}</p>
              {a && <p className="text-sm">Pubblico attuale: {a.totale} persone · {a.email_con_consenso} con consenso email · {a.limite_frequenza} escluse per frequenza · {a.in_app} in app</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {["bozza", "da_approvare", "approvato"].includes(m.status) && <ButtonLink size="sm" variant="outline" href={`/admin/growth?tab=email&id=${m.id}`}>Modifica</ButtonLink>}
                {m.status === "da_approvare" && founder && <ActionForm action={approveMessage} submitLabel="Approva (fondatore)" size="sm" hidden={{ id: m.id }} confirm="Approvare il testo e il pubblico?" />}
                {m.status === "da_approvare" && !founder && <span className="text-sm text-muted">In attesa dell&apos;approvazione del fondatore.</span>}
                {m.status === "approvato" && <ActionForm action={sendMessage} submitLabel="Invia ora" size="sm" hidden={{ id: m.id }} confirm={`Mettere in coda il messaggio per ${a?.email_con_consenso ?? 0} persone con consenso?`} />}
                {["bozza", "da_approvare", "approvato"].includes(m.status) && <ActionForm action={cancelMessage} submitLabel="Annulla" size="sm" variant="ghost" hidden={{ id: m.id }} confirm="Annullare il messaggio?" />}
              </div>
            </Card></li>
          );
        })}</ul>
      )}
    </div>
  );
}

function MessageForm({ m, campaigns }: { m?: Tables<"marketing_messages">; campaigns: { id: string; name: string }[] }) {
  const s = (m?.segment ?? {}) as Record<string, string>;
  return (
    <ActionForm action={saveMessage} submitLabel="Salva bozza" hidden={m ? { id: m.id } : undefined}>
      {((state: FormState) => { const e = state.fieldErrors ?? {}; return (
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="subject" label="Oggetto" error={e.subject} className="md:col-span-2"><Input id="subject" name="subject" required defaultValue={m?.subject} /></Field>
          <Field id="body" label="Testo" hint="Niente promesse non verificabili, niente prezzi o disponibilità non confermati dai partner." error={e.body} className="md:col-span-2"><Textarea id="body" name="body" rows={5} required defaultValue={m?.body} /></Field>
          <Field id="cta_label" label="Testo del link" optional><Input id="cta_label" name="cta_label" defaultValue={m?.cta_label ?? ""} /></Field>
          <Field id="cta_path" label="Pagina di destinazione" hint="Percorso interno, es. /offerte" optional error={e.cta_path}><Input id="cta_path" name="cta_path" defaultValue={m?.cta_path ?? ""} /></Field>
          <fieldset className="md:col-span-2"><legend className="text-sm font-semibold">Canali</legend>{e.channels && <p className="text-xs text-danger" role="alert">{e.channels}</p>}
            <div className="mt-1 flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="ch_email" defaultChecked={!m || m.channels.includes("email")} className="size-4 accent-orange" />Email (solo con consenso)</label>
              <label className="flex items-center gap-2"><input type="checkbox" name="ch_in_app" defaultChecked={m?.channels.includes("in_app")} className="size-4 accent-orange" />Notifica in app (categoria Promozioni)</label></div></fieldset>
          <Field id="ruolo" label="Segmento: tipo di utente" optional><Select id="ruolo" name="ruolo" defaultValue={s.ruolo ?? ""}><option value="">Tutti</option>{Object.entries(SEGMENT_ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
          <Field id="citta" label="Segmento: città" optional><Input id="citta" name="citta" defaultValue={s.citta ?? ""} /></Field>
          <Field id="inattivi" label="Inattivi da almeno (giorni)" optional><Input id="inattivi" name="inattivi" type="number" min={1} max={999} defaultValue={s.inattivi_giorni ?? ""} /></Field>
          <Field id="registrati" label="Registrati negli ultimi (giorni)" optional><Input id="registrati" name="registrati" type="number" min={1} max={999} defaultValue={s.registrati_da_giorni ?? ""} /></Field>
          <Field id="campagna" label="Arrivati dalla campagna (UTM)" optional><Input id="campagna" name="campagna" defaultValue={s.campagna ?? ""} /></Field>
          <Field id="campaign_id" label="Campagna collegata" optional><Select id="campaign_id" name="campaign_id" defaultValue={m?.campaign_id ?? ""}><option value="">Nessuna</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
          <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" name="submit" value="1" className="size-5 accent-orange" /> Invia al fondatore per l&apos;approvazione</label>
        </div>); })(initialFormState)}
    </ActionForm>
  );
}

async function Workflows({ supabase, founder }: { supabase: SB; founder: boolean }) {
  const [{ data: wfs }, { data: setting }] = await Promise.all([
    supabase.from("marketing_workflows").select("*").order("key"),
    supabase.from("platform_settings").select("value").eq("key", "marketing_workflows_enabled").maybeSingle(),
  ]);
  const enabled = setting?.value === true || setting?.value === "true";
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5"><p className="font-bold">Interruttore generale: {enabled ? <Badge tone="success">Acceso</Badge> : <Badge>Spento</Badge>}</p>
        <p className="text-sm text-muted">Con l&apos;interruttore spento nessuna automazione parte, anche se attiva. Le automazioni girano una volta al giorno (se il database ha pg_cron).</p>
        <ActionForm action={setWorkflowsSwitch} submitLabel={enabled ? "Spegni tutto" : "Accendi"} size="sm" variant={enabled ? "outline" : "primary"} hidden={{ enabled: enabled ? "0" : "1" }} className="mt-2" confirm={enabled ? "Fermare tutte le automazioni?" : "Accendere le automazioni attive?"} />
        {!founder && !enabled && <p className="mt-1 text-xs text-muted">L&apos;accensione è riservata al fondatore.</p>}
      </Card>
      {(wfs ?? []).map((w) => (
        <Card key={w.key} className="p-4">
          <p className="font-bold">{w.name} {w.active ? <Badge tone="success">Attiva</Badge> : <Badge>Non attiva</Badge>}</p>
          <p className="text-sm text-muted">Condizione: {w.condition_description} Massimo {w.max_per_user} invio per persona, almeno {w.cooldown_days} giorni tra due invii.</p>
          <ActionForm action={saveWorkflow} submitLabel="Salva" size="sm" hidden={{ key: w.key }} className="mt-2">
            {((state: FormState) => { const e = state.fieldErrors ?? {}; return (
              <div className="grid gap-3 md:grid-cols-3">
                <Field id={`t-${w.key}`} label="Titolo" error={e.title}><Input id={`t-${w.key}`} name="title" defaultValue={w.title} /></Field>
                <Field id={`l-${w.key}`} label="Link" error={e.link}><Input id={`l-${w.key}`} name="link" defaultValue={w.link} /></Field>
                <Field id={`d-${w.key}`} label="N giorni" error={e.delay_days}><Input id={`d-${w.key}`} name="delay_days" type="number" min={1} max={365} defaultValue={w.delay_days} /></Field>
                <Field id={`b-${w.key}`} label="Testo" error={e.body} className="md:col-span-3"><Textarea id={`b-${w.key}`} name="body" rows={2} defaultValue={w.body} /></Field>
                <Field id={`m-${w.key}`} label="Invii massimi per persona"><Input id={`m-${w.key}`} name="max_per_user" type="number" min={1} max={5} defaultValue={w.max_per_user} /></Field>
                <Field id={`c-${w.key}`} label="Giorni tra due invii"><Input id={`c-${w.key}`} name="cooldown_days" type="number" min={1} max={365} defaultValue={w.cooldown_days} /></Field>
                <Checkbox id={`e-${w.key}`} name="send_email" defaultChecked={w.send_email} label="Anche via email (solo con consenso)" />
              </div>); })(initialFormState)}
          </ActionForm>
          <div className="mt-2">
            {w.active ? <ActionForm action={toggleWorkflow} submitLabel="Disattiva" size="sm" variant="outline" hidden={{ key: w.key, active: "0" }} />
              : founder ? <ActionForm action={toggleWorkflow} submitLabel="Attiva (fondatore)" size="sm" hidden={{ key: w.key, active: "1" }} confirm="Attivare questa automazione?" />
              : <p className="text-sm text-muted">L&apos;attivazione è riservata al fondatore.</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}

function Integrations() {
  const ids = thirdPartyIds();
  const rows: [string, string | null, string][] = [
    ["Google Analytics 4", ids.ga4, "NEXT_PUBLIC_GA4_ID (es. G-XXXXXXX)"],
    ["Google Ads (tag di conversione)", ids.googleAds, "NEXT_PUBLIC_GOOGLE_ADS_ID (es. AW-123456789)"],
    ["Meta Pixel", ids.metaPixel, "NEXT_PUBLIC_META_PIXEL_ID"],
    ["TikTok Pixel", ids.tiktokPixel, "NEXT_PUBLIC_TIKTOK_PIXEL_ID"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">Gli strumenti di terze parti si caricano solo dopo il consenso esplicito nel banner, che compare solo se almeno un ID è configurato. Le chiavi segrete (API di conversione lato server, token degli account pubblicitari) non vanno mai in variabili NEXT_PUBLIC_: l&apos;invio delle conversioni lato server non è implementato e richiede account e autorizzazioni dedicati.</Alert>
      <Card className="overflow-x-auto p-0"><table className="w-full min-w-[520px] text-sm"><thead className="bg-mist text-left"><tr><th className="p-3">Strumento</th><th className="p-3">Stato</th><th className="p-3">Variabile</th></tr></thead>
        <tbody>{rows.map(([n, v, env]) => <tr key={n} className="border-t border-line"><td className="p-3">{n}</td><td className="p-3">{v ? <Badge tone="success">ID configurato: {v}</Badge> : <Badge>Non configurato</Badge>}</td><td className="p-3 font-mono text-xs">{env}</td></tr>)}</tbody></table></Card>
      <p className="text-sm text-muted">«ID configurato» non significa che l&apos;account sia verificato o che le conversioni arrivino: va controllato negli strumenti della piattaforma pubblicitaria. Prima di attivare i pixel aggiorna la cookie policy e l&apos;informativa privacy.</p>
    </div>
  );
}
