"use client";

import { ActionForm } from "@/components/ui/action-form";
import { FileUploader } from "@/components/ui/file-uploader";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { createTransportRequest } from "@/lib/actions/transport";
import { REGIONS } from "@/lib/geo/regions";
import { TRANSPORT_SERVICES } from "@/lib/services/labels";

export function TransportForm({ userId, listing, vehicles, today }: {
  userId: string; today: string;
  listing: { id: string; title: string; city: string | null } | null;
  vehicles: { id: string; make: string; model: string }[];
}) {
  return (
    <ActionForm action={createTransportRequest} submitLabel="Richiedi preventivi" pendingLabel="Invio…" hidden={listing ? { listing_id: listing.id } : undefined}>
      {(s) => {
        const e = s.fieldErrors ?? {};
        return (
          <>
            {listing && <p className="rounded-xl bg-orange-50 p-3 text-sm">Trasporto collegato all&apos;annuncio <strong>{listing.title}</strong>.</p>}
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-lg font-bold">Veicolo</legend>
              {!listing && vehicles.length > 0 && (
                <Field id="t-uv" label="Auto dal tuo garage" optional className="sm:col-span-2"><Select id="t-uv" name="user_vehicle_id" defaultValue=""><option value="">Nessuna</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}</Select></Field>
              )}
              <Field id="t-vd" label="Marca e modello" error={e.vehicle_desc}><Input id="t-vd" name="vehicle_desc" required maxLength={120} defaultValue={listing?.title ?? ""} /></Field>
              <Field id="t-cat" label="Categoria"><Select id="t-cat" name="vehicle_category" defaultValue="auto"><option value="city_car">Citycar</option><option value="auto">Berlina / station wagon</option><option value="suv">SUV / fuoristrada</option><option value="furgone">Veicolo commerciale leggero</option><option value="moto">Moto</option><option value="epoca">Auto d&apos;epoca</option></Select></Field>
              <Field id="t-sv" label="Tipo di trasporto" error={e.service}><Select id="t-sv" name="service" defaultValue="indifferente">{Object.entries(TRANSPORT_SERVICES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
              <div className="flex items-end pb-2"><Checkbox id="t-dr" name="vehicle_drivable" defaultChecked label="Il veicolo è marciante" /></div>
              <Field id="t-cond" label="Condizioni generali" optional className="sm:col-span-2"><Input id="t-cond" name="vehicle_condition" maxLength={500} placeholder="Es. carrozzeria buona, pneumatici sgonfi" /></Field>
            </fieldset>
            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-lg font-bold">Ritiro</legend>
              <Field id="t-pc" label="Città" error={e.pickup_city}><Input id="t-pc" name="pickup_city" required maxLength={80} defaultValue={listing?.city ?? ""} /></Field>
              <Field id="t-pcap" label="CAP" optional error={e.pickup_postal_code}><Input id="t-pcap" name="pickup_postal_code" inputMode="numeric" maxLength={5} /></Field>
              <Field id="t-pr" label="Regione" error={e.pickup_region}><Select id="t-pr" name="pickup_region" defaultValue="Lombardia">{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
              <Field id="t-pa" label="Indirizzo di ritiro" error={e.pickup_address} hint="Visibile solo al trasportatore scelto." className="sm:col-span-3"><Input id="t-pa" name="pickup_address" required maxLength={300} /></Field>
            </fieldset>
            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-lg font-bold">Consegna</legend>
              <Field id="t-dc" label="Città" error={e.delivery_city}><Input id="t-dc" name="delivery_city" required maxLength={80} /></Field>
              <Field id="t-dcap" label="CAP" optional error={e.delivery_postal_code}><Input id="t-dcap" name="delivery_postal_code" inputMode="numeric" maxLength={5} /></Field>
              <Field id="t-drg" label="Regione" error={e.delivery_region}><Select id="t-drg" name="delivery_region" defaultValue="Lombardia">{REGIONS.map((r) => <option key={r}>{r}</option>)}</Select></Field>
              <Field id="t-da" label="Indirizzo di consegna" error={e.delivery_address} hint="Visibile solo al trasportatore scelto." className="sm:col-span-3"><Input id="t-da" name="delivery_address" required maxLength={300} /></Field>
            </fieldset>
            <fieldset className="grid gap-3 sm:grid-cols-3">
              <legend className="mb-2 text-lg font-bold">Quando</legend>
              <Field id="t-f" label="Dal" error={e.date_from}><Input id="t-f" name="date_from" type="date" min={today} required /></Field>
              <Field id="t-t" label="Al (flessibilità)" error={e.date_to}><Input id="t-t" name="date_to" type="date" min={today} /></Field>
              <Field id="t-u" label="Priorità"><Select id="t-u" name="urgency" defaultValue="programmato"><option value="programmato">Programmato</option><option value="urgente">Urgente</option></Select></Field>
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="t-cn" label="Referente per ritiro e consegna" error={e.contact_name}><Input id="t-cn" name="contact_name" required maxLength={120} autoComplete="name" /></Field>
              <Field id="t-cp" label="Telefono del referente" error={e.contact_phone}><Input id="t-cp" name="contact_phone" type="tel" required autoComplete="tel" /></Field>
            </div>
            <Field id="t-n" label="Informazioni aggiuntive" optional><Textarea id="t-n" name="notes" rows={3} maxLength={2000} /></Field>
            <FileUploader bucket="service-photos" folder={userId} kind="image" label="Foto del veicolo (facoltative)" multiple max={6} name="photo_paths" />
            <Checkbox id="t-cons" name="consent" error={e.consent} label="Acconsento a mostrare ai trasportatori attivi città, date e dati del veicolo, e a condividere indirizzi e referente solo con il trasportatore di cui accetterò il preventivo." />
          </>
        );
      }}
    </ActionForm>
  );
}
