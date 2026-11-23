import type { Metadata } from "next";
import { initialFormState, type FormState } from "@/lib/validation/form-state";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { TabLinks } from "@/components/ui/misc";
import { AdminPage } from "@/components/admin/simple";
import { CrmContactForm, CrmInteractionForm } from "@/components/admin/crm-forms";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { assignContact, moveContact, reviewApplication, setFoundingPartner, updateBetaSignup } from "@/lib/actions/acquisition";
import {
  APPLICATION_STATUSES, BETA_AUDIENCES, BUSINESS_TYPES, CRM_STATUSES, INTERACTION_KINDS, INTEREST_LEVELS, PIPELINE, PROGRAMS, neighbours, statusTone,
} from "@/lib/crm";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Acquisizione partner", robots: { index: false } };

type SP = Record<string, string | string[] | undefined>;
const TABS = ["panoramica", "pipeline", "contatti", "candidature", "founding", "beta"] as const;
type Tab = (typeof TABS)[number];
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const label = (o: Record<string, string>, k: string | null | undefined) => (k ? (o[k] ?? k) : "—");

export default function AcquisitionPage(props: PageProps<"/admin/acquisizione">) {
  return (
    <AdminPage title="Acquisizione partner" description="CRM unico con il Field Manager: contatti, pipeline commerciale, visite, candidature dal sito, Founding Partners e iscrizioni alla Beta. Nessun messaggio viene inviato automaticamente ai contatti.">
      <Content searchParams={props.searchParams} />
    </AdminPage>
  );
}

async function Content({ searchParams }: { searchParams: Promise<SP> }) {
  await requirePermission("acquisition.manage", "/admin/acquisizione");
  const sp = await searchParams;
  const contact = one(sp.contatto);
  if (contact && /^[0-9a-f-]{36}$/.test(contact)) return <ContactDetail id={contact} />;
  const tab: Tab = (TABS as readonly string[]).includes(one(sp.tab) ?? "") ? (one(sp.tab) as Tab) : "panoramica";
  const supabase = await createClient();
  const [{ count: pendingApps }, { count: betaCount }] = await Promise.all([
    supabase.from("partner_applications").select("id", { count: "exact", head: true }).in("status", ["nuova", "in_esame"]),
    supabase.from("beta_signups").select("id", { count: "exact", head: true }).neq("status", "annullato"),
  ]);
  return (
    <>
      <TabLinks current={tab} items={[
        { key: "panoramica", label: "Dashboard fondatore", href: "/admin/acquisizione" },
        { key: "pipeline", label: "Pipeline", href: "/admin/acquisizione?tab=pipeline" },
        { key: "contatti", label: "Contatti", href: "/admin/acquisizione?tab=contatti" },
        { key: "candidature", label: "Candidature", href: "/admin/acquisizione?tab=candidature", count: pendingApps ?? 0 },
        { key: "founding", label: "Founding Partners", href: "/admin/acquisizione?tab=founding" },
        { key: "beta", label: "Iscritti Beta", href: "/admin/acquisizione?tab=beta", count: betaCount ?? 0 },
      ]} />
      {tab === "panoramica" && <Overview days={Number(one(sp.giorni)) || 30} />}
      {tab === "pipeline" && <Pipeline type={one(sp.tipo)} />}
      {tab === "contatti" && <ContactList sp={sp} />}
      {tab === "candidature" && <Applications status={one(sp.stato)} />}
      {tab === "founding" && <Founding />}
      {tab === "beta" && <Beta />}
    </>
  );
}

type Growth = {
  crm: { total: number; by_status: Record<string, number>; by_type: Record<string, number>; workshops_contacted: number; new_period: number; contacted: number; registered: number; active: number; conversion_rate: number | null; followups_overdue: number; interactions_period: number; visits_period: number; cars_declared: number; neo_cars_declared: number };
  applications: { period: number; pending: number; accepted: number };
  founding: { admitted: number; target: number };
  beta_signups: number;
  platform: { registrations_period: number; professionals_approved: number; workshops: number; mechanics: number; vehicles_published: number; vehicles_neo: number; requests_period: number; requests_answered_period: number; quotes_accepted_period: number };
};

