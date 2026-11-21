import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Alert, Badge, Card, Skeleton } from "@/components/ui/feedback";
import { ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { respondBooking } from "@/lib/actions/bookings";
import { BOOKING_KINDS, BOOKING_STATUS, formatSlot, nowMs } from "@/lib/bookings/time";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Prenotazione", robots: { index: false } };

export default function BookingPage(props: PageProps<"/dashboard/prenotazioni/[id]">) {
  return <Suspense fallback={<Skeleton className="h-96" />}><Detail params={props.params} searchParams={props.searchParams} /></Suspense>;
}

const EVENTS: Record<string, string> = { creata: "Richiesta inviata", conferma: "Confermata", rifiuta: "Rifiutata", proponi: "Nuovo orario proposto", accetta_modifica: "Nuovo orario accettato",
  rifiuta_modifica: "Nuovo orario rifiutato", annulla: "Annullata", completa: "Segnata come completata", mancata_presentazione: "Mancata presentazione", annullata_staff: "Annullata dallo staff", promemoria: "Promemoria inviato" };

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const user = await requireUser(`/dashboard/prenotazioni/${id}`);
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: b } = await supabase.from("vehicle_bookings").select("*, vehicle_listings(title, slug)").eq("id", id).maybeSingle();
  if (!b) notFound();
  const [{ data: events }, { data: meeting }, { data: conv }] = await Promise.all([
    supabase.from("vehicle_booking_events").select("*").eq("booking_id", id).order("created_at"),
    supabase.rpc("booking_meeting_info", { booking_id: id }),
    b.request_id ? supabase.from("conversations").select("id").eq("request_id", b.request_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const l = b.vehicle_listings as unknown as { title: string; slug: string } | null;
  const seller = b.seller_id === user.id;
  const st = BOOKING_STATUS[b.status];
  const open = ["in_attesa", "confermato", "modifica_proposta"].includes(b.status);
  const past = new Date(b.starts_at).getTime() < nowMs();
  const m = meeting?.[0];
  return (
    <>
      <PageHeader title={l?.title ?? "Prenotazione"} description={`${BOOKING_KINDS[b.kind]} · ${seller ? "ricevuta sul tuo annuncio" : "richiesta da te"}`} actions={<Badge tone={st.tone}>{st.label}</Badge>} />
      {sp.creata && <Alert tone="success" className="mb-4">Richiesta inviata. Il venditore riceve una notifica e deve confermare l&apos;orario.</Alert>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-2 p-5">
            <p className="text-lg font-bold capitalize">{formatSlot(b.starts_at)}</p>
            {b.alt_starts_at && <p className="text-sm">Alternativa indicata: <span className="capitalize">{formatSlot(b.alt_starts_at)}</span></p>}
            {b.status === "modifica_proposta" && b.proposed_starts_at && <Alert tone="info">Il venditore propone: <strong className="capitalize">{formatSlot(b.proposed_starts_at)}</strong></Alert>}
            {b.message && <p className="text-sm whitespace-pre-line"><strong>Messaggio:</strong> {b.message}</p>}
            {seller && b.contact_phone && <p className="text-sm"><strong>Telefono dell&apos;acquirente:</strong> <a className="underline" href={`tel:${b.contact_phone.replace(/[^0-9+]/g, "")}`}>{b.contact_phone}</a></p>}
            {(b.kind === "test_drive" || b.kind === "visione_test_drive") && <p className="text-sm">Test drive: patente dichiarata {b.license_confirmed ? "sì" : "no"}{b.driving_years !== null ? ` · ${b.driving_years} anni di patente` : ""} · condizioni accettate {b.conditions_accepted ? "sì" : "no"}</p>}
            {b.decision_note && <p className="text-sm"><strong>Nota:</strong> {b.decision_note}</p>}
            {m?.address ? <p className="text-sm"><strong>Luogo dell&apos;appuntamento:</strong> {m.address}</p> : b.status !== "confermato" ? <p className="text-xs text-muted">L&apos;indirizzo dell&apos;incontro è visibile dopo la conferma.</p> : <p className="text-xs text-muted">Il venditore non ha indicato un indirizzo: concordalo nei messaggi.</p>}
            {m?.test_drive_conditions && <p className="text-sm whitespace-pre-line"><strong>Condizioni del test drive:</strong> {m.test_drive_conditions}</p>}
          </Card>
          {open && (
            <Card className="flex flex-col gap-3 p-5">
              <h2 className="font-bold">Azioni</h2>
              <div className="flex flex-wrap gap-2">
                {seller && b.status === "in_attesa" && <><Act id={id} action="conferma" label="Conferma l'orario" variant="primary" /><Act id={id} action="rifiuta" label="Rifiuta" variant="ghost" confirm="Rifiutare la prenotazione?" /></>}
                {!seller && b.status === "modifica_proposta" && <><Act id={id} action="accetta_modifica" label="Accetta il nuovo orario" variant="primary" /><Act id={id} action="rifiuta_modifica" label="Rifiuta il nuovo orario" variant="ghost" /></>}
                {seller && b.status === "confermato" && past && <><Act id={id} action="completa" label="Appuntamento svolto" variant="primary" /><Act id={id} action="mancata_presentazione" label="Non si è presentato" variant="ghost" confirm="Confermi la mancata presentazione?" /></>}
                <Act id={id} action="annulla" label="Annulla la prenotazione" variant="danger" confirm="Annullare? L'altra parte riceve una notifica." />
              </div>
              {seller && ["in_attesa", "confermato"].includes(b.status) && (
                <ActionForm action={respondBooking} submitLabel="Proponi un altro orario" size="sm" variant="outline" hidden={{ id, action: "proponi" }} className="border-t border-line pt-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Field id="np" label="Nuovo orario (ora di Milano)"><Input id="np" name="new_starts_at" type="datetime-local" required /></Field>
                    <Field id="nn" label="Nota" optional><Input id="nn" name="note" maxLength={500} /></Field>
                  </div>
                </ActionForm>
              )}
            </Card>
          )}
        </div>
        <aside className="flex flex-col gap-4">
          {conv && <ButtonLink href={`/dashboard/messaggi/${conv.id}`} variant="outline">Apri la conversazione</ButtonLink>}
          {l && <Link className="text-sm font-semibold text-orange-700 hover:underline" href={`/auto/${l.slug}`}>Vai all&apos;annuncio →</Link>}
          <Card className="p-4">
            <h2 className="mb-2 font-bold">Cronologia</h2>
            <ol className="flex flex-col gap-1.5 text-sm">{(events ?? []).map((e) => <li key={e.id}><span className="text-muted">{formatDateTime(e.created_at)}</span> · {EVENTS[e.event] ?? e.event}</li>)}</ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Act({ id, action, label, variant = "outline", confirm }: { id: string; action: string; label: string; variant?: "primary" | "outline" | "danger" | "ghost"; confirm?: string }) {
  return <ActionForm action={respondBooking} submitLabel={label} size="sm" variant={variant} hidden={{ id, action }} confirm={confirm} />;
}
