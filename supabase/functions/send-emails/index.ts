// =====================================================================
// AutoGarage24 — invio delle email dalla coda email_outbox.
// Edge Function Supabase (Deno). NON è ancora distribuita: richiede la
// configurazione del provider (vedi docs/EMAIL.md). Nessuna credenziale nel codice.
//
// Variabili (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY        chiave del provider (Resend), solo permesso di invio
//   EMAIL_FROM            mittente delle email transazionali, es. "AutoGarage24 <notifiche@notifiche.autogarage24.it>"
//   EMAIL_FROM_MARKETING  mittente delle email promozionali (dominio separato). Se manca, le promozionali NON partono.
//   SITE_URL              URL pubblico del sito
//   CRON_SECRET           segreto condiviso con il job pianificato che invoca la funzione
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono forniti automaticamente dalla piattaforma
// e restano solo lato server.
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
import { MAX_ATTEMPTS, STUCK_AFTER_MINUTES, classify, headersFor, isDue, isMarketing, marketingIsSendable, render, type Job, type Payload } from "./lib.ts";

const BATCH = 25;
const PAUSE_MS = 150; // ~6 invii al secondo: sotto il limite di 10 richieste/s di Resend
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`) return new Response("Non autorizzato", { status: 401 });
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const fromMarketing = Deno.env.get("EMAIL_FROM_MARKETING") ?? "";
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
  if (!apiKey || !from || !siteUrl) return new Response("Provider email non configurato", { status: 503 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // 1. Email rimaste «in_invio» (esecuzione interrotta): tornano in coda come errore temporaneo.
  //    Un eventuale doppio invio è evitato dall'Idempotency-Key (= id dell'email) di Resend.
  const stuckBefore = new Date(Date.now() - STUCK_AFTER_MINUTES * 60_000).toISOString();
  await supabase.from("email_outbox").update({ status: "errore", last_error: "Invio interrotto: ripreso automaticamente" })
    .eq("status", "in_invio").lt("created_at", stuckBefore);

  // 2. Email da inviare ora (attesa crescente tra i tentativi). Le promozionali solo con un mittente dedicato.
  let query = supabase.from("email_outbox").select("id, to_email, subject, payload, attempts, template, created_at, status")
    .in("status", ["in_coda", "errore"]).lt("attempts", MAX_ATTEMPTS).order("created_at").limit(BATCH * 4);
  if (!fromMarketing) query = query.neq("template", "marketing");
  const { data: rows, error } = await query;
  if (error) return new Response("Errore lettura coda", { status: 500 });
  const now = new Date();
  const jobs = (rows ?? []).filter((j) => isDue(j as Job, now)).slice(0, BATCH);

  let sent = 0, failed = 0, skipped = 0;
  let stop: "config" | "rate_limited" | null = null;
  for (const job of jobs) {
    if (stop) break;
    const payload = (job.payload ?? {}) as Payload;
    const marketing = isMarketing(job.template);

    // Una promozionale senza disiscrizione valida non parte mai.
    if (marketing && !marketingIsSendable(payload, siteUrl)) {
      await supabase.from("email_outbox").update({ status: "errore", attempts: MAX_ATTEMPTS, last_error: "Bloccata: manca il link di disiscrizione" }).eq("id", job.id);
      skipped++;
      continue;
    }

    // Blocco ottimistico: evita doppi invii se due esecuzioni si sovrappongono.
    const { data: locked } = await supabase.from("email_outbox").update({ status: "in_invio", attempts: job.attempts + 1 })
      .eq("id", job.id).in("status", ["in_coda", "errore"]).select("id").maybeSingle();
    if (!locked) continue;

    const { html, text } = render(payload, siteUrl, job.template);
    let status: number | null = null;
    let errorName: string | null = null;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": job.id },
        body: JSON.stringify({ from: marketing ? fromMarketing : from, to: [job.to_email], subject: job.subject, html, text, headers: headersFor(payload, siteUrl, job.template) }),
      });
      status = res.status;
      if (!res.ok) errorName = ((await res.json().catch(() => null)) as { name?: string } | null)?.name ?? null;
    } catch {
      status = null; // errore di rete: si riprova più tardi
    }

    // Nel log solo codici tecnici, mai il contenuto o l'indirizzo email.
    const outcome = classify(status, errorName);
    if (outcome === "ok") {
      await supabase.from("email_outbox").update({ status: "inviata", sent_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      sent++;
    } else if (outcome === "permanent") {
      await supabase.from("email_outbox").update({ status: "errore", attempts: MAX_ATTEMPTS, last_error: `Definitivo: HTTP ${status}${errorName ? ` ${errorName}` : ""}` }).eq("id", job.id);
      failed++;
    } else if (outcome === "config" || outcome === "rate_limited") {
      // Non è colpa di questa email: il tentativo non viene contato e il giro si ferma.
      await supabase.from("email_outbox").update({ status: "errore", attempts: job.attempts, last_error: `${outcome === "config" ? "Configurazione" : "Limite di invio"}: HTTP ${status}${errorName ? ` ${errorName}` : ""}` }).eq("id", job.id);
      stop = outcome;
    } else {
      await supabase.from("email_outbox").update({ status: "errore", last_error: status === null ? "Errore di rete" : `Temporaneo: HTTP ${status}` }).eq("id", job.id);
      failed++;
    }
    await sleep(PAUSE_MS);
  }
  return Response.json({ processed: jobs.length, sent, failed, skipped, stopped: stop }, { status: stop === "config" ? 503 : 200 });
});
