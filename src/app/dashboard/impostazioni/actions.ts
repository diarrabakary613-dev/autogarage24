"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { profileUpdateSchema } from "@/lib/validation/profile";
import { safeValues, toFieldErrors, type FormState } from "@/lib/validation/form-state";
import { t } from "@/i18n";

/**
 * Aggiorna i dati del profilo dell'utente collegato.
 * L'identità è riletta dal server; il database consente comunque di
 * modificare solo il proprio profilo e solo i campi autorizzati (RLS + privilegi).
 */
export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/impostazioni");
  const parsed = profileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Controlla i campi evidenziati.",
      fieldErrors: toFieldErrors(parsed.error),
      values: safeValues(formData),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      city: parsed.data.city,
      postal_code: parsed.data.postalCode,
      marketing_consent: parsed.data.marketingConsent,
    })
    .eq("id", user.id);

  if (error) {
    return { status: "error", message: t.auth.genericError, values: safeValues(formData) };
  }

  revalidatePath("/dashboard/impostazioni");
  return { status: "success", message: t.common.saved };
}
