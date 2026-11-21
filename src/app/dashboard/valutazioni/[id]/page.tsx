import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { deleteValuation, proposeTradeIn, requestProfessional, updateValuation } from "@/lib/actions/valuation";
import { formatPrice } from "@/lib/format";
import { ACCIDENTS, CONDITIONS, DISCLAIMER, RELIABILITY } from "@/lib/valuation/labels";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Valutazione", robots: { index: false } };

export default function ValuationDetail(props: PageProps<"/dashboard/valutazioni/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} searchParams={props.searchParams} /></Suspense>;
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/valutazioni/${id}`);
  const supabase = await createClient();
  const { data: v } = await supabase.from("vehicle_valuations").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!v) notFound();
  const trade = typeof sp.permuta === "string" && /^[0-9a-f-]{36}$/.test(sp.permuta) ? sp.permuta : null;
  const [{ data: pros }, { data: listing }, { data: photos }] = await Promise.all([
    supabase.rpc("valuation_professionals", { p_limit: 30 }),
    trade ? supabase.from("vehicle_listings").select("id, title, price_cents, slug").eq("id", trade).eq("status", "pubblicato").maybeSingle() : Promise.resolve({ data: null }),
    v.photo_paths.length ? supabase.storage.from("valuation-photos").createSignedUrls(v.photo_paths, 600) : Promise.resolve({ data: [] }),
  ]);
  const url = new Map((photos ?? []).flatMap((p) => (p.signedUrl && p.path ? [[p.path, p.signedUrl] as const] : [])));
  const est = v.status === "stimata";
  return (
    <>
      <PageHeader title={`${v.make} ${v.model} ${v.year}`} description={`${v.version ?? ""} ${v.mileage_km.toLocaleString("it-IT")} km · condizioni ${CONDITIONS[v.condition].toLowerCase()} · ${v.province}`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3 p-5">
            {est ? (
              <>
                <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Stima preliminare</h2><Badge tone={RELIABILITY[v.reliability!].tone}>{RELIABILITY[v.reliability!].label}</Badge></div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {([["Minimo indicativo", v.estimate_min_cents], ["Valore indicativo medio", v.estimate_mid_cents], ["Massimo indicativo", v.estimate_max_cents]] as [string, number][]).map(([l, c], i) => (
                    <div key={l} className={`rounded-xl p-3 ${i === 1 ? "bg-ink text-white" : "bg-mist"}`}><p className="text-xs opacity-80">{l}</p><p className="text-xl font-extrabold tabular-nums">{formatPrice(c)}</p></div>
                  ))}
                </div>
              </>
            ) : (
              <Alert tone="warning"><strong>Non possiamo produrre una stima affidabile.</strong> Sulla piattaforma ci sono {v.comparables_count ?? 0} annunci comparabili: invece di un numero poco attendibile ti proponiamo di completare i dati o chiedere una valutazione a un professionista.</Alert>
            )}
            <p className="text-sm"><strong>Metodo:</strong> {v.method}</p>
            <p className="text-xs text-muted">Calcolata il {formatDateTime(v.estimated_at!)} su {v.comparables_count ?? 0} annunci comparabili.</p>
            {v.missing_info.length > 0 && <p className="text-sm"><strong>Informazioni mancanti:</strong> {v.missing_info.join(", ")}.</p>}
            <p className="rounded-xl bg-mist p-3 text-xs">{DISCLAIMER}</p>
          </Card>

          <Card className="p-5">
            <details open={!est}><summary className="cursor-pointer font-bold">Completa o correggi i dati e ricalcola</summary>
              <ActionForm action={updateValuation} submitLabel="Aggiorna e ricalcola" size="sm" hidden={{ id, make: v.make, model: v.model, version: v.version, year: v.year, region: v.region, province: v.province, user_vehicle_id: v.user_vehicle_id, owners_count: v.owners_count, damage_notes: v.damage_notes, inspection_status: v.inspection_status }} className="mt-3">
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field id="u-km" label="Chilometri"><Input id="u-km" name="mileage_km" type="number" min={0} defaultValue={v.mileage_km} /></Field>
                  <Field id="u-fu" label="Alimentazione"><Select id="u-fu" name="fuel" defaultValue={v.fuel ?? ""}><option value="">Non indicata</option>{["benzina", "diesel", "gpl", "metano", "ibrida", "ibrida_plugin", "elettrica", "altra"].map((f) => <option key={f} value={f}>{f}</option>)}</Select></Field>
                  <Field id="u-tr" label="Cambio"><Select id="u-tr" name="transmission" defaultValue={v.transmission ?? ""}><option value="">Non indicato</option><option value="manuale">Manuale</option><option value="automatico">Automatico</option></Select></Field>
                  <Field id="u-pw" label="Potenza (kW)"><Input id="u-pw" name="power_kw" type="number" min={1} defaultValue={v.power_kw ?? ""} /></Field>
                  <Field id="u-co" label="Condizioni"><Select id="u-co" name="condition" defaultValue={v.condition}>{Object.entries(CONDITIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                  <Field id="u-ac" label="Incidenti o danni"><Select id="u-ac" name="accidents" defaultValue={v.accidents}>{Object.entries(ACCIDENTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                </div>
                {v.options.map((o) => <input key={o} type="hidden" name="options" value={o} />)}
                {v.photo_paths.map((p) => <input key={p} type="hidden" name="photo_paths" value={p} />)}
              </ActionForm>
            </details>
          </Card>

          {listing && (
            <Card className="flex flex-col gap-3 border-orange p-5">
              <h2 className="font-bold">Proponi una permuta per «{listing.title}»</h2>
              <p className="text-sm">Prezzo richiesto: <strong>{formatPrice(listing.price_cents)}</strong>{est ? ` · valore indicativo della tua auto: ${formatPrice(v.estimate_mid_cents!)} · differenza indicativa: ${formatPrice((listing.price_cents ?? 0) - v.estimate_mid_cents!)}` : ""}</p>
              <ActionForm action={proposeTradeIn} submitLabel="Invia la proposta al venditore" hidden={{ listing_id: listing.id, valuation_id: id }}>
                {(s) => (<>
                  <Field id="tv" label="Valore che proponi per la tua auto (€)" error={s.fieldErrors?.value}><Input id="tv" name="value" type="number" min={100} step="100" required defaultValue={est ? Math.round(v.estimate_mid_cents! / 100) : ""} /></Field>
                  <Field id="tm" label="Messaggio" optional><Textarea id="tm" name="message" rows={2} maxLength={1000} /></Field>
                  <p className="text-xs text-muted">Il calcolo è preliminare: non è un accordo concluso. Il venditore può valutare, chiedere un&apos;ispezione o controproporre.</p>
                </>)}
              </ActionForm>
            </Card>
          )}

          <Card className="flex flex-col gap-3 p-5">
            <h2 className="font-bold">Chiedi una valutazione professionale</h2>
            {!pros?.length ? <p className="text-sm text-muted">Non ci sono ancora concessionari o officine verificati disponibili per le valutazioni.</p> : (
              <ActionForm action={requestProfessional} submitLabel="Invia ai professionisti scelti" hidden={{ id }}>
                {(s) => (<>
                  <fieldset><legend className="mb-1 text-sm font-semibold">Professionisti (fino a 5)</legend>
                    <div className="grid gap-2 sm:grid-cols-2">{pros.map((p) => <Checkbox key={p.profile_id} id={`p-${p.profile_id}`} name="profile_ids" value={p.profile_id} label={`${p.display_name}${p.city ? ` · ${p.city}` : ""}${p.professional_type === "venditore_auto" ? " (concessionario)" : " (officina)"}${p.review_count ? ` · ★ ${String(p.rating_avg).replace(".", ",")}` : ""}`} />)}</div></fieldset>
                  <Field id="pi" label="Cosa ti serve"><Select id="pi" name="intent" defaultValue="vendita"><option value="vendita">Valutazione e offerta di acquisto</option><option value="valutazione">Solo valutazione</option></Select></Field>
                  {v.photo_paths.length > 0 && <fieldset><legend className="mb-1 text-sm font-semibold">Foto da condividere</legend>
                    <div className="flex flex-wrap gap-3">{v.photo_paths.map((p) => <label key={p} className="flex flex-col items-center gap-1 text-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url.get(p)} alt="Foto" className="size-20 rounded-lg object-cover" /><input type="checkbox" name="shared_photos" value={p} defaultChecked /></label>)}</div></fieldset>}
                  {est && <Checkbox id="se" name="share_estimate" label="Mostra anche la stima preliminare" />}
                  <Field id="pm" label="Messaggio" optional><Textarea id="pm" name="message" rows={2} maxLength={1000} /></Field>
                  <Checkbox id="pc" name="consent" error={s.fieldErrors?.consent} label="Acconsento a condividere con i professionisti scelti i dati dell'auto e le foto selezionate. Targa e dati di contatto non vengono condivisi." />
                </>)}
              </ActionForm>
            )}
          </Card>
        </div>
        <aside className="flex flex-col gap-3">
          <Card className="p-4 text-sm">
            <p><strong>Proprietari:</strong> {v.owners_count ?? "non indicato"}</p><p><strong>Incidenti:</strong> {ACCIDENTS[v.accidents]}</p>
            {v.options.length > 0 && <p><strong>Optional:</strong> {v.options.join(", ")}</p>}
          </Card>
          <Link className="text-sm font-semibold text-orange-700 underline" href="/auto-usate">Cerca un&apos;auto da prendere in permuta</Link>
          <ActionForm action={deleteValuation} submitLabel="Elimina la valutazione" size="sm" variant="danger" hidden={{ id }} confirm="Eliminare definitivamente?" />
        </aside>
      </div>
    </>
  );
}
