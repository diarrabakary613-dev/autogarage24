type Tone = "neutral" | "orange" | "success" | "danger" | "warning" | "dark";
export const INSPECTION_CATEGORIES: Record<string, string> = {
  autovettura: "Autovettura (fino a 8 posti)", moto: "Moto", ciclomotore: "Ciclomotore", leggero_merci: "Veicolo merci fino a 3,5 t",
  pesante: "Veicolo oltre 3,5 t", autobus: "Autobus (oltre 8 posti)", rimorchio_leggero: "Rimorchio fino a 3,5 t", rimorchio_pesante: "Rimorchio oltre 3,5 t",
};
export const USAGE_TYPES: Record<string, string> = { privato: "Uso privato", taxi: "Taxi", ncc: "Noleggio con conducente (NCC)", ambulanza: "Ambulanza", noleggio_senza_conducente: "Noleggio senza conducente", altro: "Altro" };
export const INSPECTION_SERVICES: Record<string, string> = { revisione: "Revisione periodica", pre_revisione: "Controllo pre-revisione", collaudo: "Collaudo", controllo_gas: "Controllo impianto GPL/metano", ritiro_consegna: "Ritiro e riconsegna dell'auto" };
export const OUTCOMES: Record<string, { label: string; tone: Tone }> = {
  regolare: { label: "Regolare", tone: "success" }, ripetere: { label: "Ripetere", tone: "warning" }, sospeso: { label: "Sospeso dalla circolazione", tone: "danger" },
};
export const VERIFICATION: Record<string, { label: string; tone: Tone }> = {
  dichiarato: { label: "Dichiarato dal proprietario", tone: "neutral" },
  documento_allegato: { label: "Documento allegato (non verificato)", tone: "neutral" },
  confermato_centro: { label: "Confermato dal centro revisione", tone: "success" },
};
export const APPT_STATUS: Record<string, { label: string; tone: Tone }> = {
  richiesta: { label: "In attesa di conferma", tone: "warning" }, confermato: { label: "Confermato", tone: "success" },
  modifica_proposta: { label: "Nuovo orario proposto", tone: "orange" }, rifiutato: { label: "Rifiutato", tone: "danger" },
  annullato: { label: "Annullato", tone: "neutral" }, completato: { label: "Completato", tone: "dark" }, mancata_presentazione: { label: "Mancata presentazione", tone: "danger" },
};
