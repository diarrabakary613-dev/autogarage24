"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, describedBy } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestPasswordResetAction, updatePasswordAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { t } from "@/i18n";

export function ResetRequestForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialFormState);
  const e = state.fieldErrors ?? {};

  if (state.status === "success") {
    return <Alert tone="success" title="Email inviata">{state.message}</Alert>;
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <Field id="email" label={t.auth.email} error={e.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          {...describedBy("email", e.email)}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Invio in corso…">
        {t.auth.resetSubmit}
      </SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialFormState);
  const e = state.fieldErrors ?? {};

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}
      <Field id="password" label="Nuova password" error={e.password} hint={t.auth.passwordHint}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          {...describedBy("password", e.password, true)}
        />
      </Field>
      <Field id="confirmPassword" label={t.auth.confirmPassword} error={e.confirmPassword}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          {...describedBy("confirmPassword", e.confirmPassword)}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Salvataggio…">
        {t.auth.updateSubmit}
      </SubmitButton>
    </form>
  );
}
