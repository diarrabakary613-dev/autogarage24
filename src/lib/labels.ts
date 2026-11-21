import type { Enums } from "@/lib/supabase/database.types";

/** Etichette italiane per i valori enumerati del database. */
export const FUEL_LABELS: Record<Enums<"fuel_type">, string> = {
  benzina: "Benzina", diesel: "Diesel", gpl: "GPL", metano: "Metano", ibrida: "Ibrida",
  ibrida_plugin: "Ibrida plug-in", elettrica: "Elettrica", altra: "Altra",
};
export const TRANSMISSION_LABELS: Record<Enums<"transmission_type">, string> = {
  manuale: "Manuale", automatico: "Automatico", altro: "Altro",
};
export const BODY_LABELS: Record<Enums<"body_type">, string> = {
  berlina: "Berlina", utilitaria: "Utilitaria", suv: "SUV", station_wagon: "Station wagon", coupe: "Coupé",
  cabrio: "Cabrio", monovolume: "Monovolume", furgone: "Furgone", altra: "Altra",
};
export const CONDITION_LABELS: Record<Enums<"vehicle_condition">, string> = {
  nuovo: "Nuovo", usato: "Usato", km0: "Km 0", aziendale: "Aziendale", altro: "Altro",
};
export const LISTING_STATUS_LABELS: Record<Enums<"listing_status">, string> = {
  bozza: "Bozza", in_revisione: "In attesa di revisione", approvato: "Approvato", pubblicato: "Pubblicato",
  rifiutato: "Rifiutato", sospeso: "Sospeso", venduto: "Venduto", scaduto: "Scaduto",
};
export const PART_STATUS_LABELS: Record<Enums<"part_status">, string> = {
  bozza: "Bozza", in_revisione: "In attesa di revisione", approvato: "Approvato", pubblicato: "Pubblicato",
  rifiutato: "Rifiutato", sospeso: "Sospeso", esaurito: "Esaurito", venduto: "Venduto", scaduto: "Scaduto",
};
export const PART_CONDITION_LABELS: Record<Enums<"part_condition">, string> = {
  nuovo: "Nuovo", usato: "Usato", ricondizionato: "Ricondizionato",
};
export const SELLER_KIND_LABELS: Record<Enums<"seller_kind">, string> = {
  privato: "Venditore privato", professionista: "Venditore professionale",
};
export const REQUEST_KIND_LABELS: Record<Enums<"request_kind">, string> = {
  info_auto: "Informazioni su un'auto", appuntamento_auto: "Visione di un'auto", preventivo: "Richiesta di preventivo",
  appuntamento: "Richiesta di appuntamento", assistenza: "Richiesta di assistenza", info_ricambio: "Informazioni su un ricambio",
  preventivo_ricambio: "Preventivo ricambio",
};
export const REQUEST_STATUS_LABELS: Record<Enums<"request_status">, string> = {
  nuova: "Nuova", visualizzata: "Visualizzata", in_lavorazione: "In lavorazione", risposta_inviata: "Risposta inviata",
  preventivo_inviato: "Preventivo inviato", appuntamento_proposto: "Appuntamento proposto", accettata: "Accettata",
  rifiutata: "Rifiutata", completata: "Completata", annullata: "Annullata",
};
export const APPOINTMENT_STATUS_LABELS: Record<Enums<"appointment_status">, string> = {
  in_attesa: "In attesa di conferma", confermato: "Confermato", proposta_alternativa: "Sostituito da altra proposta",
  rifiutato: "Rifiutato", annullato: "Annullato", completato: "Completato",
};
export const QUOTE_STATUS_LABELS: Record<Enums<"quote_status">, string> = {
  inviato: "In attesa di risposta", accettato: "Accettato", rifiutato: "Rifiutato", sostituito: "Sostituito", ritirato: "Ritirato",
};
export const SLOT_LABELS: Record<Enums<"time_slot">, string> = {
  mattina: "Mattina", pomeriggio: "Pomeriggio", sera: "Sera", qualsiasi: "Qualsiasi orario",
};
export const NEO_LABELS: Record<Enums<"neo_result">, string> = {
  compatibile: "Compatibile", non_compatibile: "Non compatibile", da_verificare: "Compatibilità da verificare",
};
export const REVIEW_STATUS_LABELS: Record<Enums<"profile_review_status">, string> = {
  bozza: "Bozza", inviato: "Inviato", in_verifica: "In verifica", approvato: "Approvato", rifiutato: "Rifiutato", sospeso: "Sospeso",
};
export const PRICE_TYPE_LABELS: Record<Enums<"price_type">, string> = {
  fisso: "Prezzo fisso", a_partire_da: "A partire da", su_preventivo: "Su preventivo",
};
export const WORK_MODE_LABELS: Record<Enums<"work_mode">, string> = {
  sede: "Presso la propria sede", officina_partner: "Presso un'officina partner", mobile: "Intervento mobile",
};
export const MAINTENANCE_LABELS: Record<Enums<"maintenance_category">, string> = {
  tagliando: "Tagliando", cambio_olio: "Cambio olio", filtri: "Filtri", freni: "Freni", pneumatici: "Pneumatici",
  batteria: "Batteria", distribuzione: "Distribuzione", frizione: "Frizione", sospensioni: "Sospensioni",
  climatizzazione: "Climatizzazione", revisione: "Revisione", diagnosi: "Diagnosi", riparazione_motore: "Riparazione motore",
  riparazione_carrozzeria: "Riparazione carrozzeria", altro: "Altro",
};
export const RECORD_SOURCE_LABELS: Record<Enums<"record_source">, string> = {
  manuale: "Registrato da te", professionista: "Inserito da un professionista e confermato da te", importato: "Importato da fonte autorizzata",
};
export const REMINDER_STATUS_LABELS: Record<Enums<"reminder_status">, string> = {
  attivo: "Attivo", in_scadenza: "In scadenza", scaduto: "Scaduto", completato: "Completato", disattivato: "Disattivato",
};
export const EXPENSE_LABELS: Record<Enums<"expense_category">, string> = {
  riparazioni: "Riparazioni", tagliandi: "Tagliandi", ricambi: "Ricambi", pneumatici: "Pneumatici", assicurazione: "Assicurazione",
  revisione: "Revisione", bollo: "Bollo", carburante: "Carburante", altro: "Altro",
};
export const REMINDER_CATEGORY_LABELS: Record<string, string> = {
  revisione: "Revisione", assicurazione: "Assicurazione", bollo: "Bollo", cambio_olio: "Cambio olio", tagliando: "Tagliando",
  pneumatici: "Pneumatici", batteria: "Batteria", manutenzione: "Manutenzione programmata", altro: "Altro",
};
export const NOTIFICATION_CATEGORY_LABELS: Record<Enums<"notification_category">, string> = {
  messaggi: "Messaggi", richieste: "Richieste", preventivi: "Preventivi", appuntamenti: "Appuntamenti", automobili: "Automobili",
  ricambi: "Ricambi", officine: "Officine", meccanici: "Meccanici", manutenzione: "Manutenzione",
  amministrazione: "Amministrazione", account: "Account e servizio", premi: "Premi e punti", promozioni: "Promozioni",
};
export const CONVERSATION_CONTEXT_LABELS: Record<Enums<"conversation_context">, string> = {
  auto: "Acquisto automobili", officina: "Officine", meccanico: "Meccanici", ricambio: "Ricambi",
  assistenza: "Assistenza auto", supporto: "Supporto AutoGarage24", generale: "Generale",
};

export function labelOf<T extends string>(map: Record<T, string>, value: T | null | undefined): string {
  return value ? (map[value] ?? value) : "—";
}

/** Fase 16: categorie della richiesta di intervento (stesse chiavi del database). */
export const PROBLEM_LABELS: Record<string, string> = {
  meccanica_generale: "Meccanica generale", tagliando: "Tagliando", freni: "Freni", pneumatici: "Pneumatici", elettronica: "Elettronica",
  diagnosi: "Diagnosi", carrozzeria: "Carrozzeria", batteria: "Batteria", climatizzazione: "Climatizzazione", revisione: "Revisione", altro: "Altri interventi",
};

/** Fase 17: tipo di richiesta su un ricambio. */
export const INQUIRY_LABELS: Record<string, string> = {
  informazioni: "Richiesta di informazioni", disponibilita: "Verifica disponibilità", spedizione: "Richiesta di spedizione", ritiro: "Prenotazione del ritiro",
};
