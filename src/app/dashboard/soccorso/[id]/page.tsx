import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { MapView } from "@/components/maps/map-view";
import { AutoRefresh, ShareLocation } from "@/components/services/live-location";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { acceptRoadsideQuote, declineRoadside, dispatchRoadside, linkRoadsideRepair, sendRoadsideQuote, updateRoadsideStatus } from "@/lib/actions/roadside";
import { LOCATION_TYPES, ROADSIDE_ACTIVE, ROADSIDE_NEXT, ROADSIDE_SERVICES, ROADSIDE_STATUS } from "@/lib/services/labels";
import { formatPrice } from "@/lib/format";
import { nowMs } from "@/lib/bookings/time";
import { formatDateTime } from "@/lib/utils";
import { initialFormState, type FormState } from "@/lib/validation/form-state";

export const metadata: Metadata = { title: "Richiesta di assistenza", robots: { index: false } };

export default function RoadsideDetailPage(props: PageProps<"/dashboard/soccorso/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} /></Suspense>;
}

type SB = Awaited<ReturnType<typeof createClient>>;

async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/soccorso/${id}`);
  const supabase = await createClient();
  const { data: r } = await supabase.from("roadside_requests").select("*").eq("id", id).maybeSingle();
  if (!r) notFound();
  const [{ data: events }, { data: quotes }, { data: targets }, { data: loc }, { data: live }, { data: myProfiles }] = await Promise.all([
    supabase.from("roadside_events").select("*").eq("request_id", id).order("created_at"),
    supabase.from("roadside_quotes").select("*, professional_profiles(display_name, slug)").eq("request_id", id).order("created_at", { ascending: false }),
    supabase.from("roadside_targets").select("*, professional_profiles(display_name, slug, user_id)").eq("request_id", id),
    supabase.from("roadside_request_locations").select("*").eq("request_id", id).maybeSingle(),
    supabase.from("roadside_live_locations").select("*").eq("request_id", id).maybeSingle(),
    supabase.from("professional_profiles").select("id").eq("user_id", user.id),
  ]);
  const owner = r.user_id === user.id;
  const mine = new Set((myProfiles ?? []).map((p) => p.id));
  const myTarget = (targets ?? []).find((t) => mine.has(t.profile_id));
  const assigned = r.operator_profile_id !== null && mine.has(r.operator_profile_id);
  const st = ROADSIDE_STATUS[r.status];
  const active = ROADSIDE_ACTIVE.includes(r.status);
  const closed = ["completata", "annullata", "nessun_operatore"].includes(r.status);
  const { data: photos } = r.photo_paths.length ? await supabase.storage.from("service-photos").createSignedUrls(r.photo_paths, 600) : { data: [] };
  const chosen = (targets ?? []).find((t) => t.profile_id === r.operator_profile_id);
  const conv = owner ? chosen?.conversation_id : myTarget?.conversation_id;
  return (
    <>
      {active && <AutoRefresh />}
      <PageHeader title={`${ROADSIDE_SERVICES[r.service]} · ${r.vehicle_desc}`} description={`${r.area_text} · ${LOCATION_TYPES[r.location_type]} · richiesta del ${formatDateTime(r.created_at)}`} actions={<Badge tone={st.tone}>{st.label}</Badge>} />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 p-5">
            <p className="text-sm whitespace-pre-line">{r.description}</p>
            <p className="text-sm text-muted">{r.vehicle_drivable ? "Veicolo marciante" : "Veicolo non marciante"}{r.destination_text ? ` · destinazione: ${r.destination_text}` : ""}</p>
            {(photos?.length ?? 0) > 0 && <div className="flex flex-wrap gap-2">{photos!.flatMap((p) => (p.signedUrl ? [{ path: p.path ?? p.signedUrl, url: p.signedUrl }] : [])).map((p) => <a key={p.path} href={p.url} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="Foto del veicolo" className="size-24 rounded-lg object-cover" /></a>)}</div>}
            {loc && (owner || assigned) && (
              <div className="rounded-xl bg-mist p-3 text-sm">
                <p><strong>Telefono:</strong> <a className="underline" href={`tel:${loc.contact_phone.replace(/[^0-9+]/g, "")}`}>{loc.contact_phone}</a>{loc.plate ? ` · Targa ${loc.plate}` : ""}</p>
                {loc.address_text && <p><strong>Indirizzo:</strong> {loc.address_text}</p>}
                {loc.latitude !== null && <p><a className="font-semibold text-orange-700 underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=17/${loc.latitude}/${loc.longitude}`}>Apri la posizione esatta sulla mappa</a></p>}
                {owner && !assigned && r.operator_profile_id === null && <p className="text-xs text-muted">Questi dati saranno visibili solo all&apos;operatore di cui accetterai il preventivo.</p>}
              </div>
            )}
          </Card>

          {(owner || assigned) && (live || (loc?.latitude != null)) && !closed && (
            <Card className="p-4">
              <h2 className="mb-2 font-bold">Mappa dell&apos;intervento</h2>
              <MapView className="h-72" points={[
                ...(loc?.latitude != null ? [{ id: "auto", lat: loc.latitude, lng: loc.longitude!, label: "Posizione del veicolo" }] : []),
                ...(live ? [{ id: "op", lat: live.latitude, lng: live.longitude, label: `Operatore · aggiornata ${new Date(live.updated_at).toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" })}` }] : []),
              ]} />
              <p className="mt-2 text-xs text-muted">{live ? `Ultima posizione condivisa dall'operatore: ${formatDateTime(live.updated_at)}. ` : "L'operatore non sta condividendo la posizione: segui gli aggiornamenti di stato. "}Nessun tragitto o tempo di arrivo viene stimato dalla piattaforma.</p>
            </Card>
          )}

          {owner && <OwnerActions r={r} quotes={quotes ?? []} supabase={supabase} userId={user.id} />}
          {myTarget && !assigned && !closed && <OperatorQuote r={r} target={myTarget} />}
          {assigned && <OperatorActions r={r} live={Boolean(live)} />}
        </div>
        <aside className="flex flex-col gap-4">
          {conv && <ButtonLink href={`/dashboard/messaggi/${conv}`} variant="outline">Apri la conversazione</ButtonLink>}
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Cronologia</h2>
            <ol className="flex flex-col gap-1.5 text-sm">{(events ?? []).map((e) => <li key={e.id}><span className="text-muted">{formatDateTime(e.created_at)}</span> · {ROADSIDE_STATUS[e.status]?.label ?? e.status}{e.note ? ` — ${e.note}` : ""}</li>)}</ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

