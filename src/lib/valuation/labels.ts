export const CONDITIONS: Record<string, string> = { ottime: "Ottime", buone: "Buone", discrete: "Discrete", da_sistemare: "Da sistemare" };
export const ACCIDENTS: Record<string, string> = { nessuno: "Nessun incidente noto", riparati: "Danni riparati", danni_presenti: "Danni non riparati", non_so: "Non so" };
export const INSPECTION_STATES: Record<string, string> = { in_regola: "Revisione in regola", scaduta: "Revisione scaduta", non_so: "Non so" };
export const RELIABILITY: Record<string, { label: string; tone: "neutral" | "orange" | "success" | "danger" | "warning" | "dark" }> = {
  alta: { label: "Affidabilità alta", tone: "success" }, media: { label: "Affidabilità media", tone: "orange" }, bassa: { label: "Affidabilità bassa", tone: "warning" },
};
export const OPTIONS = ["Navigatore", "Climatizzatore automatico", "Sensori di parcheggio", "Telecamera posteriore", "Cruise control adattivo", "Sedili riscaldati", "Tetto apribile", "Cerchi in lega", "Fari LED", "Gancio traino", "Apple CarPlay / Android Auto", "Interni in pelle"];
export const TARGET_STATUS: Record<string, { label: string; tone: "neutral" | "orange" | "success" | "danger" | "warning" | "dark" }> = {
  inviata: { label: "In attesa", tone: "warning" }, info_richiesta: { label: "Ha chiesto informazioni", tone: "orange" }, proposta_inviata: { label: "Proposta inviata", tone: "success" },
  rifiutata: { label: "Ha rifiutato", tone: "danger" }, scartata: { label: "Non scelto", tone: "neutral" }, accettata: { label: "Accordo raggiunto", tone: "dark" },
};
export const TRADE_STATUS: Record<string, { label: string; tone: "neutral" | "orange" | "success" | "danger" | "warning" | "dark" }> = {
  inviata: { label: "Inviata", tone: "warning" }, in_valutazione: { label: "In valutazione dal venditore", tone: "orange" }, ispezione_richiesta: { label: "Ispezione richiesta", tone: "orange" },
  controproposta: { label: "Controproposta del venditore", tone: "orange" }, accettata: { label: "Accettata (accordo preliminare)", tone: "success" }, rifiutata: { label: "Rifiutata", tone: "danger" }, ritirata: { label: "Ritirata", tone: "neutral" },
};
export const DISCLAIMER = "Stima indicativa e preliminare calcolata da AutoGarage24 sugli annunci della piattaforma: non è una perizia, non è un'offerta vincolante e non sostituisce la valutazione di un professionista che visioni l'auto.";
