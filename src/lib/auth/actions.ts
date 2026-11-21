"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/redirects";
import { isProfessionalRole } from "@/lib/auth/roles";
import {
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";
import { safeValues, toFieldErrors, type FormState } from "@/lib/validation/form-state";
import { t } from "@/i18n";

function authErrorMessage(error: AuthError): string {
  if (error.status === 429 || error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
    return t.auth.rateLimited;
  }
  if (error.code === "email_not_confirmed") return t.auth.emailNotConfirmed;
  if (error.code === "invalid_credentials") return t.auth.invalidCredentials;
  if (error.code === "weak_password") return "La password scelta è troppo debole o compromessa: scegline un'altra.";
  if (error.code === "same_password") return "La nuova password deve essere diversa da quella attuale.";
  return t.auth.genericError;
}

/** UTM e landing (già ripuliti nel browser) ricontrollati prima di finire nei metadati. */
function attributionMeta(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
    const v = String(fd.get(k) ?? "").toLowerCase();
    if (/^[a-z0-9_.-]{1,80}$/.test(v)) out[k] = v;
  }
  const l = String(fd.get("landing") ?? "");
  if (/^\/[a-z0-9/_-]{0,199}$/.test(l)) out.landing = l;
  return out;
}

// ---------------------------------------------------------------------
// Registrazione
// ---------------------------------------------------------------------
export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = safeValues(formData);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const fieldErrors = toFieldErrors(parsed.error);
    // Bot rilevato tramite campo trappola: risposta neutra.
    if (fieldErrors.website) return { status: "success", message: t.auth.signUpSuccess };
    return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors, values };
  }

  const input = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(safeNextPath(formData.get("next")))}`,
      // Metadati letti SOLO dal trigger di creazione profilo. Il ruolo "admin"
      // viene sempre ignorato dal database; i permessi non dipendono mai da qui.
      data: {
        full_name: input.fullName,
        requested_role: input.role,
        business_name: isProfessionalRole(input.role) ? input.businessName : undefined,
        accepted_terms: "true",
        marketing_consent: input.marketingConsent ? "true" : "false",
        ...attributionMeta(formData),
        referral_code: (() => { const c = String(formData.get("referral_code") ?? "").toUpperCase(); return /^[A-Z0-9]{6,12}$/.test(c) ? c : undefined; })(),
      },
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      // Messaggio neutro: non riveliamo quali email sono registrate.
      return { status: "success", message: t.auth.signUpSuccess };
    }
    return { status: "error", message: authErrorMessage(error), values };
  }

  return { status: "success", message: t.auth.signUpSuccess };
}

// ---------------------------------------------------------------------
// Accesso
// ---------------------------------------------------------------------
export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = safeValues(formData);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "Controlla i campi evidenziati.", fieldErrors: toFieldErrors(parsed.error), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: authErrorMessage(error), values };

  redirect(safeNextPath(formData.get("next")));
}

// ---------------------------------------------------------------------
// Uscita
// ---------------------------------------------------------------------
export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ---------------------------------------------------------------------
// Recupero password
// ---------------------------------------------------------------------
export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error), values: safeValues(formData) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/aggiorna-password`,
  });

  if (error && (error.status === 429 || error.code?.startsWith("over_"))) {
    return { status: "error", message: t.auth.rateLimited };
  }
  // Risposta sempre uguale: non riveliamo se l'email esiste.
  return { status: "success", message: t.auth.resetSent };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    return { status: "error", message: "Il link è scaduto o non è valido. Richiedi un nuovo link di recupero." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };

  redirect("/dashboard?password=aggiornata");
}
