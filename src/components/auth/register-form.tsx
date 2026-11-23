"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AttributionFields } from "@/components/analytics/attribution-fields";
import { Building2, Car, Cog, Package, User, type LucideIcon, LifeBuoy, Truck, ClipboardCheck } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Checkbox, Field, Input, describedBy } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { signUpAction } from "@/lib/auth/actions";
import {
  isProfessionalRole,
  isSelfAssignableRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  SELF_ASSIGNABLE_ROLES,
  type SelfAssignableRole,
} from "@/lib/auth/roles";
import { initialFormState } from "@/lib/validation/form-state";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const ROLE_ICONS: Record<SelfAssignableRole, LucideIcon> = {
  cliente: User,
  officina: Building2,
  meccanico: Cog,
  venditore_auto: Car,
  venditore_ricambi: Package,
  soccorritore: LifeBuoy,
  trasportatore: Truck,
  centro_revisione: ClipboardCheck,
};

export function RegisterForm() {
  const params = useSearchParams();
  const [state, action] = useActionState(signUpAction, initialFormState);

  const fromQuery = params.get("tipo") === "professionista" ? "officina" : params.get("ruolo");
  const initialRole: SelfAssignableRole = isSelfAssignableRole(state.values?.role)
    ? state.values.role
    : isSelfAssignableRole(fromQuery)
      ? fromQuery
      : "cliente";
  const [role, setRole] = useState<SelfAssignableRole>(initialRole);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  if (state.status === "success") {
    return (
      <Alert tone="success" title="Controlla la tua email">
        <p>{state.message}</p>
        <p className="mt-2 text-sm">
          L&apos;email non arriva? Controlla anche Spam e Promozioni. Se avevi già un account con questa email non ne inviamo una
          nuova: <Link href="/accedi" className="font-semibold underline">accedi</Link> oppure{" "}
          <Link href="/recupera-password" className="font-semibold underline">recupera la password</Link>.
        </p>
      </Alert>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate key={JSON.stringify(v)}>
      {params.get("next") && <input type="hidden" name="next" value={params.get("next") ?? ""} />}
      <AttributionFields />
      {/^[A-Z0-9]{6,12}$/.test((params.get("invito") ?? "").toUpperCase()) && (
        <>
          <input type="hidden" name="referral_code" value={(params.get("invito") ?? "").toUpperCase()} />
          <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm">
            Ti registri con il codice invito <span className="font-mono font-bold">{(params.get("invito") ?? "").toUpperCase()}</span>. Il premio, se il programma è attivo, arriva solo dopo il tuo primo servizio verificato.
          </p>
        </>
      )}
      {state.status === "error" && state.message && <Alert tone="error">{state.message}</Alert>}

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-semibold text-ink">{t.auth.accountType}</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {SELF_ASSIGNABLE_ROLES.map((r) => {
            const Icon = ROLE_ICONS[r];
            const checked = role === r;
            return (
              <label
                key={r}
                className={cn(
                  "flex cursor-pointer gap-3 rounded-lg border p-3.5 transition-[border-color,background-color,box-shadow]",
                  "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-orange/20",
                  checked ? "border-orange bg-orange-50/60" : "border-line-strong hover:border-slate/60",
                  r === "cliente" && "sm:col-span-2",
                )}
              >
                <input
                  type="radio"
                  name="role"
                  value={r}
                  checked={checked}
                  onChange={() => setRole(r)}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-md",
                    checked ? "bg-orange text-white" : "bg-mist text-graphite",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-semibold text-ink">{ROLE_LABELS[r]}</span>
                  <span className="text-xs leading-snug text-muted">{ROLE_DESCRIPTIONS[r]}</span>
                </span>
              </label>
            );
          })}
        </div>
        {e.role && (
          <p role="alert" className="text-xs font-medium text-danger">
            {e.role}
          </p>
        )}
      </fieldset>

      <Field id="fullName" label={t.auth.fullName} error={e.fullName}>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          defaultValue={v.fullName}
          {...describedBy("fullName", e.fullName)}
        />
      </Field>

      {isProfessionalRole(role) && (
        <Field
          id="businessName"
          label={t.auth.businessName}
          error={e.businessName}
          hint="Il nome con cui i clienti troveranno la tua attività."
        >
          <Input
            id="businessName"
            name="businessName"
            autoComplete="organization"
            required
            defaultValue={v.businessName}
            {...describedBy("businessName", e.businessName, true)}
          />
        </Field>
      )}

      <Field id="email" label={t.auth.email} error={e.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={v.email}
          {...describedBy("email", e.email)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="password" label={t.auth.password} error={e.password} hint={t.auth.passwordHint}>
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
      </div>

      {/* Campo trappola anti-bot: invisibile alle persone. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Lascia vuoto</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="flex flex-col gap-3">
        <Checkbox
          id="acceptTerms"
          name="acceptTerms"
          error={e.acceptTerms}
          defaultChecked={v.acceptTerms === "on"}
          label={
            <>
              Accetto i{" "}
              <Link href="/termini" target="_blank" className="font-semibold text-orange-700 underline">
                Termini e condizioni
              </Link>{" "}
              e ho letto la{" "}
              <Link href="/privacy" target="_blank" className="font-semibold text-orange-700 underline">
                Privacy Policy
              </Link>
              .
            </>
          }
        />
        <Checkbox
          id="marketingConsent"
          name="marketingConsent"
          defaultChecked={v.marketingConsent === "on"}
          label={t.auth.marketingConsent}
        />
      </div>

      <SubmitButton size="lg" className="w-full" pendingText="Creazione in corso…">
        {t.auth.submitRegister}
      </SubmitButton>
    </form>
  );
}
