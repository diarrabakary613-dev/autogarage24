"use client";

import Link from "next/link";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { AttributionFields as SourceFields } from "@/components/analytics/attribution-fields";
import { joinBeta, submitPartnerApplication } from "@/lib/actions/partner";
import { BETA_AUDIENCES, BUSINESS_TYPES, type BusinessType } from "@/lib/crm";

/** Sorgente della visita (solo in memoria) inviata insieme al modulo. */
function AttributionFields() {
  return (
    <>
      <SourceFields />
      {/* Campo trappola per i bot: invisibile alle persone. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="pf-website">Sito web</label>
        <input id="pf-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
}

const PrivacyLabel = () => (
  <>Ho letto l&apos;<Link className="underline" href="/privacy">informativa privacy</Link>. I dati servono solo a ricontattarmi per il programma.</>
);

export function PartnerApplicationForm({
  program, types, defaultType, showCars = false, showFounding = true, idPrefix = "pa",
}: {
  program: "partner_auto" | "partner_professionisti" | "founding";
  types: BusinessType[];
  defaultType?: BusinessType;
  showCars?: boolean;
  showFounding?: boolean;
  idPrefix?: string;
}) {
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <ActionForm action={submitPartnerApplication} submitLabel="Invia la candidatura" pendingLabel="Invio in corso…" hidden={{ program }} resetOnSuccess className="relative">
      {(s) => {
        const v = s.values ?? {};
        const e = s.fieldErrors ?? {};
        return (
          <div className="grid gap-4">
            <AttributionFields />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={id("bn")} label="Nome attività" error={e.business_name}><Input id={id("bn")} name="business_name" autoComplete="organization" defaultValue={v.business_name} required /></Field>
              <Field id={id("ty")} label="Tipologia attività" error={e.applicant_type}>
                <Select id={id("ty")} name="applicant_type" defaultValue={v.applicant_type ?? defaultType ?? types[0]}>
                  {types.map((t) => <option key={t} value={t}>{BUSINESS_TYPES[t]}</option>)}
                </Select>
              </Field>
              <Field id={id("cn")} label="Nome del referente" error={e.contact_name}><Input id={id("cn")} name="contact_name" autoComplete="name" defaultValue={v.contact_name} required /></Field>
              <Field id={id("em")} label="Email" error={e.email}><Input id={id("em")} name="email" type="email" autoComplete="email" defaultValue={v.email} required /></Field>
              <Field id={id("ph")} label="Telefono" error={e.phone}><Input id={id("ph")} name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} required /></Field>
              <Field id={id("ci")} label="Città" error={e.city}><Input id={id("ci")} name="city" autoComplete="address-level2" defaultValue={v.city ?? "Milano"} required /></Field>
              <Field id={id("ad")} label="Indirizzo" optional className="sm:col-span-2"><Input id={id("ad")} name="address" autoComplete="street-address" defaultValue={v.address} /></Field>
              {showCars && <Field id={id("ca")} label="Numero indicativo di automobili disponibili" optional><Input id={id("ca")} name="cars_available" inputMode="numeric" defaultValue={v.cars_available} /></Field>}
            </div>
            <Field id={id("ms")} label="Messaggio" optional><Textarea id={id("ms")} name="message" rows={3} defaultValue={v.message} placeholder="Raccontaci brevemente la tua attività o le tue domande." /></Field>
            {showFounding && <Checkbox id={id("fo")} name="founding" label="Mi interessa il programma Founding Partners (primi 20 partner a Milano)." />}
            <Checkbox id={id("pr")} name="privacy" label={<PrivacyLabel />} error={e.privacy} />
          </div>
        );
      }}
    </ActionForm>
  );
}

export function BetaSignupForm({ defaultAudience = "cerco_auto", idPrefix = "beta" }: { defaultAudience?: keyof typeof BETA_AUDIENCES; idPrefix?: string }) {
  return (
    <ActionForm action={joinBeta} submitLabel="Entra nella Beta" pendingLabel="Invio…" resetOnSuccess className="relative">
      {(s) => (
        <div className="grid gap-4">
          <AttributionFields />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${idPrefix}-em`} label="Email" error={s.fieldErrors?.email}><Input id={`${idPrefix}-em`} name="email" type="email" autoComplete="email" required /></Field>
            <Field id={`${idPrefix}-au`} label="Ti descrive meglio">
              <Select id={`${idPrefix}-au`} name="audience" defaultValue={defaultAudience}>{Object.entries(BETA_AUDIENCES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
            </Field>
            <Field id={`${idPrefix}-ci`} label="Città" optional><Input id={`${idPrefix}-ci`} name="city" autoComplete="address-level2" defaultValue="Milano" /></Field>
          </div>
          <Checkbox id={`${idPrefix}-pr`} name="privacy" label={<>Ho letto l&apos;<Link className="underline" href="/privacy">informativa privacy</Link>. Userete l&apos;email solo per l&apos;accesso alla Beta.</>} error={s.fieldErrors?.privacy} />
        </div>
      )}
    </ActionForm>
  );
}
