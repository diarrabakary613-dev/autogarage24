import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { FileUploader } from "@/components/ui/file-uploader";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptTransportQuote, addTransportReport, sendTransportQuote, updateTransportStatus } from "@/lib/actions/transport";
import { TRANSPORT_SERVICES, TRANSPORT_STATUS } from "@/lib/services/labels";
import { formatPrice } from "@/lib/format";
import { formatDate, formatDateTime } from "@/lib/utils";
import { nowMs } from "@/lib/bookings/time";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Trasporto auto", robots: { index: false } };

export default function TransportDetailPage(props: PageProps<"/dashboard/trasporti/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} searchParams={props.searchParams} /></Suspense>;
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/dashboard/trasporti/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("transport_requests").select("*, vehicle_listings(title, slug)").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: quotes }, { data: addr }, { data: reports }, { data: events }, { data: myOp }] = await Promise.all([
    supabase.from("transport_quotes").select("*, professional_profiles(display_name, slug)").eq("request_id", id).order("amount_cents"),
    supabase.from("transport_request_addresses").select("*").eq("request_id", id).maybeSingle(),
    supabase.from("transport_reports").select("*").eq("request_id", id).order("created_at"),
    supabase.from("transport_events").select("*").eq("request_id", id).order("created_at"),
    supabase.from("transport_operators").select("profile_id, status, insurance_declared, professional_profiles!inner(user_id)").eq("professional_profiles.user_id", user.id).maybeSingle(),
  ]);
  const owner = r.user_id === user.id;
  const assigned = myOp && r.operator_profile_id === myOp.profile_id;
  const st = TRANSPORT_STATUS[r.status];
  const open = ["aperta", "preventivi_ricevuti"].includes(r.status);
  const today = new Date(nowMs()).toISOString().slice(0, 10);
  const listing = r.vehicle_listings as unknown as { title: string; slug: string } | null;
  const allPhotos = [...r.photo_paths, ...(reports ?? []).flatMap((x) => x.photo_paths)];
  const { data: signed } = allPhotos.length ? await supabase.storage.from("service-photos").createSignedUrls(allPhotos, 600) : { data: [] };
  const url = new Map((signed ?? []).flatMap((s) => (s.signedUrl && s.path ? [[s.path, s.signedUrl] as const] : [])));
  const myQuote = myOp ? (quotes ?? []).find((q) => q.profile_id === myOp.profile_id && q.status === "inviato") : undefined;
  const conv = owner ? (quotes ?? []).find((q) => q.id === r.accepted_quote_id)?.conversation_id : (quotes ?? []).find((q) => q.profile_id === myOp?.profile_id)?.conversation_id;
  return (
    <>
      <PageHeader title={`${r.pickup_city} → ${r.delivery_city}`} description={`${r.vehicle_desc} · ${TRANSPORT_SERVICES[r.service]} · ${r.vehicle_drivable ? "marciante" : "non marciante"}`} actions={<Badge tone={st.tone}>{st.label}</Badge>} />
      {sp.creata && <Alert tone="success" className="mb-4">Richiesta pubblicata: i trasportatori attivi nelle regioni interessate possono inviarti un preventivo.</Alert>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 p-5 text-sm">
            <p><strong>Periodo:</strong> {formatDate(r.date_from)} – {formatDate(r.date_to)} · {r.urgency === "urgente" ? "urgente" : "programmato"}</p>
            {listing && <p><strong>Annuncio:</strong> <Link className="underline" href={`/auto/${listing.slug}`}>{listing.title}</Link></p>}
            {r.vehicle_condition && <p><strong>Condizioni:</strong> {r.vehicle_condition}</p>}
            {r.notes && <p className="whitespace-pre-line">{r.notes}</p>}
            {r.photo_paths.length > 0 && <Gallery paths={r.photo_paths} url={url} />}
            {addr && (
              <div className="mt-2 rounded-xl bg-mist p-3">
                <p><strong>Ritiro:</strong> {addr.pickup_address}</p><p><strong>Consegna:</strong> {addr.delivery_address}</p>
                <p><strong>Referente:</strong> {addr.contact_name} · <a className="underline" href={`tel:${addr.contact_phone.replace(/[^0-9+]/g, "")}`}>{addr.contact_phone}</a></p>
              </div>
            )}
            {!addr && !owner && <p className="text-xs text-muted">Indirizzi e referente sono visibili solo se il cliente accetta il tuo preventivo.</p>}
          </Card>

          {(owner || assigned) && (quotes?.length ?? 0) > 0 && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="font-bold">Preventivi a confronto</h2>
              <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-muted"><tr><th className="py-2">Trasportatore</th><th>Prezzo totale</th><th>Ritiro</th><th>Consegna</th><th>Copertura</th><th>Validità</th><th /></tr></thead>
                <tbody className="divide-y divide-line">{(quotes ?? []).filter((q) => owner || q.profile_id === myOp?.profile_id).map((q) => (
                  <tr key={q.id} className={q.status === "accettato" ? "bg-success-50" : ""}>
                    <td className="py-2 font-semibold">{(q.professional_profiles as unknown as { display_name: string }).display_name}{q.notes && <p className="text-xs font-normal whitespace-pre-line text-graphite">{q.notes}</p>}</td>
                    <td className="font-bold tabular-nums">{formatPrice(q.amount_cents)}</td><td>{formatDate(q.pickup_date)}</td><td>{formatDate(q.delivery_date)}</td>
                    <td>{q.includes_insurance ? "Dichiarata" : "Non inclusa"}</td><td>{formatDate(q.valid_until)} · {q.status}</td>
                    <td>{owner && open && q.status === "inviato" && q.valid_until >= today && <ActionForm action={acceptTransportQuote} submitLabel="Accetta" size="sm" hidden={{ quote_id: q.id, id }} confirm="Accettare questo preventivo? Gli altri verranno rifiutati." />}</td>
                  </tr>))}</tbody>
              </table></div>
              <p className="text-xs text-muted">Il pagamento si concorda con il trasportatore: AutoGarage24 non incassa né trattiene somme. Per domande usa la conversazione collegata al preventivo.</p>
            </Card>
          )}

          {myOp && !owner && open && (
            myOp.status !== "attivo" ? <Alert tone="warning">Il tuo profilo trasportatore non è ancora attivo.</Alert> : (
              <Card className="p-5">
                <h2 className="mb-3 font-bold">{myQuote ? "Aggiorna il tuo preventivo" : "Invia un preventivo"}</h2>
                <ActionForm action={sendTransportQuote} submitLabel="Invia preventivo" hidden={{ id }}>
                  {((s: FormState) => (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id="qa" label="Prezzo totale (€, IVA inclusa)" error={s.fieldErrors?.amount}><Input id="qa" name="amount" type="number" min={10} step="0.01" required /></Field>
                      <Field id="qt" label="Tipo di trasporto" optional><Input id="qt" name="transport_type" maxLength={100} placeholder="Es. bisarca 8 posti" /></Field>
                      <Field id="qp" label="Data di ritiro proposta" error={s.fieldErrors?.pickup_date}><Input id="qp" name="pickup_date" type="date" min={today} required /></Field>
                      <Field id="qd" label="Data di consegna stimata" error={s.fieldErrors?.delivery_date}><Input id="qd" name="delivery_date" type="date" min={today} required /></Field>
                      <Field id="qx" label="Costi aggiuntivi" optional className="sm:col-span-2"><Input id="qx" name="extras" maxLength={400} placeholder="Nessuno, oppure es. pedaggi esclusi" /></Field>
                      <Field id="qc" label="Condizioni del servizio" optional className="sm:col-span-2"><Textarea id="qc" name="conditions" rows={2} maxLength={1000} /></Field>
                      <Field id="qv" label="Validità (giorni)"><Input id="qv" name="valid_days" type="number" min={1} max={30} defaultValue={7} /></Field>
                      <div className="flex items-end pb-2">{myOp.insurance_declared ? <Checkbox id="qi" name="includes_insurance" label="Include la copertura assicurativa dichiarata nel profilo" /> : <p className="text-xs text-muted">Nessuna copertura dichiarata nel profilo.</p>}</div>
                    </div>
                  ))(initialFormState)}
                </ActionForm>
              </Card>
            )
          )}

          {assigned && ["assegnata", "ritiro_programmato", "ritirato", "in_transito"].includes(r.status) && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="font-bold">Gestione dell&apos;incarico</h2>
              {r.status === "assegnata" && <ActionForm action={updateTransportStatus} submitLabel="Segna il trasporto come programmato" size="sm" hidden={{ id, status: "ritiro_programmato" }}><Field id="pn" label="Nota per il cliente (es. data e fascia oraria)" optional><Input id="pn" name="note" maxLength={500} /></Field></ActionForm>}
              {r.status === "ritirato" && <ActionForm action={updateTransportStatus} submitLabel="Trasporto in corso" size="sm" hidden={{ id, status: "in_transito" }} />}
              {["assegnata", "ritiro_programmato"].includes(r.status) && <ReportForm id={id} kind="ritiro" userId={user.id} />}
              {["ritirato", "in_transito"].includes(r.status) && <ReportForm id={id} kind="consegna" userId={user.id} />}
              {["assegnata", "ritiro_programmato"].includes(r.status) && (
                <ActionForm action={updateTransportStatus} submitLabel="Annulla l'incarico" size="sm" variant="danger" hidden={{ id, status: "annullata" }} confirm="Annullare l'incarico?"><Field id="cn" label="Motivo (obbligatorio)"><Input id="cn" name="note" required maxLength={500} /></Field></ActionForm>
              )}
            </Card>
          )}

          {owner && (
            <Card className="flex flex-col gap-3 p-5">
              {["consegnato", "contestata"].includes(r.status) && <ActionForm action={updateTransportStatus} submitLabel="Confermo la consegna: trasporto completato" hidden={{ id, status: "completata" }} />}
              {r.status === "consegnato" && (
                <ActionForm action={updateTransportStatus} submitLabel="Segnala un problema" variant="outline" size="sm" hidden={{ id, status: "contestata" }}><Field id="pb" label="Descrivi il problema (lo staff riceve la segnalazione)"><Textarea id="pb" name="note" rows={2} required maxLength={500} /></Field></ActionForm>
              )}
              {["aperta", "preventivi_ricevuti", "assegnata", "ritiro_programmato"].includes(r.status) && (
                <ActionForm action={updateTransportStatus} submitLabel="Annulla la richiesta" variant="danger" size="sm" hidden={{ id, status: "annullata" }} confirm="Annullare la richiesta?"><Field id="cr" label="Motivo" optional><Input id="cr" name="note" maxLength={500} /></Field></ActionForm>
              )}
              {r.status === "completata" && <p className="text-sm">Trasporto completato il {formatDateTime(r.completed_at!)}.</p>}
            </Card>
          )}

          {(reports?.length ?? 0) > 0 && (
            <Card className="flex flex-col gap-4 p-5">
              <h2 className="font-bold">Verbali</h2>
              {reports!.map((rp) => (
                <div key={rp.id} className="flex flex-col gap-1 border-t border-line pt-3 text-sm first:border-0 first:pt-0">
                  <p className="font-semibold">Verbale di {rp.kind} · {formatDateTime(rp.created_at)}</p>
                  <p>{rp.odometer_km !== null ? `${rp.odometer_km.toLocaleString("it-IT")} km · ` : ""}{rp.fuel_level ? `carburante ${rp.fuel_level}` : ""}</p>
                  {rp.damages && <p><strong>Danni presenti:</strong> {rp.damages}</p>}
                  {rp.accessories && <p><strong>Accessori:</strong> {rp.accessories}</p>}
                  {rp.notes && <p>{rp.notes}</p>}
                  {rp.counterpart_name && <p className="text-muted">Presente: {rp.counterpart_name}</p>}
                  <Gallery paths={rp.photo_paths} url={url} />
                </div>
              ))}
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          {conv && <ButtonLink href={`/dashboard/messaggi/${conv}`} variant="outline">Apri la conversazione</ButtonLink>}
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Cronologia</h2>
            <ol className="flex flex-col gap-1.5 text-sm">{(events ?? []).map((e) => <li key={e.id}><span className="text-muted">{formatDateTime(e.created_at)}</span> · {TRANSPORT_STATUS[e.status]?.label ?? (e.status === "preventivo_ricevuto" ? "Preventivo ricevuto" : e.status)}{e.note ? ` — ${e.note}` : ""}</li>)}</ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Gallery({ paths, url }: { paths: string[]; url: Map<string, string> }) {
  return (
    <div className="flex flex-wrap gap-2">{paths.map((p) => url.get(p) && (
      <a key={p} href={url.get(p)} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url.get(p)} alt="Foto del veicolo" className="size-24 rounded-lg object-cover" /></a>
    ))}</div>
  );
}

function ReportForm({ id, kind, userId }: { id: string; kind: "ritiro" | "consegna"; userId: string }) {
  return (
    <details className="rounded-xl border border-line p-3" open>
      <summary className="cursor-pointer font-semibold">Compila il verbale di {kind}</summary>
      <ActionForm action={addTransportReport} submitLabel={`Registra il verbale di ${kind}`} hidden={{ id, kind }} className="mt-3">
        {((s: FormState) => (
          <>
            <FileUploader bucket="service-photos" folder={userId} kind="image" label="Foto del veicolo (almeno una)" multiple max={12} name="photo_paths" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id={`km-${kind}`} label="Chilometraggio" optional><Input id={`km-${kind}`} name="odometer_km" type="number" min={0} /></Field>
              <Field id={`fl-${kind}`} label="Carburante" optional><Select id={`fl-${kind}`} name="fuel_level" defaultValue="n/d">{["n/d", "riserva", "1/4", "1/2", "3/4", "pieno"].map((f) => <option key={f}>{f}</option>)}</Select></Field>
            </div>
            <Field id={`dm-${kind}`} label="Condizioni esterne e danni già presenti" optional><Textarea id={`dm-${kind}`} name="damages" rows={2} maxLength={2000} /></Field>
            <Field id={`ac-${kind}`} label="Accessori consegnati" optional><Input id={`ac-${kind}`} name="accessories" maxLength={500} placeholder="Es. 2 chiavi, libretto, ruotino" /></Field>
            <Field id={`nt-${kind}`} label="Note" optional><Textarea id={`nt-${kind}`} name="notes" rows={2} maxLength={2000} /></Field>
            <Field id={`cp-${kind}`} label="Nome della persona presente" optional><Input id={`cp-${kind}`} name="counterpart_name" maxLength={120} /></Field>
            <Checkbox id={`cf-${kind}`} name="confirmed" error={s.fieldErrors?.confirmed} label="Ho mostrato il verbale alla persona presente, che ne ha preso visione." />
          </>
        ))(initialFormState)}
      </ActionForm>
    </details>
  );
}
