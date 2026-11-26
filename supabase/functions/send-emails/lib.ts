// =====================================================================
// AutoGarage24 — logica pura dell'invio email (nessuna dipendenza da Deno
// o dalla rete), così da poterla testare con i test del progetto.
// =====================================================================

export const MAX_ATTEMPTS = 5;

/** Minuti da attendere dalla creazione prima del tentativo n (attesa crescente: 0, 5, 20, 80, 320). */
export const RETRY_AFTER_MINUTES = [0, 5, 20, 80, 320];

/** Un'email rimasta «in_invio» oltre questo tempo è considerata interrotta e torna in coda. */
export const STUCK_AFTER_MINUTES = 15;

export type Payload = { title?: string; body?: string; link?: string; cta_label?: string; unsubscribe_path?: string };
export type Job = { id: string; template: string; attempts: number; created_at: string; status: string };

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** Solo percorsi interni del sito: niente URL esterni o «//dominio». */
function internalUrl(path: string | undefined, siteUrl: string): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return `${siteUrl}${path}`;
}

/** Indirizzo per la disiscrizione con un clic (RFC 8058): accetta una richiesta POST senza conferma. */
export function oneClickUnsubscribeUrl(payload: Payload, siteUrl: string): string | null {
  const m = /^\/disiscriviti\/([A-Za-z0-9_-]{32,64})$/.exec(payload.unsubscribe_path ?? "");
  return m ? `${siteUrl}/api/disiscrizione/${m[1]}` : null;
}

export function isMarketing(template: string) {
  return template === "marketing";
}

/** HTML e testo semplice dell'email. Per le promozionali aggiunge sempre il link di disiscrizione. */
export function render(payload: Payload, siteUrl: string, template: string) {
  const link = internalUrl(payload.link, siteUrl) ?? siteUrl;
  const cta = payload.cta_label?.trim() || "Apri su AutoGarage24";
  const unsubscribe = isMarketing(template) ? internalUrl(payload.unsubscribe_path, siteUrl) : null;
  const footer = isMarketing(template)
    ? `Ricevi questa email perché hai acconsentito alle comunicazioni promozionali di AutoGarage24.`
    : `Ricevi questa email per un aggiornamento del tuo account. Puoi scegliere quali email ricevere in La mia area › Impostazioni › Notifiche.`;
  const html = `<!doctype html><html lang="it"><body style="font-family:Arial,sans-serif;background:#F4F5F7;padding:24px;color:#111318">
  <div style="max-width:560px;margin:auto;background:#fff;border-radius:12px;padding:28px">
    <p style="font-weight:800;font-size:18px;margin:0 0 16px">AutoGarage24</p>
    <h1 style="font-size:20px;margin:0 0 12px">${esc(payload.title)}</h1>
    <p style="line-height:1.5;color:#252A32;white-space:pre-line">${esc(payload.body)}</p>
    <p style="margin:24px 0"><a href="${esc(link)}" style="background:#F47B20;color:#111318;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${esc(cta)}</a></p>
    <p style="font-size:12px;color:#666a73">${esc(footer)}${unsubscribe ? ` <a href="${esc(unsubscribe)}" style="color:#666a73">Non voglio più ricevere email promozionali</a>.` : ""}</p>
  </div></body></html>`;
  const text = [payload.title ?? "", "", payload.body ?? "", "", `${cta}: ${link}`, "", footer, unsubscribe ? `Disiscriviti: ${unsubscribe}` : ""]
    .join("\n").trim();
  return { html, text };
}

/** Intestazioni aggiuntive: disiscrizione standard per le promozionali. */
export function headersFor(payload: Payload, siteUrl: string, template: string): Record<string, string> {
  if (!isMarketing(template)) return {};
  const oneClick = oneClickUnsubscribeUrl(payload, siteUrl);
  return oneClick ? { "List-Unsubscribe": `<${oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : {};
}

/** Un'email promozionale senza link di disiscrizione valido non deve mai partire. */
export function marketingIsSendable(payload: Payload, siteUrl: string): boolean {
  return Boolean(internalUrl(payload.unsubscribe_path, siteUrl) && oneClickUnsubscribeUrl(payload, siteUrl));
}

/** È il momento di (ri)provare? Attesa crescente calcolata dalla creazione dell'email. */
export function isDue(job: Pick<Job, "attempts" | "created_at">, now: Date): boolean {
  if (job.attempts >= MAX_ATTEMPTS) return false;
  const waitMin = RETRY_AFTER_MINUTES[Math.min(job.attempts, RETRY_AFTER_MINUTES.length - 1)];
  return now.getTime() - new Date(job.created_at).getTime() >= waitMin * 60_000;
}

/**
 * Cosa fare dopo la risposta del provider:
 * - ok: inviata;
 * - permanent: errore dell'email stessa (indirizzo o contenuto non validi): nessun nuovo tentativo;
 * - config: chiave o dominio non validi: si ferma tutto il giro senza consumare tentativi;
 * - rate_limited: troppe richieste: si ferma il giro senza consumare tentativi;
 * - retry: errore temporaneo (server o rete): si riprova più tardi.
 */
export type Outcome = "ok" | "permanent" | "config" | "rate_limited" | "retry";

/** Errori di Resend che dipendono dalla configurazione (mittente, chiave), non dalla singola email. */
const CONFIG_ERRORS = new Set(["invalid_from_address", "missing_api_key", "invalid_api_key", "restricted_api_key", "invalid_access", "monthly_quota_exceeded", "daily_quota_exceeded"]);

export function classify(status: number | null, errorName?: string | null): Outcome {
  if (status === null) return "retry";
  if (status >= 200 && status < 300) return "ok";
  if (errorName && CONFIG_ERRORS.has(errorName)) return errorName.endsWith("quota_exceeded") ? "rate_limited" : "config";
  if (status === 429) return "rate_limited";
  if (status === 401 || status === 403) return "config";
  if (status >= 400 && status < 500) return "permanent";
  return "retry";
}
