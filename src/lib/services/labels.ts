type Tone = "neutral" | "orange" | "success" | "danger" | "warning" | "dark";

/** Problemi selezionabili dall'automobilista → servizio richiesto all'operatore. */
export const ROADSIDE_PROBLEMS: { key: string; label: string; service: string }[] = [
  { key: "panne", label: "Auto in panne", service: "soccorso_meccanico" },
  { key: "batteria", label: "Batteria scarica", service: "avviamento_batteria" },
  { key: "foratura", label: "Pneumatico forato", service: "cambio_gomma" },
  { key: "incidente", label: "Incidente o danno al veicolo", service: "carro_attrezzi" },
  { key: "motore", label: "Problema al motore", service: "soccorso_meccanico" },
  { key: "non_parte", label: "Auto che non parte", service: "avviamento_batteria" },
  { key: "chiavi", label: "Chiavi chiuse dentro", service: "apertura_veicolo" },
  { key: "traino", label: "Serve un traino", service: "carro_attrezzi" },
  { key: "carburante", label: "Senza carburante", service: "rifornimento" },
  { key: "recupero", label: "Recupero veicolo", service: "recupero_veicolo" },
  { key: "officina", label: "Portare l'auto in officina", service: "trasporto_officina" },
];

export const ROADSIDE_SERVICES: Record<string, string> = {
  carro_attrezzi: "Carro attrezzi / traino",
  soccorso_meccanico: "Soccorso meccanico (officina mobile)",
  avviamento_batteria: "Avviamento e batteria (elettrauto)",
  cambio_gomma: "Foratura e cambio gomma (gommista)",
  rifornimento: "Rifornimento d'emergenza",
  apertura_veicolo: "Apertura veicolo",
  recupero_veicolo: "Recupero veicolo",
  trasporto_officina: "Trasporto in officina",
};
export const VEHICLE_TYPES: Record<string, string> = { auto: "Auto", suv: "SUV", furgone: "Furgone", moto: "Moto", elettrica: "Auto elettrica" };
export const LOCATION_TYPES: Record<string, string> = { strada: "Strada urbana o extraurbana", autostrada: "Autostrada o tangenziale", parcheggio: "Parcheggio", garage: "Box / garage", altro: "Altro" };

export const ROADSIDE_STATUS: Record<string, { label: string; tone: Tone; step: number }> = {
  in_ricerca: { label: "Richiesta inviata · scegli gli operatori", tone: "warning", step: 1 },
  inviata: { label: "Operatori contattati", tone: "warning", step: 2 },
  preventivo_ricevuto: { label: "Preventivo ricevuto", tone: "orange", step: 3 },
  accettata: { label: "Preventivo accettato · intervento confermato", tone: "success", step: 4 },
  operatore_in_viaggio: { label: "Operatore in viaggio", tone: "success", step: 5 },
  operatore_arrivato: { label: "Operatore arrivato", tone: "success", step: 6 },
  intervento_in_corso: { label: "Intervento iniziato", tone: "success", step: 7 },
  veicolo_caricato: { label: "Veicolo caricato", tone: "success", step: 7 },
  in_trasporto: { label: "Veicolo in trasporto", tone: "success", step: 7 },
  consegnato: { label: "Veicolo consegnato", tone: "success", step: 8 },
  completata: { label: "Intervento completato", tone: "dark", step: 9 },
  annullata: { label: "Richiesta annullata", tone: "neutral", step: 0 },
  nessun_operatore: { label: "Nessun operatore disponibile", tone: "danger", step: 0 },
};
/** Prossimi stati che l'operatore può impostare (solo in avanti). */
export const ROADSIDE_NEXT: Record<string, string[]> = {
  accettata: ["operatore_in_viaggio", "operatore_arrivato"],
  operatore_in_viaggio: ["operatore_arrivato"],
  operatore_arrivato: ["intervento_in_corso", "veicolo_caricato", "completata"],
  intervento_in_corso: ["veicolo_caricato", "completata"],
  veicolo_caricato: ["in_trasporto", "consegnato"],
  in_trasporto: ["consegnato"],
  consegnato: ["completata"],
};
export const ROADSIDE_ACTIVE = ["accettata", "operatore_in_viaggio", "operatore_arrivato", "intervento_in_corso", "veicolo_caricato", "in_trasporto"];

export const TRANSPORT_SERVICES: Record<string, string> = { bisarca: "Bisarca", carro_attrezzi: "Carro attrezzi (anche non marciante)", pianale_chiuso: "Pianale / furgone chiuso", con_autista: "Con autista (guida del veicolo)", indifferente: "Indifferente" };
export const TRANSPORT_STATUS: Record<string, { label: string; tone: Tone }> = {
  aperta: { label: "In attesa di preventivi", tone: "warning" },
  preventivi_ricevuti: { label: "Preventivi ricevuti", tone: "orange" },
  assegnata: { label: "Preventivo accettato", tone: "success" },
  ritiro_programmato: { label: "Trasporto programmato", tone: "success" },
  ritirato: { label: "Veicolo ritirato", tone: "success" },
  in_transito: { label: "Trasporto in corso", tone: "success" },
  consegnato: { label: "Veicolo consegnato", tone: "success" },
  completata: { label: "Trasporto completato", tone: "dark" },
  annullata: { label: "Trasporto annullato", tone: "neutral" },
  contestata: { label: "Problema segnalato", tone: "danger" },
};
export const OPERATOR_STATUS: Record<string, { label: string; tone: Tone }> = {
  in_revisione: { label: "In verifica dallo staff", tone: "warning" },
  attivo: { label: "Verificato e attivo", tone: "success" },
  sospeso: { label: "Sospeso", tone: "danger" },
  rifiutato: { label: "Non approvato", tone: "danger" },
};
