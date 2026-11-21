"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form-state";
import type { Enums, TablesInsert } from "@/lib/supabase/database.types";
import { dbErrorMessage, fail, int, isUuid, ok, str } from "./helpers";

const KINDS: Enums<"request_kind">[] = ["info_auto", "appuntamento_auto", "preventivo", "appuntamento", "assistenza", "info_ricambio", "preventivo_ricambio"];
const SLOTS: Enums<"time_slot">[] = ["mattina", "pomeriggio", "sera", "qualsiasi"];
const MODES: Enums<"work_mode">[] = ["sede", "officina_partner", "mobile"];

/**
 * Crea una richiesta (informazioni, appuntamento, preventivo, assistenza).
 * Il destinatario viene stabilito dal database a partire dall'oggetto collegato:
 * il client non può indirizzare la richiesta a un utente arbitrario.
 */
export async function createRequest(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(str(fd, "return_to", 300) ?? "/dashboard/richieste")}`);
  const kind = str(fd, "kind", 40) as Enums<"request_kind"> | null;
  if (!kind || !KINDS.includes(kind)) return fail("Tipo di richiesta non valido.");

  const message = str(fd, "message", 4000);
  const subject = str(fd, "subject", 200);
  const errors: Record<string, string> = {};
  if (!message || message.length < 5) errors.message = "Scrivi un messaggio di almeno 5 caratteri.";
  if (!subject || subject.length < 3) errors.subject = "Indica un oggetto.";
  const date = str(fd, "preferred_date", 10);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.preferred_date = "Data non valida.";
  if ((kind === "appuntamento" || kind === "appuntamento_auto") && !date) errors.preferred_date = "Indica la data desiderata.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);

  const id = (k: string) => { const v = str(fd, k, 40); return v && isUuid(v) ? v : null; };
  const slot = str(fd, "preferred_slot", 20) as Enums<"time_slot"> | null;
  const mode = str(fd, "work_mode", 20) as Enums<"work_mode"> | null;
  const contact = str(fd, "contact_preference", 20);

  const row: TablesInsert<"requests"> = {
    kind,
    requester_id: user.id,
    subject: subject!,
    message: message!,
    listing_id: id("listing_id"),
    professional_profile_id: id("professional_profile_id"),
    service_id: id("service_id"),
    part_id: id("part_id"),
    user_vehicle_id: id("user_vehicle_id"),
    vehicle_make: id("user_vehicle_id") ? null : str(fd, "vehicle_make", 60),
    vehicle_model: id("user_vehicle_id") ? null : str(fd, "vehicle_model", 80),
    vehicle_year: id("user_vehicle_id") ? null : int(fd, "vehicle_year", 1950, 2100),
    problem_started: str(fd, "problem_started", 200),
    preferred_date: date,
    preferred_slot: slot && SLOTS.includes(slot) ? slot : null,
    location_text: str(fd, "location_text", 200),
    work_mode: mode && MODES.includes(mode) ? mode : null,
    part_code: str(fd, "part_code", 60),
    part_inquiry_type: (() => { const t = str(fd, "part_inquiry_type", 20); return t && ["informazioni", "disponibilita", "spedizione", "ritiro"].includes(t) ? t : null; })(),
    contact_preference: contact === "email" || contact === "telefono" ? contact : "messaggio",
  };
  const supabase = await createClient();
  const { data, error } = await supabase.from("requests").insert(row).select("id, conversation_id").single();
  if (error) return fail(dbErrorMessage(error));

  // Allegati facoltativi: già caricati dal browser nella cartella della conversazione? No:
  // la conversazione nasce ora, quindi le foto vengono caricate in un secondo passaggio (vedi RequestForm).
  revalidatePath("/dashboard/richieste");
  return { status: "success", message: "Richiesta inviata. Il destinatario riceverà una notifica e potrai seguire la risposta in La mia area › Richieste.", values: { request_id: data.id, conversation_id: data.conversation_id ?? "" } };
}

/** Avvia (o riprende) una conversazione diretta con un professionista o il venditore di un annuncio. */
export async function startConversation(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect(`/accedi?next=${encodeURIComponent(str(fd, "return_to", 300) ?? "/dashboard/messaggi")}`);
  const message = str(fd, "message", 4000);
  if (!message) return fail("Scrivi un messaggio.", { message: "Scrivi un messaggio." });
  const listing = str(fd, "listing_id", 40);
  const profile = str(fd, "professional_profile_id", 40);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_conversation", {
    target_listing_id: listing && isUuid(listing) ? listing : undefined,
    target_profile_id: profile && isUuid(profile) ? profile : undefined,
    first_message: message,
  });
  if (error) return fail(dbErrorMessage(error));
  redirect(`/dashboard/messaggi/${data}`);
}

/** Cambio di stato da parte del cliente o del destinatario (regole applicate dal database). */
export async function updateRequestStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "request_id", 40);
  const status = str(fd, "status", 40) as Enums<"request_status"> | null;
  if (!id || !isUuid(id) || !status) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_request_status", { request_id: id, new_status: status, reason: str(fd, "reason", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste/${id}`);
  revalidatePath("/dashboard/richieste");
  return ok("Stato aggiornato.");
}

