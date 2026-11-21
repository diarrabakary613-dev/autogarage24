"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import { dbErrorMessage, fail, isUuid, ok, str } from "./helpers";

const TARGETS = ["annuncio_auto", "ricambio", "profilo", "recensione", "messaggio", "utente", "offerta", "operatore", "trasporto", "valutazione", "altro"];
const CATEGORIES = ["annuncio_sospetto", "profilo_falso", "foto_non_autorizzate", "truffa", "comportamento_scorretto", "spam", "informazioni_ingannevoli", "contenuto_inappropriato", "altro"];

/** Segnalazione di un contenuto: arriva al centro moderazione, nessuna sospensione automatica. */
export async function submitReport(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(str(fd, "return_to", 300) ?? "/")}`);
  const target = str(fd, "target_type", 30);
  const category = str(fd, "category", 40);
  const description = str(fd, "description", 3000);
  const targetId = str(fd, "target_id", 40);
  if (!target || !TARGETS.includes(target)) return fail("Elemento non valido.");
  if (!category || !CATEGORIES.includes(category)) return fail("Scegli un motivo.", { category: "Scegli un motivo." });
  if (!description || description.length < 10) return fail("Descrivi il problema (almeno 10 caratteri).", { description: "Almeno 10 caratteri." });
  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").insert({
    reporter_id: user.id,
    target_type: target,
    target_id: targetId && isUuid(targetId) ? targetId : null,
    target_label: str(fd, "target_label", 200),
    category,
    description,
  });
  if (error) return fail(dbErrorMessage(error));
  return ok("Grazie: la segnalazione è stata inviata al team di moderazione, che la esaminerà. Non sospendiamo nessuno in automatico.");
}
