/** Valori condivisi da Field Manager e Acquisizione (un solo CRM, tabella field_contacts). */
export const CRM_STATUSES = {
  nuovo: "Nuovo contatto",
  da_contattare: "Da contattare",
  contattato: "Primo contatto effettuato",
  interessato: "Interessato",
  in_trattativa: "In trattativa",
  in_attesa_registrazione: "In attesa di registrazione",
  registrato: "Registrato",
  partner_attivo: "Partner attivo",
  non_interessato: "Non interessato",
} as const;
export type CrmStatus = keyof typeof CRM_STATUSES;
export const CRM_STATUS_KEYS = Object.keys(CRM_STATUSES) as CrmStatus[];
/** Colonne della pipeline (il "non interessato" è mostrato a parte). */
export const PIPELINE: CrmStatus[] = CRM_STATUS_KEYS.filter((s) => s !== "non_interessato");

export const BUSINESS_TYPES = {
  officina: "Officina",
  concessionario: "Concessionario",
  venditore_auto: "Venditore auto",
  meccanico: "Meccanico indipendente",
  centro_specializzato: "Centro specializzato",
  venditore_ricambi: "Venditore di ricambi",
  altro: "Altro professionista",
} as const;
export type BusinessType = keyof typeof BUSINESS_TYPES;

export const INTERACTION_KINDS = {
  visita: "Visita", telefonata: "Telefonata", email: "Email", whatsapp: "WhatsApp", appuntamento: "Appuntamento", nota: "Nota",
} as const;
export const INTEREST_LEVELS = { alto: "Alto", medio: "Medio", basso: "Basso", nessuno: "Nessuno" } as const;
export const CONTACT_SOURCES = {
  manuale: "Inserimento manuale", candidatura: "Candidatura dal sito", field_manager: "Visita sul territorio",
  evento: "Evento", passaparola: "Passaparola", altro: "Altro",
} as const;

export const APPLICATION_STATUSES = { nuova: "Nuova", in_esame: "In esame", accettata: "Accettata", rifiutata: "Rifiutata", duplicata: "Duplicata" } as const;
export const PROGRAMS = { partner_auto: "AutoGarage24 Partner (auto)", partner_professionisti: "Partner professionisti", founding: "Founding Partners" } as const;
export const BETA_AUDIENCES = {
  cerco_auto: "Cerco un'automobile", neopatentato: "Sono neopatentato", proprietario: "Ho un'auto da gestire",
  professionista: "Sono un professionista", altro: "Altro",
} as const;

export function statusTone(s: string): "success" | "neutral" | "orange" | "warning" {
  if (s === "partner_attivo" || s === "registrato") return "success";
  if (s === "non_interessato") return "neutral";
  if (s === "nuovo" || s === "da_contattare") return "warning";
  return "orange";
}

/** Passo successivo e precedente nella pipeline, per i pulsanti "sposta". */
export function neighbours(s: string): { prev: CrmStatus | null; next: CrmStatus | null } {
  const i = PIPELINE.indexOf(s as CrmStatus);
  if (i < 0) return { prev: null, next: "da_contattare" };
  return { prev: i > 0 ? PIPELINE[i - 1] : null, next: i < PIPELINE.length - 1 ? PIPELINE[i + 1] : null };
}
