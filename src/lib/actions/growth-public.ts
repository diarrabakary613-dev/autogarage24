"use server";

import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import { fail, ok, str } from "./helpers";

/** Disiscrizione dalle email promozionali tramite il link ricevuto (nessun accesso richiesto). */
export async function unsubscribeAction(_p: FormState, fd: FormData): Promise<FormState> {
  const token = str(fd, "token", 80);
  if (!token || !/^[A-Za-z0-9_-]{32,64}$/.test(token)) return fail("Link non valido.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("marketing_unsubscribe", { p_token: token });
  if (error) return fail("Non è stato possibile completare la richiesta. Riprova più tardi.");
  if (!data) return fail("Link non valido o scaduto. Puoi gestire le preferenze dall'area personale.");
  return ok("Fatto: non riceverai più email promozionali da AutoGarage24. Le comunicazioni di servizio (richieste, appuntamenti, sicurezza dell'account) restano attive.");
}