export async function sendQuote(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "request_id", 40);
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  const priceEuro = str(fd, "price", 20);
  const cents = priceEuro ? Math.round(Number(priceEuro.replace(/\./g, "").replace(",", ".")) * 100) : NaN;
  const description = str(fd, "description", 4000);
  const errors: Record<string, string> = {};
  const detailed = Boolean(str(fd, "labor", 20) || str(fd, "parts", 20));
  if (!detailed && (!Number.isFinite(cents) || cents < 0)) errors.price = "Indica un prezzo valido (es. 180 o 180,50).";
  if (!description || description.length < 5) errors.description = "Descrivi l'intervento o la fornitura.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const eur = (k: string) => { const e = str(fd, k, 20); const n = e ? Math.round(Number(e.replace(/\./g, "").replace(",", ".")) * 100) : NaN; return Number.isFinite(n) && n >= 0 ? n : null; };
  const labor = eur("labor"); const parts = eur("parts");
  if (labor !== null || parts !== null) {
    if (labor === null || parts === null) return fail("Indica sia la manodopera sia i ricambi (anche 0).", { labor: "Obbligatorio.", parts: "Obbligatorio." });
    const until = str(fd, "valid_until", 10);
    if (!until) return fail("Indica la validità del preventivo.", { valid_until: "Obbligatorio." });
    const { error } = await supabase.rpc("send_quote_detailed", {
      request_id: id, description: description!, labor_cents: labor, parts_cents: parts, extra_costs_cents: eur("extra_costs") ?? undefined,
      duration_text: str(fd, "duration_text", 200) ?? undefined, valid_until: until, requires_inspection: fd.get("requires_inspection") === "on",
      availability_text: str(fd, "availability", 500) ?? undefined, conditions: str(fd, "conditions", 2000) ?? undefined, materials: str(fd, "materials", 2000) ?? undefined,
    });
    if (error) return fail(dbErrorMessage(error));
    revalidatePath(`/dashboard/richieste/${id}`);
    return ok("Preventivo inviato al cliente.");
  }
  const { error } = await supabase.rpc("send_quote", {
    request_id: id,
    description: description!,
    amount_cents: cents,
    extra_costs_cents: (() => { const e = str(fd, "extra_costs", 20); const n = e ? Math.round(Number(e.replace(/\./g, "").replace(",", ".")) * 100) : NaN; return Number.isFinite(n) && n >= 0 ? n : undefined; })(),
    materials: str(fd, "materials", 2000) ?? undefined,
    duration_text: str(fd, "duration_text", 200) ?? undefined,
    conditions: str(fd, "conditions", 2000) ?? undefined,
    valid_until: str(fd, "valid_until", 10) ?? undefined,
    availability_text: str(fd, "availability", 500) ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste/${id}`);
  return ok("Preventivo inviato al cliente.");
}

export async function respondQuote(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "quote_id", 40);
  const req = str(fd, "request_id", 40);
  if (!id || !isUuid(id)) return fail("Preventivo non valido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_quote", { quote_id: id, accept: str(fd, "accept", 5) === "1", note: str(fd, "note", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  if (req) revalidatePath(`/dashboard/richieste/${req}`);
  return ok(str(fd, "accept", 5) === "1" ? "Preventivo accettato. Ora potete concordare l'appuntamento." : "Preventivo rifiutato.");
}

export async function proposeAppointment(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "request_id", 40);
  const date = str(fd, "date", 10);
  const slot = str(fd, "slot", 20) as Enums<"time_slot"> | null;
  if (!id || !isUuid(id)) return fail("Richiesta non valida.");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Indica una data.", { date: "Indica una data." });
  if (!slot || !SLOTS.includes(slot)) return fail("Indica una fascia oraria.", { slot: "Indica una fascia oraria." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_appointment", {
    request_id: id, proposed_date: date, slot,
    note: str(fd, "note", 1000) ?? undefined,
    time_text: str(fd, "time_text", 40) ?? undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste/${id}`);
  return ok("Proposta di appuntamento inviata: sarà confermata solo dopo l'accettazione dell'altra parte.");
}

