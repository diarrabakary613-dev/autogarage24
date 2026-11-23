import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { adminVerifyListing } from "@/lib/actions/listing-extras";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader, TabLinks } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { adminDeleteListing, adminEditListing, adminModerateListing, adminModeratePart, adminToggleService } from "@/lib/actions/admin";
import { formatKm, formatPrice } from "@/lib/format";
import { BODY_LABELS, FUEL_LABELS, LISTING_STATUS_LABELS, NEO_LABELS, PART_CONDITION_LABELS, PART_STATUS_LABELS } from "@/lib/labels";
import { publicFileUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import type { Enums, Tables } from "@/lib/supabase/database.types";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Moderazione", robots: { index: false } };

export default function ModerationPage(props: PageProps<"/admin/moderazione">) {
  return (
    <>
      <PageHeader title="Moderazione" description="Nessun annuncio diventa pubblico senza approvazione. Rifiuti, richieste di modifica e sospensioni richiedono una motivazione, visibile al venditore." />
      <Suspense fallback={<Skeleton className="h-96" />}><Moderation searchParams={props.searchParams} /></Suspense>
    </>
  );
}

const LISTING_STATES: Enums<"listing_status">[] = ["in_revisione", "approvato", "pubblicato", "sospeso", "rifiutato"];
const PART_STATES: Enums<"part_status">[] = ["in_revisione", "approvato", "pubblicato", "sospeso", "rifiutato"];

async function Moderation({ searchParams }: { searchParams: PageProps<"/admin/moderazione">["searchParams"] }) {
  await requirePermission("listings.moderate", "/admin/moderazione");
  const sp = await searchParams;
  const tab = sp.tab === "ricambi" ? "ricambi" : sp.tab === "servizi" ? "servizi" : "auto";
  const supabase = await createClient();
  return (
    <>
      <TabLinks current={tab} items={[{ key: "auto", label: "Automobili", href: "/admin/moderazione" }, { key: "ricambi", label: "Ricambi", href: "/admin/moderazione?tab=ricambi" }, { key: "servizi", label: "Servizi", href: "/admin/moderazione?tab=servizi" }]} />
      {tab === "auto" && <Listings supabase={supabase} status={(LISTING_STATES as string[]).includes(String(sp.stato)) ? (sp.stato as Enums<"listing_status">) : "in_revisione"} f={{ marca: typeof sp.marca === "string" ? sp.marca : "", modello: typeof sp.modello === "string" ? sp.modello : "", min: Number(sp.prezzo_min) || 0, max: Number(sp.prezzo_max) || 0, neo: sp.neo === "1", carrozzeria: typeof sp.carrozzeria === "string" ? sp.carrozzeria : "" }} />}
      {tab === "ricambi" && <Parts supabase={supabase} status={(PART_STATES as string[]).includes(String(sp.stato)) ? (sp.stato as Enums<"part_status">) : "in_revisione"} />}
      {tab === "servizi" && <Services supabase={supabase} />}
    </>
  );
}

type SB = Awaited<ReturnType<typeof createClient>>;

type LF = { marca: string; modello: string; min: number; max: number; neo: boolean; carrozzeria: string };
async function Listings({ supabase, status, f }: { supabase: SB; status: Enums<"listing_status">; f: LF }) {
  const clean = (x: string) => x.replace(/[%,()]/g, " ").trim().slice(0, 60);
  let q = supabase.from("vehicle_listings")
    .select("*, vehicles!inner(*), vehicle_images(storage_path, is_cover, position), seller_authorizations(listing_authorized, photos_authorized, revoked_at), vehicle_inspections(id, status)")
    .eq("status", status);
  if (f.marca) q = q.ilike("vehicles.make_name", `%${clean(f.marca)}%`);
  if (f.modello) q = q.ilike("vehicles.model", `%${clean(f.modello)}%`);
  if (f.min > 0) q = q.gte("price_cents", Math.round(f.min * 100));
  if (f.max > 0) q = q.lte("price_cents", Math.round(f.max * 100));
  if (f.neo) q = q.eq("neo_result", "compatibile");
  if (f.carrozzeria && f.carrozzeria in BODY_LABELS) q = q.eq("vehicles.body_type", f.carrozzeria as Enums<"body_type">);
  const { data } = await q.order("updated_at", { ascending: true }).limit(50);
  return (
    <>
      <StateFilter base="/admin/moderazione?tab=auto" states={LISTING_STATES} labels={LISTING_STATUS_LABELS} current={status} />
      <form method="get" className="mb-4 flex flex-wrap gap-2" role="search">
        <input type="hidden" name="tab" value="auto" /><input type="hidden" name="stato" value={status} />
        <Input name="marca" defaultValue={f.marca} placeholder="Marca" aria-label="Marca" className="w-36" />
        <Input name="modello" defaultValue={f.modello} placeholder="Modello" aria-label="Modello" className="w-36" />
        <Input name="prezzo_min" defaultValue={f.min || ""} placeholder="Prezzo da (€)" aria-label="Prezzo minimo" inputMode="numeric" className="w-32" />
        <Input name="prezzo_max" defaultValue={f.max || ""} placeholder="Prezzo a (€)" aria-label="Prezzo massimo" inputMode="numeric" className="w-32" />
        <Select name="carrozzeria" defaultValue={f.carrozzeria} aria-label="Categoria" className="w-auto"><option value="">Tutte le categorie</option>{Object.entries(BODY_LABELS).map(([k, lab]) => <option key={k} value={k}>{lab}</option>)}</Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="neo" value="1" defaultChecked={f.neo} /> Solo adatte ai neopatentati</label>
        <button className="rounded-md bg-ink px-4 text-sm font-semibold text-white">Filtra</button>
      </form>
      {!data?.length ? <EmptyState title="Nessun annuncio in questo stato" /> : (
        <ul className="flex flex-col gap-4">
          {data.map((l) => {
            const v = l.vehicles as unknown as Tables<"vehicles">;
            const imgs = [...(l.vehicle_images ?? [])].sort((a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position);
            const auths = (l.seller_authorizations ?? []) as { listing_authorized: boolean; photos_authorized: boolean; revoked_at: string | null }[];
            const authorized = auths.some((a) => a.listing_authorized && a.photos_authorized && !a.revoked_at);
            const inspections = (l.vehicle_inspections ?? []) as { id: string; status: string }[];
            const checks: [string, boolean][] = [
              ["Anno", Boolean(v.year)], ["Km", v.mileage_km !== null], ["Alimentazione", Boolean(v.fuel)], ["Cambio", Boolean(v.transmission)],
              ["Prezzo", l.price_cents !== null], ["Città", Boolean(l.city)], ["Descrizione", Boolean(l.description)], ["Foto", imgs.length > 0],
              ["Dichiarazioni", Boolean(l.declared_accuracy_at && l.declared_right_to_publish_at && l.declared_photo_rights_at && l.accepted_terms_at)],
              ["Potenza/tara (neo)", Boolean(v.power_kw && (v.tare_kg || v.power_to_tare_documented))],
              ...(l.source === "field_manager" ? [["Autorizzazione venditore", authorized] as [string, boolean]] : []),
            ];
            return (
              <li key={l.id}>
                <Card className="grid gap-4 p-4 md:grid-cols-[180px_1fr]">
                  <div className="flex gap-2 overflow-x-auto md:flex-col">
                    {imgs.slice(0, 3).map((i) => publicFileUrl("listing-images", i.storage_path) && <div key={i.storage_path} className="relative aspect-[4/3] w-40 shrink-0 overflow-hidden rounded-lg bg-mist md:w-full"><Image src={publicFileUrl("listing-images", i.storage_path)!} alt="" fill sizes="180px" className="object-cover" /></div>)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold">{l.title}</p>
                      <Badge tone="neutral">{l.seller_kind}</Badge>{l.source === "field_manager" && <Badge tone="orange">Field Manager</Badge>}
                      {l.neo_result && <Badge tone={l.neo_result === "compatibile" ? "success" : l.neo_result === "non_compatibile" ? "danger" : "warning"}>Neo: {NEO_LABELS[l.neo_result]}</Badge>}
                    </div>
                    <p className="text-sm text-muted">{v.make_name} {v.model} {v.version ?? ""} · {v.year ?? "anno ?"} · {formatKm(v.mileage_km)} · {v.fuel ? FUEL_LABELS[v.fuel] : "alim. ?"} · {formatPrice(l.price_cents)} · {l.city ?? "città ?"} · aggiornato il {formatDate(l.updated_at)}</p>
                    {l.description && <p className="line-clamp-3 text-sm">{l.description}</p>}
                    <ul className="flex flex-wrap gap-1.5">{checks.map(([k, okv]) => <li key={k}><Badge tone={okv ? "success" : "danger"}>{okv ? "✓" : "✗"} {k}</Badge></li>)}</ul>
                    {inspections.length > 0 && <p className="text-sm">Ispezioni: {inspections.map((i) => i.status).join(", ")}. Un&apos;auto può essere presentata come controllata solo con un&apos;ispezione pubblicata.</p>}
                    {l.status_note && <Alert tone="info">Nota precedente: {l.status_note}</Alert>}
                    {status !== "rifiutato" && <ActionForm action={adminModerateListing} submitLabel="Applica" size="sm" hidden={{ id: l.id }}>
                      <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                        <Field id={`a-${l.id}`} label="Decisione">
                          <Select id={`a-${l.id}`} name="action" defaultValue={status === "in_revisione" ? "approva_pubblica" : status === "sospeso" ? "riattiva" : "sospendi"}>
                            {status === "in_revisione" && <><option value="approva_pubblica">Approva e pubblica</option><option value="approva">Approva (pubblica il venditore)</option><option value="richiedi_modifiche">Richiedi modifiche</option><option value="rifiuta">Rifiuta</option></>}
                            {status === "approvato" && <><option value="approva_pubblica">Pubblica</option><option value="rifiuta">Rifiuta</option></>}
                            {status === "pubblicato" && <option value="sospendi">Sospendi</option>}
                            {status === "sospeso" && <option value="riattiva">Riattiva</option>}
                          </Select>
                        </Field>
                        <Field id={`n-${l.id}`} label="Motivazione (visibile al venditore)"><Input id={`n-${l.id}`} name="note" maxLength={1000} /></Field>
                      </div>
                    </ActionForm>}
                    {l.status === "pubblicato" && <Link href={`/auto/${l.slug}`} className="text-sm font-semibold text-orange-700 hover:underline">Apri l&apos;annuncio pubblico</Link>}
                    <details><summary className="cursor-pointer text-sm font-semibold text-orange-700">Modifica testo e prezzo</summary>
                      <ActionForm action={adminEditListing} submitLabel="Salva modifica" size="sm" hidden={{ id: l.id }} className="mt-2">
                        {((s: FormState) => (<div className="grid gap-2">
                          <Field id={`et-${l.id}`} label="Titolo"><Input id={`et-${l.id}`} name="title" defaultValue={l.title} /></Field>
                          <Field id={`ed-${l.id}`} label="Descrizione" optional><Textarea id={`ed-${l.id}`} name="description" rows={4} defaultValue={l.description ?? ""} /></Field>
                          <Field id={`ep-${l.id}`} label="Prezzo (€)" optional error={s.fieldErrors?.price}><Input id={`ep-${l.id}`} name="price" inputMode="decimal" defaultValue={l.price_cents ? String(l.price_cents / 100) : ""} /></Field>
                          <Field id={`er-${l.id}`} label="Motivazione (inviata al venditore)" error={s.fieldErrors?.reason}><Input id={`er-${l.id}`} name="reason" /></Field>
                        </div>))(initialFormState)}
                      </ActionForm>
                    </details>
                    <details><summary className="cursor-pointer text-sm font-semibold text-orange-700">Verifica documentata (badge sulla scheda)</summary>
                      <ActionForm action={adminVerifyListing} submitLabel="Registra" size="sm" hidden={{ listing_id: l.id }} className="mt-2">
                        {((s: FormState) => (<div className="grid gap-2">
                          <Field id={`vk-${l.id}`} label="Tipo di verifica"><Select id={`vk-${l.id}`} name="kind"><option value="documentazione">Documentazione (libretto, CdP)</option><option value="identita_venditore">Identità del venditore</option><option value="dati_tecnici">Dati tecnici (telaio, km)</option></Select></Field>
                          <Field id={`ve-${l.id}`} label="Documenti esaminati / motivo" error={s.fieldErrors?.evidence} hint="Resta nel registro: es. «Carta di circolazione visionata il 19/11, telaio corrispondente»."><Input id={`ve-${l.id}`} name="evidence" /></Field>
                          <Checkbox id={`vr-${l.id}`} name="revoke" label="Revoca una verifica esistente" />
                        </div>))(initialFormState)}
                      </ActionForm>
                    </details>
                    {["rifiutato", "sospeso", "scaduto", "bozza"].includes(l.status) && (
                      <details><summary className="cursor-pointer text-sm font-semibold text-danger">Elimina definitivamente</summary>
                        <ActionForm action={adminDeleteListing} submitLabel="Elimina" variant="danger" size="sm" hidden={{ id: l.id }} confirm="L'eliminazione è irreversibile. Confermi?" className="mt-2">
                          {((s: FormState) => <Field id={`dr-${l.id}`} label="Motivazione (min. 10 caratteri, resta nel registro)" error={s.fieldErrors?.reason}><Input id={`dr-${l.id}`} name="reason" /></Field>)(initialFormState)}
                        </ActionForm>
                      </details>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

async function Parts({ supabase, status }: { supabase: SB; status: Enums<"part_status"> }) {
  const { data } = await supabase.from("part_listings").select("*, part_categories(name), part_images(storage_path), part_compatibility(make_slug, model, basis)").eq("status", status).order("updated_at").limit(50);
  return (
    <>
      <StateFilter base="/admin/moderazione?tab=ricambi" states={PART_STATES} labels={PART_STATUS_LABELS} current={status} />
      <Alert tone="warning" className="mb-4">Controlla in particolare: prodotti contraffatti o non identificabili, compatibilità implausibili, fotografie non autorizzate, prodotti vietati o con restrizioni.</Alert>
      {!data?.length ? <EmptyState title="Nessun ricambio in questo stato" /> : (
        <ul className="flex flex-col gap-3">
          {data.map((p) => (
            <li key={p.id}><Card className="flex flex-col gap-2 p-4">
              <p className="font-bold">{p.title} <Badge tone="neutral">{PART_CONDITION_LABELS[p.condition]}</Badge></p>
              <p className="text-sm text-muted">{(p.part_categories as unknown as { name: string } | null)?.name} · {p.manufacturer_brand ?? "marca ?"} · OEM {p.oem_code ?? "—"} · cod. {p.manufacturer_code ?? "—"} · {formatPrice(p.price_cents)} · {p.city ?? "?"} · foto: {p.part_images?.length ?? 0} · compatibilità: {p.part_compatibility?.length ?? 0}</p>
              {p.description && <p className="line-clamp-2 text-sm">{p.description}</p>}
              {p.condition === "ricondizionato" && <p className="text-sm"><strong>Ricondizionamento:</strong> {p.refurbishment_notes ?? "non descritto"}</p>}
              {status !== "rifiutato" && <ActionForm action={adminModeratePart} submitLabel="Applica" size="sm" hidden={{ id: p.id }}>
                <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
                  <Field id={`pa-${p.id}`} label="Decisione"><Select id={`pa-${p.id}`} name="action" defaultValue={status === "sospeso" ? "riattiva" : status === "pubblicato" ? "sospendi" : "approva_pubblica"}>
                    {(status === "in_revisione" || status === "approvato") && <><option value="approva_pubblica">Approva e pubblica</option><option value="rifiuta">Rifiuta</option></>}
                    {status === "pubblicato" && <option value="sospendi">Sospendi</option>}
                    {status === "sospeso" && <option value="riattiva">Riattiva</option>}
                  </Select></Field>
                  <Field id={`pn-${p.id}`} label="Motivazione"><Input id={`pn-${p.id}`} name="note" maxLength={1000} /></Field>
                </div>
              </ActionForm>}
            </Card></li>
          ))}
        </ul>
      )}
    </>
  );
}

async function Services({ supabase }: { supabase: SB }) {
  const { data } = await supabase.from("professional_services").select("id, name, description, price_type, price_cents, active, updated_at, professional_profiles(display_name, slug, professional_type)").order("updated_at", { ascending: false }).limit(60);
  if (!data?.length) return <EmptyState title="Nessun servizio pubblicato" />;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      {data.map((s) => { const p = s.professional_profiles as unknown as { display_name: string } | null; return (
        <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <span><strong>{s.name}</strong> · {p?.display_name} · {s.price_type === "su_preventivo" ? "su preventivo" : formatPrice(s.price_cents)}{s.description ? ` — ${s.description.slice(0, 80)}` : ""}</span>
          <ActionForm action={adminToggleService} submitLabel={s.active ? "Disattiva" : "Riattiva"} size="sm" variant="outline" hidden={{ id: s.id, active: s.active ? "0" : "1" }} />
        </li>); })}
    </ul>
  );
}

function StateFilter<T extends string>({ base, states, labels, current }: { base: string; states: T[]; labels: Record<T, string>; current: T }) {
  return <div className="mb-4 flex flex-wrap gap-2">{states.map((s) => <Link key={s} href={`${base}&stato=${s}`} aria-current={s === current ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${s === current ? "border-ink bg-ink text-white" : "border-line-strong bg-white"}`}>{labels[s]}</Link>)}</div>;
}
