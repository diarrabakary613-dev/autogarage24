"use client";

import { ActionForm } from "@/components/ui/action-form";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { requestInspection } from "@/lib/actions/inspection";
import { formatHour, groupByDay } from "@/lib/bookings/time";
import { INSPECTION_CATEGORIES } from "@/lib/inspection/labels";

type Slot = { starts_at: string; ends_at: string };
type Vehicle = { id: string; make: string; model: string; plate: string | null; inspection_category: string };

export function InspectionBookingForm({ centerId, slug, slots, vehicles, categories, today }: {
  centerId: string; slug: string; slots: Slot[]; vehicles: Vehicle[]; categories: string[]; today: string;
}) {
  const days = groupByDay(slots);
  const v = vehicles[0];
  return (
    <ActionForm action={requestInspection} submitLabel="Invia la richiesta di appuntamento" hidden={{ center_profile_id: centerId, slug }}>
      {(s) => {
        const e = s.fieldErrors ?? {};
        return (
          <>
            {vehicles.length > 0 && (
              <Field id="ib-v" label="Auto dal tuo garage" optional>
                <Select id="ib-v" name="user_vehicle_id" defaultValue={v?.id}>{vehicles.map((x) => <option key={x.id} value={x.id}>{x.make} {x.model}</option>)}<option value="">Un&apos;altra auto</option></Select>
              </Field>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="ib-d" label="Marca e modello" error={e.vehicle_desc}><Input id="ib-d" name="vehicle_desc" required maxLength={120} defaultValue={v ? `${v.make} ${v.model}` : ""} /></Field>
              <Field id="ib-c" label="Categoria"><Select id="ib-c" name="vehicle_category" defaultValue={v?.inspection_category ?? categories[0]}>{categories.map((c) => <option key={c} value={c}>{INSPECTION_CATEGORIES[c]}</option>)}</Select></Field>
              <Field id="ib-p" label="Targa" optional hint="Visibile solo al centro."><Input id="ib-p" name="plate" maxLength={12} defaultValue={v?.plate ?? ""} className="uppercase" /></Field>
            </div>
            {slots.length > 0 ? (
              <fieldset>
                <legend className="mb-1 text-sm font-semibold">Orari disponibili indicati dal centro</legend>
                {e.preferred_date && <p role="alert" className="text-xs text-danger">{e.preferred_date}</p>}
                <div className="flex max-h-72 flex-col gap-3 overflow-y-auto">{days.map((d) => (
                  <div key={d.day}><p className="text-xs font-semibold text-muted capitalize">{d.day}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">{d.slots.map((sl) => (
                      <label key={sl.starts_at} className="cursor-pointer"><input type="radio" name="starts_at" value={sl.starts_at} className="peer sr-only" required />
                        <span className="inline-block rounded-lg border border-line-strong px-2.5 py-1 text-sm tabular-nums peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-orange">{formatHour(sl.starts_at)}</span></label>
                    ))}</div></div>))}</div>
              </fieldset>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <p className="text-sm text-muted sm:col-span-2">Il centro non ha pubblicato orari prenotabili online: indica una data preferita, ti risponderà con un orario.</p>
                <Field id="ib-pd" label="Data preferita" error={e.preferred_date}><Input id="ib-pd" name="preferred_date" type="date" min={today} required /></Field>
                <Field id="ib-pt" label="Fascia oraria" optional><Input id="ib-pt" name="preferred_time" maxLength={80} placeholder="Es. mattina" /></Field>
              </div>
            )}
            <Field id="ib-m" label="Messaggio" optional><Textarea id="ib-m" name="message" rows={2} maxLength={1000} /></Field>
          </>
        );
      }}
    </ActionForm>
  );
}