function Kpi({ label: l, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const inner = <><span className="text-sm text-muted">{l}</span><span className="text-3xl font-extrabold tabular-nums">{value}</span>{hint && <span className="text-xs text-muted">{hint}</span>}</>;
  return href ? <Link href={href} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-card hover:border-ink">{inner}</Link> : <div className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-4 shadow-card">{inner}</div>;
}

async function Overview({ days }: { days: number }) {
  const period = [7, 30, 90, 365].includes(days) ? days : 30;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_growth_stats", { days: period });
  if (error || !data) return <Alert tone="error">Statistiche non disponibili in questo momento.</Alert>;
  const g = data as unknown as Growth;
  const totalPartners = g.crm.registered;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">Periodo:{[7, 30, 90, 365].map((d) => <Link key={d} href={`/admin/acquisizione?giorni=${d}`} className={`rounded-full border px-3 py-1 ${d === period ? "border-ink bg-ink text-white" : "border-line"}`}>{d === 365 ? "1 anno" : `${d} giorni`}</Link>)}</div>
      <Alert tone="info" title="Obiettivo Founding Partners">{g.founding.admitted} partner ammessi su {g.founding.target}. Il numero è aggiornato solo da ammissioni registrate nel pannello: nessun valore stimato.</Alert>
      <section aria-labelledby="crm-t"><h2 id="crm-t" className="mb-3 font-bold">Pipeline commerciale</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Contatti totali" value={g.crm.total} hint={`${g.crm.new_period} nuovi nel periodo`} href="/admin/acquisizione?tab=contatti" />
          <Kpi label="Officine contattate" value={g.crm.workshops_contacted} />
          <Kpi label="Partner registrati" value={totalPartners} hint="Stati «registrato» e «partner attivo»" />
          <Kpi label="Partner attivi" value={g.crm.active} />
          <Kpi label="Tasso di conversione" value={g.crm.conversion_rate === null ? "—" : `${g.crm.conversion_rate}%`} hint="Registrati / contattati" />
          <Kpi label="Follow-up scaduti" value={g.crm.followups_overdue} href="/admin/acquisizione?tab=contatti&scaduti=1" />
          <Kpi label="Attività nel periodo" value={g.crm.interactions_period} hint={`di cui ${g.crm.visits_period} visite`} />
          <Kpi label="Auto dichiarate dai contatti" value={g.crm.cars_declared} hint={`${g.crm.neo_cars_declared} per neopatentati (stima dei contatti)`} />
        </div>
      </section>
      <section aria-labelledby="pl-t"><h2 id="pl-t" className="mb-3 font-bold">Piattaforma (dati reali)</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Veicoli pubblicati" value={g.platform.vehicles_published} />
          <Kpi label="Veicoli per neopatentati" value={g.platform.vehicles_neo} hint="Esito «compatibile» calcolato" />
          <Kpi label="Officine pubblicate" value={g.platform.workshops} />
          <Kpi label="Meccanici pubblicati" value={g.platform.mechanics} />
          <Kpi label="Candidature nel periodo" value={g.applications.period} hint={`${g.applications.pending} da esaminare`} href="/admin/acquisizione?tab=candidature" />
          <Kpi label="Iscritti alla Beta" value={g.beta_signups} href="/admin/acquisizione?tab=beta" />
          <Kpi label="Richieste nel periodo" value={g.platform.requests_period} hint={`${g.platform.requests_answered_period} con risposta`} />
          <Kpi label="Preventivi accettati" value={g.platform.quotes_accepted_period} />
        </div>
      </section>
      <section aria-labelledby="st-t"><h2 id="st-t" className="mb-3 font-bold">Contatti per stato</h2>
        <ul className="grid gap-2 sm:grid-cols-3">{Object.entries(CRM_STATUSES).map(([k, l]) => <li key={k}><Link href={`/admin/acquisizione?tab=contatti&stato=${k}`} className="flex justify-between rounded-xl border border-line bg-white px-4 py-2 hover:border-ink"><span>{l}</span><span className="font-bold tabular-nums">{g.crm.by_status[k] ?? 0}</span></Link></li>)}</ul>
      </section>
    </div>
  );
}

