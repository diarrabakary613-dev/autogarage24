import type { Metadata } from "next";
import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, EmptyState } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { FileUploader } from "@/components/ui/file-uploader";
import { AdminPage } from "@/components/admin/simple";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { publishInspection, saveInspection, saveSellerAuthorization } from "@/lib/actions/field";
import { INSPECTION_ITEMS } from "@/lib/field-items";
import { LISTING_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { BUSINESS_TYPES, CRM_STATUSES, statusTone } from "@/lib/crm";
import { CrmContactForm, CrmInteractionForm } from "@/components/admin/crm-forms";

export const metadata: Metadata = { title: "Field Manager", robots: { index: false } };
const TYPES: Record<string, string> = BUSINESS_TYPES;
const STATUSES: Record<string, string> = CRM_STATUSES;
const RESULTS: Record<string, string> = { controllato: "Controllato", da_monitorare: "Da monitorare", riparazione_consigliata: "Riparazione consigliata", non_controllato: "Non controllato", non_applicabile: "Non applicabile" };

export default function FieldManagerPage(props: PageProps<"/admin/field-manager">) {
  return <AdminPage title="Field Manager" description="Visite sul territorio, contatti commerciali e automobili raccolte. Dati riservati: nulla viene pubblicato senza l'autorizzazione documentata del venditore."><Content searchParams={props.searchParams} /></AdminPage>;
}

async function Content({ searchParams }: { searchParams: PageProps<"/admin/field-manager">["searchParams"] }) {
  const me = await requirePermission("field.manage", "/admin/field-manager");
  const sp = await searchParams;
  const supabase = await createClient();
  const contactId = typeof sp.contatto === "string" && /^[0-9a-f-]{36}$/.test(sp.contatto) ? sp.contatto : null;
  if (contactId) return <ContactDetail id={contactId} userId={me.id} supabase={supabase} />;
  const q = typeof sp.q === "string" ? sp.q.replace(/[%,()]/g, " ").trim().slice(0, 60) : "";
  const status = typeof sp.stato === "string" && sp.stato in STATUSES ? sp.stato : "";
  const type = typeof sp.tipo === "string" && sp.tipo in TYPES ? sp.tipo : "";
  let query = supabase.from("field_contacts").select("*").order("next_followup_on", { ascending: true, nullsFirst: false }).order("updated_at", { ascending: false }).limit(200);
  if (q) query = query.or(`business_name.ilike.%${q}%,city.ilike.%${q}%,contact_name.ilike.%${q}%`);
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("business_type", type);
  const { data } = await query;
  const today = new Date().toISOString().slice(0, 10);
  const due = (data ?? []).filter((c) => c.next_followup_on && c.next_followup_on <= today);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        {due.length > 0 && <Alert tone="warning" title={`${due.length} follow-up da fare`}>{due.map((c) => <Link key={c.id} className="mr-3 underline" href={`/admin/field-manager?contatto=${c.id}`}>{c.business_name}</Link>)}</Alert>}
        <form method="get" className="flex flex-wrap gap-2" role="search">
          <Input name="q" defaultValue={q} placeholder="Nome, città o referente" aria-label="Cerca" className="w-56" />
          <Select name="stato" defaultValue={status} aria-label="Stato" className="w-auto"><option value="">Tutti gli stati</option>{Object.entries(STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <Select name="tipo" defaultValue={type} aria-label="Tipologia" className="w-auto"><option value="">Tutte le tipologie</option>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
          <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
        </form>
        {!data?.length ? <EmptyState title="Nessun contatto" description="Registra la prima visita con il modulo." /> : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            {data.map((c) => (
              <li key={c.id}><Link href={`/admin/field-manager?contatto=${c.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-mist">
                <span><span className="block font-semibold">{c.business_name}</span><span className="text-sm text-muted">{TYPES[c.business_type]} · {c.city ?? "—"}{c.contact_name ? ` · ${c.contact_name}` : ""}</span></span>
                <span className="flex flex-wrap gap-1"><Badge tone={statusTone(c.status)}>{STATUSES[c.status]}</Badge>{c.next_followup_on && <Badge tone={c.next_followup_on <= today ? "danger" : "neutral"}>Follow-up {formatDate(c.next_followup_on)}</Badge>}</span>
              </Link></li>
            ))}
          </ul>
        )}
      </div>
      <Card className="p-5 lg:sticky lg:top-24 lg:self-start">
        <h2 className="mb-3 font-bold">Nuovo contatto</h2>
        <CrmContactForm back="/admin/field-manager" />
      </Card>
    </div>
  );
}

async function ContactDetail({ id, userId, supabase }: { id: string; userId: string; supabase: Awaited<ReturnType<typeof createClient>> }) {
  const [{ data: c }, { data: visits }, { data: listings }] = await Promise.all([
    supabase.from("field_contacts").select("*, professional_profiles(display_name, slug)").eq("id", id).maybeSingle(),
    supabase.from("field_visits").select("*").eq("contact_id", id).order("visited_on", { ascending: false }),
    supabase.from("vehicle_listings").select("id, slug, title, status, seller_authorizations(id, authorized_by_name, authorized_on, method, listing_authorized, photos_authorized, revoked_at), vehicle_inspections(id, inspected_on, status, inspector_name)").eq("field_contact_id", id).order("created_at", { ascending: false }),
  ]);
  if (!c) return <EmptyState title="Contatto non trovato" action={<Link href="/admin/field-manager" className="underline">Torna all&apos;elenco</Link>} />;
  const pro = c.professional_profiles as unknown as { display_name: string; slug: string } | null;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap justify-between gap-2"><Link href="/admin/field-manager" className="text-sm font-semibold text-muted hover:text-ink">← Tutti i contatti</Link><Link href={`/admin/acquisizione?contatto=${id}`} className="text-sm font-semibold underline">Scheda CRM completa (pipeline, storico, Founding)</Link></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="text-xl font-bold">{c.business_name} <Badge tone="orange">{STATUSES[c.status]}</Badge></h2>
            <p className="text-sm text-muted">{TYPES[c.business_type]} · {[c.address, c.city].filter(Boolean).join(", ")} · {c.contact_name ?? ""} {c.phone ? `· ${c.phone}` : ""} {c.email ? `· ${c.email}` : ""}</p>
            {pro && <p className="mt-1 text-sm">Profilo collegato: <Link className="underline" href={`/professionisti/${pro.slug}`}>{pro.display_name}</Link></p>}
            {c.notes && <p className="mt-2 text-sm whitespace-pre-line">{c.notes}</p>}
          </Card>
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Automobili raccolte</h2><ButtonLink href={`/dashboard/annunci/nuovo?contatto=${c.id}`} size="sm">Nuova auto raccolta</ButtonLink></div>
            {!listings?.length ? <p className="text-sm text-muted">Nessuna automobile raccolta presso questo contatto.</p> : (
              <ul className="flex flex-col gap-4">
                {listings.map((l) => {
                  const auths = (l.seller_authorizations ?? []) as { id: string; authorized_by_name: string; authorized_on: string; method: string; listing_authorized: boolean; photos_authorized: boolean; revoked_at: string | null }[];
                  const ok = auths.some((a) => a.listing_authorized && a.photos_authorized && !a.revoked_at);
                  const insp = (l.vehicle_inspections ?? []) as { id: string; inspected_on: string; status: string; inspector_name: string }[];
                  return (
                    <li key={l.id} className="rounded-xl border border-line p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold">{l.title} <Badge tone="neutral">{LISTING_STATUS_LABELS[l.status]}</Badge></p>
                        <span className="flex gap-2"><Link className="text-sm underline" href={`/dashboard/annunci/${l.id}`}>Dati e foto</Link>{l.status === "pubblicato" && <Link className="text-sm underline" href={`/auto/${l.slug}`}>Pubblico</Link>}</span>
                      </div>
                      <p className={`mt-1 text-sm ${ok ? "text-success" : "text-danger"}`}>{ok ? `Autorizzazione del venditore registrata (${auths.filter((a) => !a.revoked_at).map((a) => `${a.authorized_by_name}, ${formatDate(a.authorized_on)}`).join("; ")})` : "Manca l'autorizzazione del venditore: l'annuncio non può essere pubblicato."}</p>
                      <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-orange-700">Registra autorizzazione</summary>
                        <ActionForm action={saveSellerAuthorization} submitLabel="Salva autorizzazione" size="sm" hidden={{ listing_id: l.id, contact_id: c.id }} className="mt-3">
                          {(s) => (<div className="grid gap-2 sm:grid-cols-2">
                            <Field id={`ab-${l.id}`} label="Autorizzato da" error={s.fieldErrors?.authorized_by_name}><Input id={`ab-${l.id}`} name="authorized_by_name" /></Field>
                            <Field id={`ao-${l.id}`} label="Data"><Input id={`ao-${l.id}`} name="authorized_on" type="date" /></Field>
                            <Field id={`am-${l.id}`} label="Modalità" error={s.fieldErrors?.method}><Select id={`am-${l.id}`} name="method"><option value="modulo_firmato">Modulo firmato</option><option value="email">Email</option><option value="messaggio_scritto">Messaggio scritto</option><option value="altro_documentato">Altro documentato</option></Select></Field>
                            <Field id={`as-${l.id}`} label="Cosa è stato autorizzato" error={s.fieldErrors?.scope}><Input id={`as-${l.id}`} name="scope" placeholder="Pubblicazione annuncio, foto e prezzo" /></Field>
                            <div className="flex flex-wrap gap-3 sm:col-span-2"><Checkbox id={`la-${l.id}`} name="listing_authorized" label="Pubblicazione" /><Checkbox id={`pa-${l.id}`} name="photos_authorized" label="Fotografie" /><Checkbox id={`pc-${l.id}`} name="price_confirmed" label="Prezzo confermato" /><Checkbox id={`av-${l.id}`} name="availability_confirmed" label="Disponibilità confermata" /></div>
                            <div className="sm:col-span-2"><FileUploader bucket="field-documents" folder={userId} kind="document" label="Allega il documento (privato)" name="document_path" /></div>
                          </div>)}
                        </ActionForm>
                      </details>
                      <div className="mt-3 text-sm">
                        <p className="font-semibold">Controllo AutoGarage24</p>
                        {insp.map((i) => <p key={i.id} className="flex flex-wrap items-center gap-2">{formatDate(i.inspected_on)} · {i.inspector_name} · {i.status}{i.status === "bozza" && <ActionForm action={publishInspection} submitLabel="Pubblica" size="sm" variant="outline" hidden={{ id: i.id }} confirm="Pubblicare l'ispezione sulla scheda?" />}</p>)}
                        <details className="mt-2"><summary className="cursor-pointer font-semibold text-orange-700">Nuova ispezione</summary>
                          <ActionForm action={saveInspection} submitLabel="Salva ispezione (bozza)" size="sm" hidden={{ listing_id: l.id }} className="mt-3">
                            {(s) => (<div className="grid gap-2">
                              <div className="grid gap-2 sm:grid-cols-3">
                                <Field id={`in-${l.id}`} label="Eseguita da" error={s.fieldErrors?.inspector_name}><Input id={`in-${l.id}`} name="inspector_name" /></Field>
                                <Field id={`id-${l.id}`} label="Data"><Input id={`id-${l.id}`} name="inspected_on" type="date" /></Field>
                                <Field id={`ik-${l.id}`} label="Km"><Input id={`ik-${l.id}`} name="mileage_km" inputMode="numeric" /></Field>
                              </div>
                              {INSPECTION_ITEMS.map((it, i) => (
                                <div key={it} className="grid grid-cols-[1fr_170px] items-end gap-2 sm:grid-cols-[180px_170px_1fr]">
                                  <span className="text-sm font-medium">{it}</span>
                                  <Select name={`r_${i}`} aria-label={`Esito ${it}`} defaultValue="non_controllato">{Object.entries(RESULTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                                  <Input name={`n_${i}`} aria-label={`Nota ${it}`} placeholder="Nota" className="col-span-2 sm:col-span-1" />
                                </div>
                              ))}
                              <Field id={`io-${l.id}`} label="Osservazioni" optional><Textarea id={`io-${l.id}`} name="observations" rows={2} /></Field>
                              <Field id={`ir-${l.id}`} label="Riparazioni consigliate" optional><Textarea id={`ir-${l.id}`} name="recommended_repairs" rows={2} /></Field>
                            </div>)}
                          </ActionForm>
                        </details>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Storico attività</h2>
            {!visits?.length ? <p className="text-sm text-muted">Nessuna attività registrata.</p> : <ol className="flex flex-col gap-2 text-sm">{visits.map((v) => <li key={v.id} className="rounded-lg bg-mist p-3"><strong>{formatDate(v.visited_on)} · {v.kind}</strong>{v.outcome ? ` — ${v.outcome}` : ""}{v.notes && <p className="mt-1 whitespace-pre-line">{v.notes}</p>}</li>)}</ol>}
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Registra visita o contatto</h2>
            <CrmInteractionForm contactId={c.id} back="/admin/field-manager" />
          </Card>
          <Card className="p-5"><h2 className="mb-3 font-bold">Dati del contatto</h2><CrmContactForm c={c} back="/admin/field-manager" /></Card>
        </div>
      </div>
    </div>
  );
}
