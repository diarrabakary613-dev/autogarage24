/** Costanti del Growth Engine (Fase 32). */
export const AUDIENCES = {
  generale: "Generale", neopatentati: "Neopatentati", acquirenti: "Acquirenti auto", proprietari: "Proprietari di auto", officine: "Officine",
  meccanici: "Meccanici", concessionari: "Concessionari", ricambi: "Ricambisti", inattivi: "Utenti inattivi", professionisti: "Professionisti",
} as const;
export const LP_SECTIONS = { nessuna: "Nessuna", auto_neopatentati: "Auto compatibili neopatentati (reali)", auto_usate: "Ultime auto pubblicate", officine: "Officine verificate", offerte: "Offerte attive" } as const;
export const LP_STATUS = { bozza: "Bozza", pubblicata: "Pubblicata", archiviata: "Archiviata" } as const;
export const MSG_STATUS = { bozza: "Bozza", da_approvare: "Da approvare (fondatore)", approvato: "Approvato", inviato: "Inviato", annullato: "Annullato" } as const;
export const SEGMENT_ROLES = { clienti: "Clienti (non professionisti)", neopatentati: "Neopatentati", professionisti: "Professionisti" } as const;
export const EXCLUSION_REASONS: Record<string, string> = {
  nessun_consenso: "Nessun consenso", preferenza_disattivata: "Preferenza disattivata", limite_frequenza: "Limite di frequenza", account_non_attivo: "Account non attivo",
};
export const PERIODS = [7, 30, 90, 365] as const;

/** Segmento accettato dal database (stesse chiavi di private.valid_segment). */
export function buildSegment(input: { citta?: string | null; ruolo?: string | null; inattivi?: number | null; registrati?: number | null; campagna?: string | null }) {
  const s: Record<string, string> = {};
  if (input.citta && input.citta.trim() && input.citta.trim().length <= 80) s.citta = input.citta.trim();
  if (input.ruolo && input.ruolo in SEGMENT_ROLES) s.ruolo = input.ruolo;
  if (input.inattivi && input.inattivi > 0 && input.inattivi <= 999) s.inattivi_giorni = String(Math.floor(input.inattivi));
  if (input.registrati && input.registrati > 0 && input.registrati <= 999) s.registrati_da_giorni = String(Math.floor(input.registrati));
  if (input.campagna && /^[a-z0-9_.-]{1,80}$/.test(input.campagna)) s.campagna = input.campagna;
  return s;
}

export function describeSegment(s: Record<string, string>): string {
  const parts: string[] = [];
  if (s.ruolo) parts.push(SEGMENT_ROLES[s.ruolo as keyof typeof SEGMENT_ROLES] ?? s.ruolo);
  if (s.citta) parts.push(`città: ${s.citta}`);
  if (s.inattivi_giorni) parts.push(`inattivi da ${s.inattivi_giorni} giorni`);
  if (s.registrati_da_giorni) parts.push(`registrati negli ultimi ${s.registrati_da_giorni} giorni`);
  if (s.campagna) parts.push(`arrivati dalla campagna ${s.campagna}`);
  return parts.length ? parts.join(" · ") : "Tutti gli utenti attivi";
}

/** Percorso interno sicuro (niente URL esterni né «//»). */
export function safeInternalPath(v: string | null | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return /^\/[a-z0-9/_?=&-]{0,199}$/.test(t) && !t.startsWith("//") ? t : null;
}

/** Variante A/B per una singola visualizzazione (server, dopo connection()). */
export function pickVariant(active: boolean): "a" | "b" {
  return active && Math.random() < 0.5 ? "b" : "a";
}