export async function respondAppointment(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "appointment_id", 40);
  const req = str(fd, "request_id", 40);
  const action = str(fd, "action", 20);
  if (!id || !isUuid(id) || !action) return fail("Appuntamento non valido.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_appointment", { appointment_id: id, action, reason: str(fd, "reason", 1000) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  if (req) revalidatePath(`/dashboard/richieste/${req}`);
  revalidatePath("/dashboard/appuntamenti");
  const labels: Record<string, string> = { conferma: "Appuntamento confermato.", rifiuta: "Appuntamento rifiutato.", annulla: "Appuntamento annullato.", completa: "Appuntamento segnato come completato." };
  return ok(labels[action] ?? "Appuntamento aggiornato.");
}

/** Recensione: ammessa solo per una richiesta completata dal richiedente (verificato nel database). */
export async function createReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/accedi");
  const req = str(fd, "request_id", 40);
  const rating = int(fd, "rating", 1, 5);
  const comment = str(fd, "comment", 3000);
  if (!req || !isUuid(req)) return fail("Richiesta non valida.");
  const errors: Record<string, string> = {};
  if (!rating) errors.rating = "Scegli una valutazione da 1 a 5.";
  if (!comment || comment.length < 10) errors.comment = "Scrivi almeno 10 caratteri.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const supabase = await createClient();
  const { data: r } = await supabase.from("requests").select("professional_profile_id, kind").eq("id", req).maybeSingle();
  if (!r?.professional_profile_id) return fail("Questa richiesta non riguarda un professionista recensibile.");
  const purchase = r.kind === "info_auto" || r.kind === "appuntamento_auto";
  const sub = (k: string) => int(fd, k, 1, 5);
  const keys = purchase ? ["accuracy_rating", "communication_rating", "reliability_rating"] : ["quality_rating", "professionalism_rating", "value_rating"];
  const missing = keys.filter((k) => !sub(k));
  if (missing.length) return fail("Completa tutte le valutazioni.", Object.fromEntries(missing.map((k) => [k, "Scegli da 1 a 5."])));
  const exp = str(fd, "experience_date", 10);
  const { error } = await supabase.from("reviews").insert({
    author_id: user.id, request_id: req, profile_id: r.professional_profile_id, rating: rating!, comment: comment!,
    title: str(fd, "title", 120), service_label: str(fd, "service_label", 120),
    experience_date: exp && /^\d{4}-\d{2}-\d{2}$/.test(exp) ? exp : null,
    ...Object.fromEntries(keys.map((k) => [k, sub(k)])),
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste/${req}`);
  return ok("Grazie! La recensione è stata pubblicata ed è collegata a un'esperienza verificata su AutoGarage24.");
}

/** Fase 18: conferma dell'acquisto di un'auto (serve la conferma di entrambe le parti). */
export async function confirmPurchase(_prev: FormState, fd: FormData): Promise<FormState> {
  const req = str(fd, "request_id", 40);
  if (!req || !isUuid(req)) return fail("Richiesta non valida.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_vehicle_purchase", { request_id: req });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste/${req}`);
  return ok(data === "verificato" ? "Acquisto confermato da entrambe le parti: l'acquirente può lasciare una recensione verificata." : "Conferma registrata. Serve anche la conferma dell'altra parte.");
}

/** Fase 15: nuova data per un appuntamento (annulla il precedente e propone la nuova data in un'unica operazione). */
export async function rescheduleAppointment(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "appointment_id", 40);
  const req = str(fd, "request_id", 40);
  const date = str(fd, "date", 10);
  const slot = str(fd, "slot", 20) ?? "qualsiasi";
  if (!id || !isUuid(id) || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail("Indica la nuova data.", { date: "Obbligatoria." });
  if (!["mattina", "pomeriggio", "sera", "qualsiasi"].includes(slot)) return fail("Fascia non valida.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("reschedule_appointment", { appointment_id: id, new_date: date, new_slot: slot as "mattina", new_time: str(fd, "time_text", 40) ?? undefined, note: str(fd, "note", 500) ?? undefined });
  if (error) return fail(dbErrorMessage(error));
  if (req) revalidatePath(`/dashboard/richieste/${req}`);
  revalidatePath("/dashboard/appuntamenti");
  return ok("Nuova data proposta: l'altra parte deve confermarla.");
}

export async function replyToReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "review_id", 40);
  const reply = str(fd, "reply", 2000);
  if (!id || !isUuid(id)) return fail("Recensione non valida.");
  if (!reply) return fail("Scrivi una risposta.", { reply: "Scrivi una risposta." });
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_review", { review_id: id, reply_text: reply });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath("/dashboard/recensioni");
  return ok("Risposta pubblicata.");
}