type R = { id: string; status: string; service: string; user_vehicle_id: string | null; repair_request_id: string | null; operator_profile_id: string | null; approx_lat: number | null };
type Q = { id: string; status: string; amount_cents: number; eta_minutes: number; includes: string; notes: string | null; valid_until: string; profile_id: string; professional_profiles: unknown };

async function OwnerActions({ r, quotes, supabase, userId }: { r: R; quotes: Q[]; supabase: SB; userId: string }) {
  const searching = ["in_ricerca", "inviata", "preventivo_ricevuto"].includes(r.status);
  const { data: candidates } = searching ? await supabase.rpc("roadside_candidates", { request_id: r.id }) : { data: [] };
  const fresh = (candidates ?? []).filter((c) => !c.already_sent);
  const { data: repairs } = ["consegnato", "completata"].includes(r.status) && !r.repair_request_id
    ? await supabase.from("repair_requests").select("id, vehicle_make, vehicle_model, created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(10) : { data: [] };
  const nowIso = new Date(nowMs()).toISOString();
  const open = quotes.filter((q) => q.status === "inviato" && q.valid_until > nowIso);
  return (
    <>
      {searching && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Operatori disponibili ora</h2>
          {!fresh.length ? (
            <Alert tone="warning">{(candidates?.length ?? 0) > 0 ? "Hai già contattato tutti gli operatori disponibili: attendi i preventivi." : "In questo momento nessun operatore verificato ha dichiarato disponibilità per questo intervento nella tua zona. Se hai l'assistenza nella polizza o dal costruttore, chiama il loro numero; in caso di pericolo chiama il 112."}</Alert>
          ) : (
            <ActionForm action={dispatchRoadside} submitLabel="Invia la richiesta agli operatori selezionati" hidden={{ id: r.id }}>
              <ul className="flex flex-col gap-2">{fresh.map((c) => (
                <li key={c.profile_id} className="rounded-xl border border-line p-3">
                  <Checkbox id={`c-${c.profile_id}`} name="profile_ids" value={c.profile_id} defaultChecked label={`${c.display_name}${c.city ? ` · ${c.city}` : ""}`} />
                  <p className="mt-1 pl-7 text-xs text-muted">{c.distance_km !== null ? `~${String(c.distance_km).replace(".", ",")} km dalla zona indicata · ` : ""}{c.h24 ? "H24 dichiarato" : `disponibile fino alle ${new Date(c.available_until!).toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" })}`}{c.review_count ? ` · ★ ${String(c.rating_avg).replace(".", ",")} (${c.review_count})` : ""}{c.verified ? " · azienda verificata" : ""}</p>
                  {c.price_notes && <p className="pl-7 text-xs">Tariffe dichiarate: {c.price_notes}</p>}
                </li>))}</ul>
            </ActionForm>
          )}
        </Card>
      )}
      {quotes.length > 0 && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Preventivi ({open.length} validi)</h2>
          <p className="text-xs text-muted">Prezzi e tempi sono dichiarati dagli operatori. Il pagamento avviene direttamente con l&apos;operatore scelto.</p>
          <div className="grid gap-3 sm:grid-cols-2">{quotes.map((q) => {
            const p = q.professional_profiles as { display_name: string; slug: string };
            const valid = q.status === "inviato" && q.valid_until > nowIso;
            return (
              <div key={q.id} className={`flex flex-col gap-1 rounded-xl border p-4 ${q.status === "accettato" ? "border-success bg-success-50" : "border-line"}`}>
                <p className="font-bold">{p.display_name}</p>
                <p className="text-2xl font-extrabold tabular-nums">{formatPrice(q.amount_cents)}</p>
                <p className="text-sm">Arrivo stimato dall&apos;operatore: <strong>{q.eta_minutes} min</strong></p>
                <p className="text-sm whitespace-pre-line">{q.includes}</p>
                {q.notes && <p className="text-xs whitespace-pre-line text-graphite">{q.notes}</p>}
                <p className="text-xs text-muted">Valido fino alle {new Date(q.valid_until).toLocaleTimeString("it-IT", { timeZone: "Europe/Rome", hour: "2-digit", minute: "2-digit" })} · {q.status}</p>
                {valid && searching && <ActionForm action={acceptRoadsideQuote} submitLabel="Accetta questo preventivo" size="sm" hidden={{ quote_id: q.id, id: r.id }} confirm="Accettare? L'operatore riceverà indirizzo e telefono." />}
              </div>
            );
          })}</div>
        </Card>
      )}
      {!["completata", "annullata", "nessun_operatore"].includes(r.status) && (
        <Card className="flex flex-col gap-3 p-5">
          {["operatore_arrivato", "intervento_in_corso", "veicolo_caricato", "in_trasporto", "consegnato"].includes(r.status) && (
            <ActionForm action={updateRoadsideStatus} submitLabel="Confermo: intervento completato" hidden={{ id: r.id, status: "completata" }} />
          )}
          <ActionForm action={updateRoadsideStatus} submitLabel="Annulla la richiesta" variant="danger" size="sm" hidden={{ id: r.id, status: "annullata" }} confirm="Annullare la richiesta? Gli operatori saranno avvisati.">
            <Field id="an" label="Motivo" optional><Input id="an" name="note" maxLength={500} /></Field>
          </ActionForm>
        </Card>
      )}
      {["consegnato", "completata"].includes(r.status) && (
        <Card className="flex flex-col gap-3 p-5">
          <h2 className="font-bold">Serve una riparazione?</h2>
          {r.repair_request_id ? <p className="text-sm">Richiesta di intervento collegata: <Link className="font-semibold underline" href={`/dashboard/richieste-intervento/${r.repair_request_id}`}>apri</Link></p> : (
            <>
              <p className="text-sm text-graphite">Chiedi i preventivi alle officine compatibili con la procedura già esistente: descrivi il guasto e scegli le officine.</p>
              <ButtonLink href={`/richiedi-intervento${r.user_vehicle_id ? `?auto=${r.user_vehicle_id}` : ""}`} className="w-fit">Richiedi un preventivo di riparazione</ButtonLink>
              {(repairs?.length ?? 0) > 0 && (
                <ActionForm action={linkRoadsideRepair} submitLabel="Collega allo storico del soccorso" size="sm" variant="outline" hidden={{ id: r.id }}>
                  <Field id="rr" label="Hai già inviato la richiesta? Collegala"><Select id="rr" name="repair_id">{repairs!.map((x) => <option key={x.id} value={x.id}>{x.vehicle_make} {x.vehicle_model} · {formatDateTime(x.created_at)}</option>)}</Select></Field>
                </ActionForm>
              )}
            </>
          )}
        </Card>
      )}
    </>
  );
}

