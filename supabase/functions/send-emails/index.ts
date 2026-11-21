// =====================================================================
// AutoGarage24 — invio delle email transazionali dalla coda email_outbox.
// Edge Function Supabase (Deno). NON è ancora distribuita: richiede la
// configurazione del provider (vedi docs/EMAIL.md). Nessuna credenziale nel codice.
//
// Variabili (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY      chiave del provider (Resend)
//   EMAIL_FROM          mittente verificato, es. "AutoGarage24 <notifiche@autogarage24.it>"
//   SITE_URL            URL pubblico del sito
//   CRON_SECRET         segreto condiviso con il job pianificato che invoca la funzione
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sono forniti automaticamente dalla piattaforma
// e restano solo lato server.
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAX_ATTEMPTS = 5;
const BATCH = 25;

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function render(payload: { title?: string; body?: string; link?: string }, siteUrl: string) {
  const link = payload.link && payload.link.startsWith("/") ? `${siteUrl}${payload.link}` : siteUrl;
  const html = `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;background:#F4F5F7;padding:24px;color:#111318">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:28px">
    <p style="font-weight:800;font-size:18px;margin:0 0 16px">AutoGarage24</p>
    <h1 style="font-size:20px;margin:0 0 12px">${esc(payload.title)}</h1>
    <p style="line-height:1.5;color:#252A32">${esc(payload.body)}</p>
    <p style="margin:24px 0"><a href="${esc(link)}" style="background:#F47B20;color:#111318;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Apri su AutoGarage24</a></p>
    <p style="font-size:12px;color:#666a73">Ricevi questa email per un aggiornamento del tuo account. Puoi scegliere quali email ricevere in La mia area › Impostazioni › Notifiche.</p>
  </div></body></html>`;
  const text = `${payload.title ?? ""}\n\n${payload.body ?? ""}\n\n${link}\n\nPuoi gestire le email in La mia area › Impostazioni › Notifiche.`;
  return { html, text };
}

Deno.serve(async (req) => {
  if (req.headers.get("authorization") !== `Bearer ${Deno.env.get("CRON_SECRET")}`) return new Response("Non autorizzato", { status: 401 });
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  const siteUrl = (Deno.env.get("SITE_URL") ?? "").replace(/\/+$/, "");
  if (!apiKey || !from || !siteUrl) return new Response("Provider email non configurato", { status: 503 });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  const { data: jobs, error } = await supabase.from("email_outbox").select("id, to_email, subject, payload, attempts")
    .in("status", ["in_coda", "errore"]).lt("attempts", MAX_ATTEMPTS).order("created_at").limit(BATCH);
  if (error) return new Response("Errore lettura coda", { status: 500 });

  let sent = 0, failed = 0;
  for (const job of jobs ?? []) {
    // Blocco ottimistico: evita doppi invii se due esecuzioni si sovrappongono.
    const { data: locked } = await supabase.from("email_outbox").update({ status: "in_invio", attempts: job.attempts + 1 }).eq("id", job.id).in("status", ["in_coda", "errore"]).select("id").maybeSingle();
    if (!locked) continue;
    const { html, text } = render(job.payload ?? {}, siteUrl);
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": job.id },
        body: JSON.stringify({ from, to: [job.to_email], subject: job.subject, html, text }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await supabase.from("email_outbox").update({ status: "inviata", sent_at: new Date().toISOString(), last_error: null }).eq("id", job.id);
      sent++;
    } catch (e) {
      // Nel log solo l'errore tecnico, mai il contenuto o l'indirizzo email.
      await supabase.from("email_outbox").update({ status: "errore", last_error: String(e).slice(0, 300) }).eq("id", job.id);
      failed++;
    }
  }
  return Response.json({ processed: jobs?.length ?? 0, sent, failed });
});
