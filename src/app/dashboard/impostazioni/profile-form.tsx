"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/feedback";
import { Checkbox, Field, Input, describedBy } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { initialFormState } from "@/lib/validation/form-state";
import { updateProfileAction } from "./actions";

export type ProfileFormDefaults = {
  fullName: string;
  phone: string;
  city: string;
  postalCode: string;
  marketingConsent: boolean;
};

export function ProfileForm({ defaults }: { defaults: ProfileFormDefaults }) {
  const [state, action] = useActionState(updateProfileAction, initialFormState);
  const e = state.fieldErrors ?? {};
  const v = state.status === "error" && state.values ? state.values : null;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate key={JSON.stringify(v)}>
      {state.message && <Alert tone={state.status === "success" ? "success" : "error"}>{state.message}</Alert>}

      <Field id="fullName" label="Nome e cognome" error={e.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={v?.fullName ?? defaults.fullName}
          {...describedBy("fullName", e.fullName)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="phone" label="Telefono" optional error={e.phone}>
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={v?.phone ?? defaults.phone}
            {...describedBy("phone", e.phone)}
          />
        </Field>
        <Field id="city" label="Città" optional error={e.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            defaultValue={v?.city ?? defaults.city}
            {...describedBy("city", e.city)}
          />
        </Field>
        <Field id="postalCode" label="CAP" optional error={e.postalCode}>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            inputMode="numeric"
            defaultValue={v?.postalCode ?? defaults.postalCode}
            {...describedBy("postalCode", e.postalCode)}
          />
        </Field>
      </div>

      <Checkbox
        id="marketingConsent"
        name="marketingConsent"
        defaultChecked={v ? v.marketingConsent === "on" : defaults.marketingConsent}
        label="Desidero ricevere comunicazioni su novità e servizi di AutoGarage24 (revocabile in ogni momento)."
      />

      <div>
        <SubmitButton pendingText="Salvataggio…">Salva le modifiche</SubmitButton>
      </div>
    </form>
  );
}