async function Pipeline({ type }: { type?: string }) {
  const supabase = await createClient();
  let q = supabase.from("field_contacts").select("id, business_name, business_type, city, status, next_followup_on, assigned_to").neq("status", "non_interessato").order("status_changed_at", { ascending: false }).limit(400);
  if (type && type in BUSINESS_TYPES) q = q.eq("business_type", type);
  const { data } = await q;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex flex-col gap-4">
      <form method="get" className="flex flex-wrap gap-2"><input type="hidden" name="tab" value="pipeline" />
        <Select name="tipo" defaultValue={type ?? ""} aria-label="Tipologia" className="w-auto"><option value="">Tutte le tipologie</option>{Object.entries(BUSINESS_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
        <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
      </form>
      <p className="text-sm text-muted">Su smartphone scorri orizzontalmente. Usa ← → per spostare un contatto di uno stato; per «non interessato» apri la scheda.</p>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4">
        {PIPELINE.map((s) => {
          const items = (data ?? []).filter((c) => c.status === s);
          return (
            <section key={s} aria-label={CRM_STATUSES[s]} className="flex w-72 shrink-0 snap-start flex-col gap-2 rounded-2xl bg-mist p-3">
              <h2 className="flex justify-between px-1 text-sm font-bold">{CRM_STATUSES[s]}<span className="tabular-nums text-muted">{items.length}</span></h2>
              {items.length === 0 && <p className="px-1 text-xs text-muted">Nessun contatto</p>}
              {items.map((c) => {
                const n = neighbours(c.status);
                return (
                  <article key={c.id} className="rounded-xl border border-line bg-white p-3 text-sm">
                    <Link href={`/admin/acquisizione?contatto=${c.id}`} className="font-semibold hover:underline">{c.business_name}</Link>
                    <p className="text-xs text-muted">{label(BUSINESS_TYPES, c.business_type)} · {c.city ?? "—"}</p>
                    {c.next_followup_on && <Badge tone={c.next_followup_on < today ? "danger" : "neutral"} className="mt-1">Follow-up {formatDate(c.next_followup_on)}</Badge>}
                    <div className="mt-2 flex gap-1">
                      {n.prev && <ActionForm action={moveContact} submitLabel={`← ${CRM_STATUSES[n.prev]}`} size="sm" variant="ghost" hidden={{ id: c.id, status: n.prev }} />}
                      {n.next && <ActionForm action={moveContact} submitLabel={`${CRM_STATUSES[n.next]} →`} size="sm" variant="outline" hidden={{ id: c.id, status: n.next }} />}
                    </div>
                  </article>
                );
              })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

async function ContactList({ sp }: { sp: SP }) {
  const supabase = await createClient();
  const q = (one(sp.q) ?? "").replace(/[%,()]/g, " ").trim().slice(0, 60);
  const status = one(sp.stato);
  const type = one(sp.tipo);
  const overdue = one(sp.scaduti) === "1";
  const today = new Date().toISOString().slice(0, 10);
  let query = supabase.from("field_contacts").select("id, business_name, business_type, city, contact_name, status, next_followup_on, first_contact_on, source").order("updated_at", { ascending: false }).limit(300);
  if (q) query = query.or(`business_name.ilike.%${q}%,city.ilike.%${q}%,contact_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (status && status in CRM_STATUSES) query = query.eq("status", status);
  if (type && type in BUSINESS_TYPES) query = query.eq("business_type", type);
  if (overdue) query = query.lt("next_followup_on", today).not("status", "in", "(partner_attivo,non_interessato)");
  const [{ data }, { data: cats }] = await Promise.all([query, supabase.from("business_categories").select("slug, name").eq("active", true).order("position")]);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-4">
        <form method="get" className="flex flex-wrap gap-2" role="search"><input type="hidden" name="tab" value="contatti" />
          <Input name="q" defaultValue={q} placeholder="Nome, città, referente, email" aria-label="Cerca" className="w-56" />
          <Select name="stato" defaultValue={status ?? ""} aria-label="Stato" className="w-auto"><option value="">Tutti gli stati</option>{Object.entries(CRM_STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select name="tipo" defaultValue={type ?? ""} aria-label="Tipologia" className="w-auto"><option value="">Tutte le tipologie</option>{Object.entries(BUSINESS_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="scaduti" value="1" defaultChecked={overdue} /> Solo follow-up scaduti</label>
          <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
        </form>
        {!data?.length ? <EmptyState title="Nessun contatto" description="Aggiungi il primo potenziale partner con il modulo." /> : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {data.map((c) => (
              <li key={c.id}><Link href={`/admin/acquisizione?contatto=${c.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-mist">
                <span><span className="block font-semibold">{c.business_name}</span><span className="text-sm text-muted">{label(BUSINESS_TYPES, c.business_type)} · {c.city ?? "—"}{c.contact_name ? ` · ${c.contact_name}` : ""}{c.first_contact_on ? ` · primo contatto ${formatDate(c.first_contact_on)}` : ""}</span></span>
                <span className="flex flex-wrap gap-1"><Badge tone={statusTone(c.status)}>{label(CRM_STATUSES, c.status)}</Badge>{c.next_followup_on && <Badge tone={c.next_followup_on < today ? "danger" : "neutral"}>Follow-up {formatDate(c.next_followup_on)}</Badge>}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start"><h2 className="mb-3 font-bold">Nuovo potenziale partner</h2><CrmContactForm back="/admin/acquisizione" categories={cats ?? []} /></Card>
    </div>
  );
}

async function ContactDetail({ id }: { id: string }) {
  const supabase = await createClient();
  const [{ data: c }, { data: visits }, { data: history }, { data: apps }, { data: founding }, { data: cats }] = await Promise.all([
    supabase.from("field_contacts").select("*, professional_profiles(display_name, slug)").eq("id", id).maybeSingle(),
    supabase.from("field_visits").select("*").eq("contact_id", id).order("visited_on", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("field_contact_history").select("*").eq("contact_id", id).order("created_at", { ascending: false }).limit(100),
    supabase.from("partner_applications").select("id, program, status, created_at, message").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("founding_partners").select("*").eq("contact_id", id).maybeSingle(),
    supabase.from("business_categories").select("slug, name").eq("active", true).order("position"),
  ]);
  if (!c) return <EmptyState title="Contatto non trovato" action={<Link href="/admin/acquisizione?tab=contatti" className="underline">Torna ai contatti</Link>} />;
  const pro = c.professional_profiles as unknown as { display_name: string; slug: string } | null;
  const n = neighbours(c.status);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-2">
        <Link href="/admin/acquisizione?tab=contatti" className="text-sm font-semibold text-muted hover:text-ink">← Tutti i contatti</Link>
        <Link href={`/admin/field-manager?contatto=${c.id}`} className="text-sm font-semibold underline">Auto raccolte, autorizzazioni e ispezioni (Field Manager)</Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="flex flex-wrap items-center gap-2 text-xl font-bold">{c.business_name} <Badge tone={statusTone(c.status)}>{label(CRM_STATUSES, c.status)}</Badge>{founding?.status === "ammesso" && <Badge tone="dark">Founding Partner</Badge>}</h2>
            <p className="text-sm text-muted">{label(BUSINESS_TYPES, c.business_type)} · {[c.address, c.postal_code, c.city].filter(Boolean).join(", ") || "—"}</p>
            <p className="text-sm">{c.contact_name ?? "—"}{c.phone ? ` · ${c.phone}` : ""}{c.email ? ` · ${c.email}` : ""}</p>
            <p className="mt-1 text-xs text-muted">Primo contatto: {c.first_contact_on ? formatDate(c.first_contact_on) : "—"} · Stato aggiornato {formatDateTime(c.status_changed_at)}{c.lost_reason ? ` · Motivo: ${c.lost_reason}` : ""}</p>
            {pro && <p className="mt-1 text-sm">Profilo collegato: <Link className="underline" href={`/professionisti/${pro.slug}`}>{pro.display_name}</Link></p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {n.prev && <ActionForm action={moveContact} submitLabel={`← ${CRM_STATUSES[n.prev]}`} size="sm" variant="ghost" hidden={{ id: c.id, status: n.prev }} />}
              {n.next && <ActionForm action={moveContact} submitLabel={`${CRM_STATUSES[n.next]} →`} size="sm" hidden={{ id: c.id, status: n.next }} />}
              <ActionForm action={assignContact} submitLabel={c.assigned_to ? "Rimuovi assegnazione" : "Assegna a me"} size="sm" variant="outline" hidden={{ id: c.id, unassign: c.assigned_to ? "1" : undefined }} />
            </div>
            {c.status !== "non_interessato" && (
              <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-orange-700">Segna come non interessato</summary>
                <ActionForm action={moveContact} submitLabel="Conferma" size="sm" variant="outline" hidden={{ id: c.id, status: "non_interessato" }} className="mt-2">
                  {((s: FormState) => <Field id="lr" label="Motivo" error={s.fieldErrors?.lost_reason}><Input id="lr" name="lost_reason" /></Field>)(initialFormState)}
                </ActionForm>
              </details>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Interazioni ({visits?.length ?? 0})</h2>
            {!visits?.length ? <p className="text-sm text-muted">Nessuna telefonata, visita o nota registrata.</p> : (
              <ol className="flex flex-col gap-3">{visits.map((v) => (
                <li key={v.id} className="rounded-xl border border-line p-3 text-sm">
                  <p className="font-semibold">{label(INTERACTION_KINDS, v.kind)} · {formatDate(v.visited_on)}{v.met_contact_name ? ` · con ${v.met_contact_name}` : ""}{v.interest_level ? ` · interesse ${label(INTEREST_LEVELS, v.interest_level).toLowerCase()}` : ""}</p>
                  {(v.cars_available !== null || v.neo_cars_available !== null) && <p className="text-muted">Auto disponibili: {v.cars_available ?? "—"} · per neopatentati (stima): {v.neo_cars_available ?? "—"}</p>}
                  {v.outcome && <p>Esito: {v.outcome}</p>}
                  {v.notes && <p className="whitespace-pre-line text-muted">{v.notes}</p>}
                  {v.next_action && <p className="mt-1 font-medium">Prossima azione: {v.next_action}{v.next_action_on ? ` (${formatDate(v.next_action_on)})` : ""}</p>}
                </li>
              ))}</ol>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Storico delle modifiche</h2>
            {!history?.length ? <p className="text-sm text-muted">Nessuna modifica registrata.</p> : (
              <ol className="flex flex-col gap-1 text-sm">{history.map((h) => (
                <li key={h.id} className="flex flex-wrap gap-2"><span className="text-muted tabular-nums">{formatDateTime(h.created_at)}</span><span>{historyText(h.field, h.old_value, h.new_value)}</span></li>
              ))}</ol>
            )}
          </Card>
          {!!apps?.length && <Card className="p-5"><h2 className="mb-2 font-bold">Candidature dal sito</h2><ul className="text-sm">{apps.map((a) => <li key={a.id}>{formatDate(a.created_at)} · {label(PROGRAMS, a.program)} · {label(APPLICATION_STATUSES, a.status)}{a.message ? ` — «${a.message.slice(0, 140)}»` : ""}</li>)}</ul></Card>}
        </div>
        <div className="flex flex-col gap-6">
          <Card className="p-5"><h2 className="mb-3 font-bold">Registra attività</h2><CrmInteractionForm contactId={c.id} back="/admin/acquisizione" /></Card>
          <Card className="p-5">
            <h2 className="mb-2 font-bold">Founding Partners</h2>
            <p className="mb-3 text-sm text-muted">Il badge pubblico compare solo se il partner è ammesso <em>e</em> collegato a un profilo professionale pubblicato.</p>
            {founding?.status === "ammesso" ? (
              <ActionForm action={setFoundingPartner} submitLabel="Revoca ammissione" variant="outline" size="sm" hidden={{ contact_id: c.id, admit: "0" }} confirm="Revocare l'ammissione al programma?">
                <Field id="fr" label="Motivazione della revoca"><Input id="fr" name="note" /></Field>
              </ActionForm>
            ) : (
              <ActionForm action={setFoundingPartner} submitLabel="Ammetti al programma" size="sm" hidden={{ contact_id: c.id, admit: "1" }} confirm="Confermi l'ammissione? Il badge sarà visibile sul profilo collegato.">
                {((s: FormState) => (<div className="grid gap-2">
                  <Field id="fp" label="Profilo pubblico (indirizzo o slug)" optional error={s.fieldErrors?.profile_slug} hint={pro ? `Collegato: ${pro.slug}` : undefined}><Input id="fp" name="profile_slug" defaultValue={pro?.slug ?? ""} /></Field>
                  <Field id="fn" label="Note di onboarding" optional><Textarea id="fn" name="note" rows={2} /></Field>
                </div>))(initialFormState)}
              </ActionForm>
            )}
          </Card>
          <Card className="p-5"><h2 className="mb-3 font-bold">Dati del contatto</h2><CrmContactForm c={c} back="/admin/acquisizione" categories={cats ?? []} /></Card>
        </div>
      </div>
    </div>
  );
}

function historyText(field: string, oldV: string | null, newV: string | null) {
  if (field === "creazione") return `Contatto creato (${label(CRM_STATUSES, newV)})`;
  if (field === "status") return `Stato: ${label(CRM_STATUSES, oldV)} → ${label(CRM_STATUSES, newV)}`;
  if (field === "interazione") return `Attività: ${newV ?? ""}`;
  if (field === "founding") return `Founding Partners: ${newV}`;
  if (field === "assigned_to") return newV ? "Assegnato a un membro dello staff" : "Assegnazione rimossa";
  if (field === "business_type") return `Tipologia: ${label(BUSINESS_TYPES, oldV)} → ${label(BUSINESS_TYPES, newV)}`;
  return `Categoria: ${oldV ?? "—"} → ${newV ?? "—"}`;
}

async function Applications({ status }: { status?: string }) {
  const supabase = await createClient();
  let q = supabase.from("partner_applications").select("*").order("created_at", { ascending: false }).limit(200);
  if (status && status in APPLICATION_STATUSES) q = q.eq("status", status);
  else q = q.in("status", ["nuova", "in_esame"]);
  const { data } = await q;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/admin/acquisizione?tab=candidature" className="rounded-full border border-line px-3 py-1">Da esaminare</Link>
        {Object.entries(APPLICATION_STATUSES).map(([k, l]) => <Link key={k} href={`/admin/acquisizione?tab=candidature&stato=${k}`} className={`rounded-full border px-3 py-1 ${status === k ? "border-ink bg-ink text-white" : "border-line"}`}>{l}</Link>)}
      </div>
      {!data?.length ? <EmptyState title="Nessuna candidatura" description="Le candidature inviate da /partner, /diventa-partner e dalle landing compaiono qui." /> : data.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-bold">{a.business_name} <Badge tone="neutral">{label(BUSINESS_TYPES, a.applicant_type)}</Badge> <Badge tone={a.status === "accettata" ? "success" : a.status === "rifiutata" ? "danger" : "orange"}>{label(APPLICATION_STATUSES, a.status)}</Badge>{a.founding_interest && <Badge tone="dark" className="ml-1">Interesse Founding</Badge>}</h2>
              <p className="text-sm text-muted">{label(PROGRAMS, a.program)} · ricevuta {formatDateTime(a.created_at)}{a.landing_path ? ` · da ${a.landing_path}` : ""}{a.utm_campaign ? ` · campagna ${a.utm_campaign}` : ""}</p>
              <p className="text-sm">{a.contact_name} · {a.email} · {a.phone} · {[a.address, a.city].filter(Boolean).join(", ")}{a.cars_available !== null ? ` · ${a.cars_available} auto dichiarate` : ""}</p>
              {a.message && <p className="mt-2 whitespace-pre-line text-sm">{a.message}</p>}
            </div>
            {a.contact_id && <Link className="text-sm font-semibold underline" href={`/admin/acquisizione?contatto=${a.contact_id}`}>Scheda CRM</Link>}
          </div>
          {(a.status === "nuova" || a.status === "in_esame") && (
            <ActionForm action={reviewApplication} submitLabel="Salva decisione" size="sm" hidden={{ id: a.id }} className="mt-3">
              <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                <Select name="status" aria-label="Decisione" defaultValue="in_esame"><option value="in_esame">In esame</option><option value="accettata">Accetta (contatto → in attesa di registrazione)</option><option value="rifiutata">Rifiuta</option><option value="duplicata">Duplicata</option></Select>
                <Input name="note" aria-label="Nota" placeholder="Nota interna (obbligatoria per il rifiuto)" />
              </div>
            </ActionForm>
          )}
          {a.decision_note && <p className="mt-2 text-sm text-muted">Nota: {a.decision_note}</p>}
        </Card>
      ))}
    </div>
  );
}

async function Founding() {
  const supabase = await createClient();
  const { data } = await supabase.from("founding_partners").select("*, field_contacts(business_name, city, business_type), professional_profiles(display_name, slug, is_published)").order("admitted_at", { ascending: false });
  const admitted = (data ?? []).filter((f) => f.status === "ammesso").length;
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info" title={`${admitted} / 20 Founding Partners ammessi`}>Benefici del programma (senza prezzi né sconti permanenti, che richiedono l&apos;approvazione del fondatore): registrazione gratuita alla Beta, assistenza iniziale, configurazione del profilo, aiuto nella pubblicazione degli annunci, canale diretto di assistenza, possibilità di dare feedback. Per ammettere un partner apri la sua scheda CRM.</Alert>
      {!data?.length ? <EmptyState title="Nessun Founding Partner" description="Ammetti i primi partner dalla scheda del contatto." /> : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {data.map((f) => {
            const c = f.field_contacts as unknown as { business_name: string; city: string | null; business_type: string } | null;
            const p = f.professional_profiles as unknown as { display_name: string; slug: string; is_published: boolean } | null;
            return (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <span><Link className="font-semibold hover:underline" href={`/admin/acquisizione?contatto=${f.contact_id}`}>{c?.business_name ?? "—"}</Link> <span className="text-muted">· {label(BUSINESS_TYPES, c?.business_type)} · {c?.city ?? "—"} · ammesso il {formatDate(f.admitted_at)}</span></span>
                <span className="flex gap-1"><Badge tone={f.status === "ammesso" ? "success" : "neutral"}>{f.status}</Badge>{p ? <Badge tone={p.is_published ? "success" : "warning"}>{p.is_published ? "Badge visibile" : "Profilo non pubblicato"}</Badge> : <Badge tone="warning">Nessun profilo collegato</Badge>}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function Beta() {
  const supabase = await createClient();
  const { data } = await supabase.from("beta_signups").select("*").order("created_at", { ascending: false }).limit(500);
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">La piattaforma non invia inviti automatici: scrivi tu agli iscritti e segna qui lo stato. Usa gli indirizzi solo per la Beta (come indicato nel modulo).</Alert>
      {!data?.length ? <EmptyState title="Nessun iscritto" description="Le iscrizioni dal modulo «Entra nella Beta» compaiono qui." /> : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-mist text-left"><tr><th className="p-3">Email</th><th className="p-3">Profilo</th><th className="p-3">Città</th><th className="p-3">Origine</th><th className="p-3">Data</th><th className="p-3">Stato</th></tr></thead>
            <tbody className="divide-y divide-line">{data.map((b) => (
              <tr key={b.id}><td className="p-3">{b.email}</td><td className="p-3">{label(BETA_AUDIENCES, b.audience)}</td><td className="p-3">{b.city ?? "—"}</td><td className="p-3">{b.utm_campaign ?? b.landing_path ?? "—"}</td><td className="p-3">{formatDate(b.created_at)}</td>
                <td className="p-3"><ActionForm action={updateBetaSignup} submitLabel="Aggiorna" size="sm" variant="outline" hidden={{ id: b.id }} className="flex items-center gap-2"><Select name="status" aria-label="Stato" defaultValue={b.status} className="w-auto"><option value="iscritto">Iscritto</option><option value="invitato">Invitato</option><option value="attivo">Attivo</option><option value="annullato">Annullato</option></Select></ActionForm></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