function OperatorQuote({ r, target }: { r: R; target: { status: string } }) {
  if (target.status === "rifiutata") return <Alert tone="info">Hai rifiutato questa richiesta.</Alert>;
  if (target.status === "scartata") return <Alert tone="info">Il cliente ha scelto un altro operatore.</Alert>;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="font-bold">{target.status === "preventivo" ? "Aggiorna il preventivo" : "Invia un preventivo"}</h2>
      <p className="text-xs text-muted">Indirizzo esatto e telefono ti arrivano se il cliente accetta. Indica solo prezzi e tempi che puoi garantire.</p>
      <ActionForm action={sendRoadsideQuote} submitLabel="Invia preventivo" hidden={{ id: r.id }}>
        {((s: FormState) => (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="qa" label="Prezzo totale (€, IVA inclusa)" error={s.fieldErrors?.amount}><Input id="qa" name="amount" type="number" min={0} step="0.01" required inputMode="decimal" /></Field>
            <Field id="qe" label="Arrivo stimato (minuti)" error={s.fieldErrors?.eta_minutes}><Input id="qe" name="eta_minutes" type="number" min={5} max={720} required /></Field>
            <Field id="qi" label="Cosa comprende" error={s.fieldErrors?.includes} className="sm:col-span-2"><Textarea id="qi" name="includes" rows={2} required maxLength={1000} placeholder="Es. uscita, traino fino a 20 km, scarico in officina" /></Field>
            <Field id="qc" label="Costo di uscita" optional><Input id="qc" name="call_fee" maxLength={100} placeholder="Es. incluso" /></Field>
            <Field id="qx" label="Costi aggiuntivi possibili" optional><Input id="qx" name="extras" maxLength={400} placeholder="Es. € 1,50/km oltre i 20 km" /></Field>
            <Field id="qd" label="Condizioni e limitazioni" optional className="sm:col-span-2"><Input id="qd" name="conditions" maxLength={400} /></Field>
            <Field id="qv" label="Validità"><Select id="qv" name="valid_minutes" defaultValue="60"><option value="30">30 minuti</option><option value="60">1 ora</option><option value="180">3 ore</option><option value="1440">24 ore</option></Select></Field>
          </div>
        ))(initialFormState)}
      </ActionForm>
      <ActionForm action={declineRoadside} submitLabel="Non posso intervenire" variant="ghost" size="sm" hidden={{ id: r.id }}>
        <Field id="dr" label="Motivo per il cliente" optional><Input id="dr" name="reason" maxLength={300} /></Field>
      </ActionForm>
    </Card>
  );
}

function OperatorActions({ r, live }: { r: R; live: boolean }) {
  const next = ROADSIDE_NEXT[r.status] ?? [];
  const active = ROADSIDE_ACTIVE.includes(r.status);
  if (!next.length && !active) return null;
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="font-bold">Aggiorna l&apos;intervento</h2>
      <div className="flex flex-wrap gap-2">{next.map((n) => <ActionForm key={n} action={updateRoadsideStatus} submitLabel={ROADSIDE_STATUS[n].label} size="sm" variant={n === next[0] ? "primary" : "outline"} hidden={{ id: r.id, status: n }} />)}</div>
      {active && <ShareLocation requestId={r.id} sharing={live} />}
      {active && (
        <ActionForm action={updateRoadsideStatus} submitLabel="Annulla l'intervento" size="sm" variant="danger" hidden={{ id: r.id, status: "annullata" }} confirm="Annullare? Il cliente sarà avvisato.">
          <Field id="on" label="Motivo (obbligatorio, visibile al cliente)"><Input id="on" name="note" required maxLength={500} /></Field>
        </ActionForm>
      )}
    </Card>
  );
}
