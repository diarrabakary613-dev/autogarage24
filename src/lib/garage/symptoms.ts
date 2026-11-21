/**
 * Indirizzamento delle richieste di assistenza: suggerisce la categoria di professionista
 * a partire dalle parole indicate. NON è una diagnosi. Le parole "di allarme" mostrano
 * un invito a fermarsi in sicurezza.
 */
export const PROBLEM_CATEGORIES = {
  freni: { label: "Freni", category: "freni", garageCategory: "centro-freni" },
  motore: { label: "Motore / spie motore", category: "motore", garageCategory: "officina-meccanica" },
  elettrico: { label: "Impianto elettrico / batteria", category: "diagnosi-elettronica", garageCategory: "elettrauto" },
  climatizzazione: { label: "Climatizzazione", category: "climatizzazione", garageCategory: "climatizzazione" },
  pneumatici: { label: "Pneumatici", category: "pneumatici", garageCategory: "gommista" },
  sospensioni: { label: "Sterzo e sospensioni", category: "sospensioni", garageCategory: "officina-meccanica" },
  cambio: { label: "Cambio e frizione", category: "frizione", garageCategory: "officina-meccanica" },
  carrozzeria: { label: "Carrozzeria e cristalli", category: "", garageCategory: "carrozzeria" },
  altro: { label: "Altro / non so", category: "ricerca-guasti", garageCategory: "centro-diagnosi" },
} as const;
export type ProblemCategory = keyof typeof PROBLEM_CATEGORIES;

const DANGER = [
  "fumo", "fiamme", "fuoco", "odore di bruciato", "odore di benzina", "perdita di carburante", "freni non", "pedale del freno", "freno a fondo",
  "sterzo duro", "sterzo bloccato", "spia rossa", "spia dell'olio", "temperatura alta", "surriscald", "ruota che balla", "scoppio", "airbag",
];

export function dangerSignals(text: string): string[] {
  const t = text.toLowerCase();
  return DANGER.filter((w) => t.includes(w));
}

export function suggestCategory(text: string): ProblemCategory {
  const t = text.toLowerCase();
  if (/(fren|pastigl|disch)/.test(t)) return "freni";
  if (/(batteri|avviament|elettric|luci|spie? (gialla|accesa))/.test(t)) return "elettrico";
  if (/(clima|aria condizionata|ricarica gas)/.test(t)) return "climatizzazione";
  if (/(gomm|pneumatic|foratur)/.test(t)) return "pneumatici";
  if (/(frizion|cambio|marce)/.test(t)) return "cambio";
  if (/(sterz|sospension|ammortizz)/.test(t)) return "sospensioni";
  if (/(carrozzer|ammaccat|graffi|parabrezza|cristall)/.test(t)) return "carrozzeria";
  if (/(motor|olio|fumo|perde potenza|batte in testa|candel)/.test(t)) return "motore";
  return "altro";
}