const MAINT = ["tagliando", "cambio_olio", "filtri", "freni", "pneumatici", "batteria", "distribuzione", "frizione", "sospensioni", "climatizzazione", "revisione", "diagnosi", "riparazione_motore", "riparazione_carrozzeria", "altro"];

/** Il professionista propone un rapporto di lavoro: entra nello storico solo se il proprietario lo approva. */
export async function proposeWorkReport(_prev: FormState, fd: FormData): Promise<FormState> {
  const req = str(fd, "request_id", 40);
  const date = str(fd, "performed_on", 10);
  const category = str(fd, "category", 30);
  const title = str(fd, "title", 160);
  const description = str(fd, "description", 4000);
  if (!req || !isUuid(req)) return fail("Richiesta non valida.");
  const errors: Record<string, string> = {};
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) errors.performed_on = "Indica la data dell'intervento.";
  if (!category || !MAINT.includes(category)) errors.category = "Scegli la categoria.";
  if (!title) errors.title = "Indica il servizio effettuato.";
  if (!description) errors.description = "Descrivi l'intervento.";
  if (Object.keys(errors).length) return fail("Controlla i campi evidenziati.", errors);
  const costEuro = str(fd, "cost", 20);
  const cost = costEuro ? Math.round(Number(costEuro.replace(/\./g, "").replace(",", ".")) * 100) : null;
  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_work_report", {
    request_id: req, performed_on: date!, category: category as Enums<"maintenance_category">, title: title!, description: description!,
    mileage_km: int(fd, "mileage_km", 0, 2_000_000) ?? undefined, parts_used: str(fd, "parts_used", 2000) ?? undefined,
    cost_cents: cost !== null && Number.isFinite(cost) && cost >= 0 ? cost : undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  revalidatePath(`/dashboard/richieste/${req}`);
  return ok("Rapporto inviato al cliente: lo vedrà nello storico solo dopo averlo approvato.");
}

export async function decideWorkReport(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "report_id", 40);
  const req = str(fd, "request_id", 40);
  if (!id || !isUuid(id)) return fail("Rapporto non valido.");
  const approve = str(fd, "approve", 2) === "1";
  const vehicle = str(fd, "target_vehicle_id", 40);
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_work_report", {
    report_id: id, approve, note: str(fd, "note", 1000) ?? undefined,
    target_vehicle_id: vehicle && isUuid(vehicle) ? vehicle : undefined,
  });
  if (error) return fail(dbErrorMessage(error));
  if (req) revalidatePath(`/dashboard/richieste/${req}`);
  revalidatePath("/dashboard/manutenzione");
  return ok(approve ? "Intervento aggiunto allo storico della tua automobile, con l'indicazione del professionista." : "Rapporto contestato: non è stato aggiunto allo storico.");
}
