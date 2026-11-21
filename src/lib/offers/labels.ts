export const OFFER_CATEGORIES = {
  tagliandi: "Tagliandi", pneumatici: "Cambio pneumatici", freni: "Freni", diagnosi: "Diagnosi", carrozzeria: "Carrozzeria",
  manutenzione: "Manutenzione", ricambi: "Ricambi", accessori: "Accessori", servizi: "Servizi automotive",
} as const;
export type OfferCategory = keyof typeof OFFER_CATEGORIES;
export const NEO_TOPICS = {
  prima_manutenzione: "Prima manutenzione", controllo_pre_acquisto: "Controllo pre-acquisto", pneumatici: "Pneumatici",
  assistenza: "Assistenza", accessori: "Accessori", altro: "Altri servizi utili",
} as const;
export const OFFER_STATUS = {
  bozza: "Bozza", in_revisione: "In revisione", pubblicata: "Pubblicata", sospesa: "Sospesa", rifiutata: "Rifiutata", scaduta: "Scaduta", esaurita: "Esaurita",
} as const;
export const CLAIM_STATUS = { richiesto: "Richiesta inviata", confermato: "Confermata dal partner", utilizzato: "Utilizzata", annullato: "Annullata", scaduto: "Scaduta" } as const;
/** Sconto mostrato solo se coerente: calcolato dai prezzi, mai inserito a mano. */
export function discountPct(original: number, promo: number): number | null {
  if (!(original > 0) || !(promo > 0) || promo >= original) return null;
  return Math.round(100 - (promo * 100) / original);
}
