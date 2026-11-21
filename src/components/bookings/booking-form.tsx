"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createBooking } from "@/lib/actions/bookings";
import { BOOKING_KINDS, formatHour, groupByDay } from "@/lib/bookings/time";

type Slot = { starts_at: string; ends_at: string };

/** Modulo di prenotazione: solo orari realmente liberi calcolati dal database. */
export function BookingForm({ listingId, slug, slots, testDrive }: {
  listingId: string; slug: string; slots: Slot[];
  testDrive: { enabled: boolean; minYears: number | null; conditions: string | null };
}) {
  const [kind, setKind] = useState("visione");
  const td = kind === "test_drive" || kind === "visione_test_drive";
  const days = groupByDay(slots);
  const kinds = Object.entries(BOOKING_KINDS).filter(([k]) => testDrive.enabled || !(k === "test_drive" || k === "visione_test_drive"));
  return (
    <ActionForm action={createBooking} submitLabel="Invia richiesta di prenotazione" pendingLabel="Invio…" hidden={{ listing_id: listingId, slug }}>
      {(state) => {
        const e = state.fieldErrors ?? {};
        return (
          <>
            <Field id="bk-kind" label="Tipo di appuntamento" error={e.kind}>
              <Select id="bk-kind" name="kind" value={kind} onChange={(ev) => setKind(ev.target.value)}>{kinds.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">Orario preferito</legend>
              {e.starts_at && <p role="alert" className="text-xs font-medium text-danger">{e.starts_at}</p>}
              <div className="flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
                {days.map((d) => (
                  <div key={d.day}>
                    <p className="text-xs font-semibold text-muted capitalize">{d.day}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {d.slots.map((s) => (
                        <label key={s.starts_at} className="cursor-pointer">
                          <input type="radio" name="starts_at" value={s.starts_at} className="peer sr-only" required />
                          <span className="inline-block rounded-lg border border-line-strong px-2.5 py-1 text-sm tabular-nums peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-orange">{formatHour(s.starts_at)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
            <Field id="bk-alt" label="Orario alternativo" optional error={e.alt_starts_at} hint="Se il primo non va bene, il venditore può confermare questo.">
              <Select id="bk-alt" name="alt_starts_at" defaultValue="">
                <option value="">Nessuno</option>
                {slots.map((s) => <option key={s.starts_at} value={s.starts_at}>{new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(s.starts_at))}</option>)}
              </Select>
            </Field>
            {td && (
              <div className="flex flex-col gap-3 rounded-xl border border-orange/40 bg-orange-50 p-3">
                <p className="text-sm font-semibold">Test drive</p>
                <Checkbox id="bk-lic" name="license_confirmed" label="Dichiaro di avere una patente di guida valida per questo veicolo e la porterò all'appuntamento." error={e.license_confirmed} />
                <Field id="bk-years" label="Anni di patente" optional hint={testDrive.minYears ? `Il venditore richiede almeno ${testDrive.minYears} anni di patente.` : undefined}>
                  <Input id="bk-years" name="driving_years" type="number" min={0} max={70} inputMode="numeric" className="w-28" />
                </Field>
                {testDrive.conditions && <p className="text-sm whitespace-pre-line"><strong>Condizioni del venditore:</strong> {testDrive.conditions}</p>}
                <p className="text-xs text-graphite">Il test drive si svolge sotto la responsabilità delle parti e secondo la copertura assicurativa del veicolo indicata dal venditore. AutoGarage24 mette in contatto le parti ma non organizza né assicura la prova su strada: chiedi al venditore le condizioni di copertura prima dell&apos;appuntamento.</p>
                <Checkbox id="bk-cond" name="conditions_accepted" label="Ho letto e accetto le condizioni del test drive." error={e.conditions_accepted} />
              </div>
            )}
            <Field id="bk-phone" label="Telefono per il venditore" optional error={e.contact_phone} hint="Visibile solo al venditore di questo annuncio.">
              <Input id="bk-phone" name="contact_phone" type="tel" autoComplete="tel" />
            </Field>
            <Field id="bk-msg" label="Messaggio" optional><Textarea id="bk-msg" name="message" rows={3} maxLength={1000} /></Field>
          </>
        );
      }}
    </ActionForm>
  );
}
