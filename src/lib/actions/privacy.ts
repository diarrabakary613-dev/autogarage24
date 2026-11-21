"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, ok, str } from "./helpers";

/** Richiesta di cancellazione: gestita dallo staff, che tiene conto degli obblighi di conservazione. */
export async function requestAccountDeletion(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/dashboard/impostazioni/privacy");
  if (str(fd, "confirm", 5) !== "on") return fail("Conferma di aver letto le informazioni.", { confirm: "Obbligatorio." });
  const supabase = await createClient();
  const { error } = await supabase.from("account_deletion_requests").insert({ user_id: user.id, reason: str(fd, "reason", 1000) });
  if (error) return fail(error.code === "23505" ? "Hai già una richiesta di cancellazione in corso." : dbErrorMessage(error));
  revalidatePath("/dashboard/impostazioni/privacy");
  return ok("Richiesta ricevuta. Ti risponderemo entro 30 giorni; i dati soggetti a obblighi di legge saranno conservati solo per il tempo necessario.");
}
