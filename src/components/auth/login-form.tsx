"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, describedBy } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { signInAction } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/validation/form-state";
import { t } from "@/i18n";

export function LoginForm() {
  const params = useSearchParams();
  const [state, action] = useActionState(signInAction, initialFormState);
  const e = state.fieldErrors ?? {};
  const notice = params.get("messaggio");

  return (
    <form action={action} className="flex flex-col gap-5" noValidate key={JSON.stringify(state.values ?? {})}>
      {notice === "confermato" && state.status === "idle" && (
        <Alert tone="success" title="Email confermata">
          Ora puoi accedere al tuo account.
        </Alert>
      )}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}

      <input type="hidden" name="next" value={params.get("next") ?? ""} />

      <Field id="email" label={t.auth.email} error={e.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={state.values?.email}
          {...describedBy("email", e.email)}
        />
      </Field>

      <Field id="password" label={t.auth.password} error={e.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...describedBy("password", e.password)}
        />
      </Field>

      <div className="-mt-2 text-right">
        <Link href="/recupera-password" className="text-sm font-semibold text-orange-700 hover:underline">
          {t.auth.forgotPassword}
        </Link>
      </div>

      <SubmitButton size="lg" className="w-full" pendingText="Accesso in corso…">
        {t.auth.submitLogin}
      </SubmitButton>
    </form>
  );
}
