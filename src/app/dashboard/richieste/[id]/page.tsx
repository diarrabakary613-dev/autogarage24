import type { Metadata } from "next";
import { initialFormState, type FormState } from "@/lib/validation/form-state";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { CalendarClock, FileText, MessagesSquare, Star } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader, Spec } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/actions/helpers";
import {
  confirmPurchase, createReview, decideWorkReport, rescheduleAppointment, proposeAppointment, proposeWorkReport, respondAppointment, respondQuote, sendQuote, updateRequestStatus,
} from "@/lib/actions/requests";
import {
  APPOINTMENT_STATUS_LABELS, FUEL_LABELS, INQUIRY_LABELS, MAINTENANCE_LABELS, PROBLEM_LABELS, QUOTE_STATUS_LABELS, REQUEST_KIND_LABELS, REQUEST_STATUS_LABELS, SLOT_LABELS, WORK_MODE_LABELS,
} from "@/lib/labels";
import { formatKm, formatPrice, relativeTime } from "@/lib/format";
import { formatDate, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Dettaglio richiesta", robots: { index: false } };

export default function RequestDetailPage(props: PageProps<"/dashboard/richieste/[id]">) {
  return <Suspense fallback={<Skeleton className="h-[600px]" />}><Detail params={props.params} /></Suspense>;
}

const QUOTE_KINDS = ["preventivo", "assistenza", "appuntamento", "preventivo_ricambio", "info_ricambio"];
const SLOTS = Object.entries(SLOT_LABELS);

async function Detail({ params }: { params: PageProps<"/dashboard/richieste/[id]">["params"] }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/richieste/${id}`);
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const { data: r } = await supabase.from("requests")
    .select("*, listing:vehicle_listings(slug, title), pro:professional_profiles(slug, display_name, professional_type), part:part_listings(slug, title), service:professional_services(name)")
    .eq("id", id).maybeSingle();
  if (!r) notFound();
  const isRecipient = r.recipient_id === user.id;
  const other = isRecipient ? r.requester_id : r.recipient_id;
  const [names, quotes, appts, events, reports, review, vehicles, verification] = await Promise.all([
    supabase.rpc("counterpart_names", { user_ids: [other!] }),
    supabase.from("quotes").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.from("appointments").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.from("request_events").select("id, event, created_at, actor_id").eq("request_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("work_reports").select("*").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("id, rating, comment, status").eq("request_id", id).maybeSingle(),
    isRecipient ? Promise.resolve({ data: [] }) : supabase.from("user_vehicles").select("id, make, model, year").is("deleted_at", null),
    supabase.from("review_verifications").select("basis, seller_confirmed_at, customer_confirmed_at, verified_at").eq("request_id", id).maybeSingle(),
  ]);
  const purchaseKind = r.kind === "info_auto" || r.kind === "appuntamento_auto";
  const repairKind = ["preventivo", "assistenza", "appuntamento"].includes(r.kind);
  const v = verification.data;
  const myConfirm = v ? (isRecipient ? v.seller_confirmed_at : v.customer_confirmed_at) : null;
  const otherName = names.data?.[0]?.display_name ?? "Utente AutoGarage24";
  const closed = ["completata", "annullata", "rifiutata"].includes(r.status);
  const pro = r.pro as { slug: string; display_name: string; professional_type: string } | null;
  const listing = r.listing as { slug: string; title: string } | null;
  const part = r.part as { slug: string; title: string } | null;
  const canWorkReport = isRecipient && pro && ["officina", "meccanico"].includes(pro.professional_type) && ["accettata", "completata"].includes(r.status);

  if (isRecipient && r.status === "nuova") {
    after(async () => { await supabase.rpc("update_request_status", { request_id: id, new_status: "visualizzata" }); });
  }

  return (
    <>
      <PageHeader
        eyebrow={`${REQUEST_KIND_LABELS[r.kind]} · ${isRecipient ? "ricevuta" : "inviata"}`}
        title={r.subject}
        description={<>{isRecipient ? "Da" : "A"} <strong>{isRecipient ? otherName : pro?.display_name ?? otherName}</strong> · creata {relativeTime(r.created_at)}</>}
        actions={<Badge tone={closed ? "neutral" : "orange"}>{REQUEST_STATUS_LABELS[r.status]}</Badge>}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h2 className="mb-3 font-bold">Richiesta</h2>
            <p className="whitespace-pre-line text-graphite">{r.message}</p>
            <dl className="mt-4">
              {listing && <Spec label="Annuncio" value={<Link className="text-orange-700 underline" href={`/auto/${listing.slug}`}>{listing.title}</Link>} />}
              {part && <Spec label="Ricambio" value={<Link className="text-orange-700 underline" href={`/ricambi/${part.slug}`}>{part.title}</Link>} />}
              {r.service && <Spec label="Servizio" value={(r.service as { name: string }).name} />}
              {(r.vehicle_make || r.vehicle_model) && <Spec label="Automobile" value={[r.vehicle_make, r.vehicle_model, r.vehicle_year].filter(Boolean).join(" ")} />}
              {r.problem_started && <Spec label="Da quando" value={r.problem_started} />}
              {r.preferred_date && <Spec label="Data preferita" value={`${formatDate(r.preferred_date)}${r.preferred_slot ? ` · ${SLOT_LABELS[r.preferred_slot]}` : ""}`} />}
              {r.work_mode && <Spec label="Modalità" value={WORK_MODE_LABELS[r.work_mode]} />}
              {r.location_text && <Spec label="Luogo" value={r.location_text} />}
              {r.part_code && <Spec label="Codice componente" value={r.part_code} />}
              {r.problem_category && <Spec label="Tipo di intervento" value={PROBLEM_LABELS[r.problem_category] ?? r.problem_category} />}
              {r.fuel && <Spec label="Alimentazione" value={FUEL_LABELS[r.fuel]} />}
              {r.mileage_km !== null && <Spec label="Chilometraggio" value={formatKm(r.mileage_km)} />}
              {r.part_inquiry_type && <Spec label="Tipo di richiesta" value={INQUIRY_LABELS[r.part_inquiry_type] ?? r.part_inquiry_type} />}
              {r.repair_request_id && !isRecipient && <Spec label="Richiesta multipla" value={<Link className="text-orange-700 underline" href={`/dashboard/richieste-intervento/${r.repair_request_id}`}>Confronta i preventivi di tutte le officine</Link>} />}
              <Spec label="Contatto preferito" value={r.contact_preference === "messaggio" ? "Messaggi su AutoGarage24" : r.contact_preference === "email" ? "Email" : "Telefono (da concordare in chat)"} />
            </dl>
            {r.status_reason && <Alert tone="info" className="mt-4">Motivazione: {r.status_reason}</Alert>}
          </Card>

          {(quotes.data?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold"><FileText className="size-5 text-orange-700" aria-hidden /> Preventivi</h2>
              <ul className="flex flex-col gap-4">
                {quotes.data!.map((q) => (
                  <li key={q.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-2xl font-extrabold">{formatPrice(q.amount_cents, true)}</p>
                      <Badge tone={q.status === "accettato" ? "success" : q.status === "inviato" ? "orange" : "neutral"}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm text-graphite">{q.description}</p>
                    {(q.is_indicative || q.requires_inspection) && <p className="mt-1 flex flex-wrap gap-1">{q.labor_cents !== null && <Badge tone="warning">Prezzo indicativo</Badge>}{q.requires_inspection && <Badge tone="warning">Serve un controllo in officina prima del prezzo definitivo</Badge>}</p>}
                    <dl className="mt-2 text-sm">
                      {q.labor_cents !== null && <Spec label="Manodopera" value={formatPrice(q.labor_cents, true)} />}
                      {q.parts_cents !== null && <Spec label="Ricambi" value={formatPrice(q.parts_cents, true)} />}
                      {q.extra_costs_cents !== null && <Spec label="Costi aggiuntivi" value={formatPrice(q.extra_costs_cents, true)} />}
                      {q.materials && <Spec label="Materiali" value={q.materials} />}
                      {q.duration_text && <Spec label="Durata indicativa" value={q.duration_text} />}
                      {q.availability_text && <Spec label="Disponibilità" value={q.availability_text} />}
                      {q.conditions && <Spec label="Condizioni" value={q.conditions} />}
                      {q.valid_until && <Spec label="Valido fino al" value={formatDate(q.valid_until)} />}
                    </dl>
                    {!isRecipient && q.status === "inviato" && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionForm action={respondQuote} submitLabel="Accetta preventivo" size="sm" hidden={{ quote_id: q.id, request_id: id, accept: "1" }} confirm="Accetti questo preventivo?" />
                        <ActionForm action={respondQuote} submitLabel="Rifiuta" size="sm" variant="outline" hidden={{ quote_id: q.id, request_id: id, accept: "0" }} />
                      </div>
                    )}
                    <p className="mt-2 text-xs text-muted">Nessun pagamento avviene su AutoGarage24: l&apos;accettazione non conferma automaticamente un appuntamento.</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-bold"><CalendarClock className="size-5 text-orange-700" aria-hidden /> Appuntamenti</h2>
            {(appts.data?.length ?? 0) === 0 && <p className="text-sm text-muted">Nessuna proposta di appuntamento.</p>}
            <ul className="flex flex-col gap-3">
              {appts.data?.map((a) => {
                const mine = a.proposed_by === user.id;
                return (
                  <li key={a.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{formatDate(a.proposed_date)} · {SLOT_LABELS[a.slot]}{a.time_text ? ` · ${a.time_text}` : ""}</p>
                      <Badge tone={a.status === "confermato" ? "success" : a.status === "in_attesa" ? "warning" : "neutral"}>{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted">Proposto da {mine ? "te" : otherName}{a.note ? ` — ${a.note}` : ""}</p>
                    {a.decision_reason && <p className="text-sm text-graphite">Motivo: {a.decision_reason}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!mine && a.status === "in_attesa" && <>
                        <ActionForm action={respondAppointment} submitLabel="Conferma" size="sm" hidden={{ appointment_id: a.id, request_id: id, action: "conferma" }} />
                        <ActionForm action={respondAppointment} submitLabel="Rifiuta" size="sm" variant="outline" hidden={{ appointment_id: a.id, request_id: id, action: "rifiuta" }} />
                      </>}
                      {a.status === "confermato" && (
                        <ActionForm action={respondAppointment} submitLabel="Annulla appuntamento" size="sm" variant="danger" hidden={{ appointment_id: a.id, request_id: id, action: "annulla" }} confirm="Annullare l'appuntamento?">
                          <Field id={`ar-${a.id}`} label="Motivo dell'annullamento"><Input id={`ar-${a.id}`} name="reason" maxLength={500} /></Field>
                        </ActionForm>
                      )}
                      {["in_attesa", "confermato"].includes(a.status) && (
                        <details className="w-full"><summary className="cursor-pointer text-sm font-semibold text-orange-700">Cambia data</summary>
                          <ActionForm action={rescheduleAppointment} submitLabel="Proponi la nuova data" size="sm" hidden={{ appointment_id: a.id, request_id: id }} className="mt-2">
                            {((st: FormState) => (<div className="grid gap-2 sm:grid-cols-4">
                              <Field id={`rs-d-${a.id}`} label="Nuova data" error={st.fieldErrors?.date}><Input id={`rs-d-${a.id}`} name="date" type="date" /></Field>
                              <Field id={`rs-s-${a.id}`} label="Fascia"><Select id={`rs-s-${a.id}`} name="slot" defaultValue="qualsiasi">{Object.entries(SLOT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
                              <Field id={`rs-t-${a.id}`} label="Orario" optional><Input id={`rs-t-${a.id}`} name="time_text" placeholder="es. 9:30" /></Field>
                              <Field id={`rs-n-${a.id}`} label="Motivo" optional><Input id={`rs-n-${a.id}`} name="note" /></Field>
                            </div>))(initialFormState)}
                          </ActionForm>
                        </details>
                      )}
                      {isRecipient && a.status === "confermato" && a.proposed_date <= new Date().toISOString().slice(0, 10) && (
                        <ActionForm action={respondAppointment} submitLabel="Segna come completato" size="sm" variant="outline" hidden={{ appointment_id: a.id, request_id: id, action: "completa" }} />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {!closed && (
              <details className="mt-4 rounded-xl border border-line">
                <summary className="cursor-pointer px-4 py-3 font-semibold">{isRecipient ? "Proponi una data" : "Proponi un'altra data"}</summary>
                <div className="border-t border-line p-4">
                  <ActionForm action={proposeAppointment} submitLabel="Invia proposta" hidden={{ request_id: id }} resetOnSuccess>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field id="ap-d" label="Data"><Input id="ap-d" name="date" type="date" min={new Date().toISOString().slice(0, 10)} /></Field>
                      <Field id="ap-s" label="Fascia"><Select id="ap-s" name="slot" defaultValue="mattina">{SLOTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select></Field>
                      <Field id="ap-t" label="Orario" optional><Input id="ap-t" name="time_text" placeholder="es. 9:30" maxLength={40} /></Field>
                    </div>
                    <Field id="ap-n" label="Nota" optional><Input id="ap-n" name="note" maxLength={500} /></Field>
                  </ActionForm>
                  <p className="mt-2 text-xs text-muted">L&apos;appuntamento è confermato solo quando l&apos;altra parte lo accetta esplicitamente.</p>
                </div>
              </details>
            )}
          </Card>

          {isRecipient && !closed && QUOTE_KINDS.includes(r.kind) && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">Invia un preventivo</h2>
              <ActionForm action={sendQuote} submitLabel="Invia preventivo" hidden={{ request_id: id }} resetOnSuccess>
                {((s: FormState) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {repairKind ? (
                      <>
                        <Field id="q-l" label="Manodopera (€)" error={s.fieldErrors?.labor}><Input id="q-l" name="labor" inputMode="decimal" /></Field>
                        <Field id="q-r" label="Ricambi (€)" error={s.fieldErrors?.parts}><Input id="q-r" name="parts" inputMode="decimal" /></Field>
                        <Field id="q-e" label="Costi aggiuntivi (€)" optional hint="Es. smaltimento, materiali di consumo"><Input id="q-e" name="extra_costs" inputMode="decimal" /></Field>
                        <Field id="q-v" label="Valido fino al" error={s.fieldErrors?.valid_until}><Input id="q-v" name="valid_until" type="date" /></Field>
                        <p className="text-xs text-muted sm:col-span-2">Il totale è calcolato automaticamente. Il preventivo è sempre presentato al cliente come indicativo.</p>
                      </>
                    ) : (
                      <>
                        <Field id="q-p" label="Prezzo (€)" error={s.fieldErrors?.price}><Input id="q-p" name="price" inputMode="decimal" /></Field>
                        <Field id="q-e" label="Costi aggiuntivi (€)" optional><Input id="q-e" name="extra_costs" inputMode="decimal" /></Field>
                        <Field id="q-v" label="Valido fino al" optional><Input id="q-v" name="valid_until" type="date" /></Field>
                      </>
                    )}
                    <Field id="q-d" label="Descrizione dell'intervento o della fornitura" error={s.fieldErrors?.description} className="sm:col-span-2"><Textarea id="q-d" name="description" rows={3} /></Field>
                    <Field id="q-m" label="Materiali previsti" optional><Input id="q-m" name="materials" /></Field>
                    <Field id="q-du" label="Tempi stimati" optional><Input id="q-du" name="duration_text" placeholder="es. mezza giornata" /></Field>
                    <Field id="q-a" label="Disponibilità / consegna" optional><Input id="q-a" name="availability" /></Field>
                    {repairKind && <div className="flex items-end"><Checkbox id="q-i" name="requires_inspection" label="Serve un controllo in officina per il prezzo definitivo" /></div>}
                    <Field id="q-c" label="Condizioni" optional className="sm:col-span-2"><Textarea id="q-c" name="conditions" rows={2} /></Field>
                  </div>
                ))(initialFormState)}
              </ActionForm>
            </Card>
          )}

          {(reports.data?.length ?? 0) > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-bold">Rapporto di lavoro</h2>
              {reports.data!.map((w) => (
                <div key={w.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{w.title} · {formatDate(w.performed_on)}</p>
                    <Badge tone={w.status === "approvato" ? "success" : w.status === "proposto" ? "warning" : "danger"}>{w.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{MAINTENANCE_LABELS[w.category]}{w.mileage_km !== null ? ` · ${w.mileage_km.toLocaleString("it-IT")} km` : ""}{w.cost_cents !== null ? ` · ${formatPrice(w.cost_cents, true)}` : ""}</p>
                  <p className="mt-2 whitespace-pre-line text-sm">{w.description}</p>
                  {w.parts_used && <p className="mt-1 text-sm"><strong>Ricambi:</strong> {w.parts_used}</p>}
                  {!isRecipient && w.status === "proposto" && (
                    <div className="mt-3 flex flex-col gap-2">
                      <ActionForm action={decideWorkReport} submitLabel="Approva e aggiungi allo storico" size="sm" hidden={{ report_id: w.id, request_id: id, approve: "1" }}>
                        {(vehicles.data?.length ?? 0) > 0 && !w.user_vehicle_id && (
                          <Field id={`wv-${w.id}`} label="Automobile del tuo garage">
                            <Select id={`wv-${w.id}`} name="target_vehicle_id">{vehicles.data!.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} {v.year ?? ""}</option>)}</Select>
                          </Field>
                        )}
                      </ActionForm>
                      <ActionForm action={decideWorkReport} submitLabel="Contesta" size="sm" variant="outline" hidden={{ report_id: w.id, request_id: id, approve: "0" }}>
                        <Field id={`wn-${w.id}`} label="Cosa non è corretto?" optional><Input id={`wn-${w.id}`} name="note" maxLength={1000} /></Field>
                      </ActionForm>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {canWorkReport && !(reports.data ?? []).some((w) => w.status === "proposto" || w.status === "approvato") && (
            <Card className="p-5">
              <h2 className="mb-1 font-bold">Proponi il rapporto di lavoro</h2>
              <p className="mb-3 text-sm text-muted">Il cliente lo verificherà prima che entri nello storico della sua automobile, con l&apos;indicazione &quot;inserito da professionista&quot;.</p>
              <ActionForm action={proposeWorkReport} submitLabel="Invia al cliente" hidden={{ request_id: id }}>
                {((s: FormState) => (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field id="w-d" label="Data" error={s.fieldErrors?.performed_on}><Input id="w-d" name="performed_on" type="date" max={new Date().toISOString().slice(0, 10)} /></Field>
                    <Field id="w-c" label="Categoria" error={s.fieldErrors?.category}><Select id="w-c" name="category" defaultValue="">{[<option key="" value="" disabled>Scegli…</option>, ...Object.entries(MAINTENANCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)]}</Select></Field>
                    <Field id="w-t" label="Servizio effettuato" error={s.fieldErrors?.title}><Input id="w-t" name="title" maxLength={160} /></Field>
                    <Field id="w-k" label="Chilometraggio" optional><Input id="w-k" name="mileage_km" inputMode="numeric" /></Field>
                    <Field id="w-de" label="Descrizione" error={s.fieldErrors?.description} className="sm:col-span-2"><Textarea id="w-de" name="description" rows={3} /></Field>
                    <Field id="w-p" label="Ricambi utilizzati" optional><Input id="w-p" name="parts_used" /></Field>
                    <Field id="w-co" label="Costo (€)" optional><Input id="w-co" name="cost" inputMode="decimal" /></Field>
                  </div>
                ))(initialFormState)}
              </ActionForm>
            </Card>
          )}

          {purchaseKind && pro && !v?.verified_at && r.status !== "annullata" && r.status !== "rifiutata" && (
            <Card className="p-5">
              <h2 className="mb-2 font-bold">L&apos;acquisto è avvenuto?</h2>
              <p className="mb-3 text-sm text-muted">Una recensione dell&apos;acquisto è possibile solo se acquirente <em>e</em> venditore confermano che la vendita è avvenuta. Nessun pagamento passa da AutoGarage24.</p>
              {myConfirm ? <Alert tone="info">Hai già confermato il {formatDate(myConfirm)}. In attesa della conferma dell&apos;altra parte.</Alert> : (
                <ActionForm action={confirmPurchase} submitLabel={isRecipient ? "Confermo di aver venduto l'auto a questo cliente" : "Confermo di aver acquistato l'auto"} size="sm" variant="outline" hidden={{ request_id: id }} confirm="Confermi? La conferma resta registrata." />
              )}
            </Card>
          )}

          {!isRecipient && r.status === "completata" && pro && (
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-bold"><Star className="size-5 text-orange-700" aria-hidden /> La tua recensione</h2>
              {review.data ? (
                <p className="text-sm">Hai lasciato {review.data.rating}/5: “{review.data.comment}” {review.data.status !== "pubblicata" && <Badge tone="neutral">{review.data.status}</Badge>}</p>
              ) : (
                <ActionForm action={createReview} submitLabel="Pubblica recensione" hidden={{ request_id: id }}>
                  {((s: FormState) => (
                    <>
                      <fieldset>
                        <legend className="mb-1.5 text-sm font-semibold">Valutazione</legend>
                        <div className="flex gap-2">{[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className="flex cursor-pointer items-center gap-1 rounded-md border border-line-strong px-3 py-2 text-sm has-[:checked]:border-ink has-[:checked]:bg-mist"><input type="radio" name="rating" value={n} className="accent-orange" /> {n}</label>
                        ))}</div>
                        {s.fieldErrors?.rating && <p className="mt-1 text-xs text-danger">{s.fieldErrors.rating}</p>}
                      </fieldset>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {(purchaseKind ? [["accuracy_rating", "Accuratezza della descrizione"], ["communication_rating", "Comunicazione"], ["reliability_rating", "Affidabilità"]] : [["quality_rating", "Qualità del servizio"], ["professionalism_rating", "Professionalità"], ["value_rating", "Rapporto qualità-prezzo"]]).map(([k, l]) => (
                          <Field key={k} id={`rv-${k}`} label={l} error={s.fieldErrors?.[k]}><Select id={`rv-${k}`} name={k} defaultValue=""><option value="" disabled>—</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} / 5</option>)}</Select></Field>
                        ))}
                      </div>
                      <Field id="rv-ed" label={purchaseKind ? "Data dell'acquisto" : "Data dell'intervento"} optional><Input id="rv-ed" name="experience_date" type="date" /></Field>
                      <Field id="rv-t" label="Titolo" optional><Input id="rv-t" name="title" maxLength={120} /></Field>
                      <Field id="rv-s" label="Servizio ricevuto" optional><Input id="rv-s" name="service_label" defaultValue={(r.service as { name: string } | null)?.name ?? ""} maxLength={120} /></Field>
                      <Field id="rv-c" label="Commento" error={s.fieldErrors?.comment}><Textarea id="rv-c" name="comment" rows={4} maxLength={3000} /></Field>
                    </>
                  ))(initialFormState)}
                </ActionForm>
              )}
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {r.conversation_id && (
            <Link href={`/dashboard/messaggi/${r.conversation_id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 font-semibold shadow-card hover:border-ink">
              <MessagesSquare className="size-5 text-orange-700" aria-hidden /> Apri la conversazione
            </Link>
          )}
          {!closed && (
            <Card className="flex flex-col gap-3 p-4">
              <h2 className="font-bold">Aggiorna lo stato</h2>
              {isRecipient ? (
                <>
                  {r.status !== "in_lavorazione" && <ActionForm action={updateRequestStatus} submitLabel="Prendi in carico" size="sm" variant="outline" hidden={{ request_id: id, status: "in_lavorazione" }} />}
                  <ActionForm action={updateRequestStatus} submitLabel="Segna risposta inviata" size="sm" variant="outline" hidden={{ request_id: id, status: "risposta_inviata" }} />
                  {r.status === "accettata" && <ActionForm action={updateRequestStatus} submitLabel="Segna come completata" size="sm" hidden={{ request_id: id, status: "completata" }} confirm="Il lavoro è stato completato?" />}
                  <ActionForm action={updateRequestStatus} submitLabel="Rifiuta la richiesta" size="sm" variant="danger" hidden={{ request_id: id, status: "rifiutata" }} confirm="Confermi il rifiuto?">
                    <Field id="rj" label="Motivo (visibile al cliente)"><Input id="rj" name="reason" maxLength={500} /></Field>
                  </ActionForm>
                </>
              ) : (
                <ActionForm action={updateRequestStatus} submitLabel="Annulla la richiesta" size="sm" variant="danger" hidden={{ request_id: id, status: "annullata" }} confirm="Annullare la richiesta?">
                  <Field id="an" label="Motivo" optional><Input id="an" name="reason" maxLength={500} /></Field>
                </ActionForm>
              )}
            </Card>
          )}
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Cronologia</h2>
            <ol className="flex flex-col gap-2 text-sm">
              {events.data?.map((e) => <li key={e.id} className="flex justify-between gap-2"><span>{e.event.replace(/_/g, " ")}</span><span className="text-muted">{formatDateTime(e.created_at)}</span></li>)}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
