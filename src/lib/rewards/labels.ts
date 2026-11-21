/** Etichette e costanti del programma AutoGarage24 Rewards (Fase 31). */

export const LEDGER_KIND = {
  guadagno: "Punti guadagnati", riscatto: "Premio riscattato", rimborso: "Punti restituiti", scadenza: "Punti scaduti",
  storno: "Storno (operazione annullata)", revoca: "Revoca dello staff", rettifica: "Rettifica dello staff",
} as const;

export const REDEMPTION_STATUS = {
  emesso: "Da utilizzare", utilizzato: "Utilizzato", annullato: "Annullato", scaduto: "Scaduto", revocato: "Revocato",
} as const;

export const ITEM_STATUS = {
  bozza: "Bozza", in_revisione: "In revisione", pubblicato: "Pubblicato", sospeso: "Sospeso", rifiutato: "Rifiutato", esaurito: "Esaurito", scaduto: "Scaduto",
} as const;

export const ITEM_CATEGORIES = {
  officina: "Officina", ricambi: "Ricambi", manutenzione: "Manutenzione", lavaggio: "Lavaggio", trasporto: "Trasporto", concessionario: "Concessionario", altro: "Altro",
} as const;

export const BENEFIT_TYPES = { percentuale: "Sconto percentuale", importo: "Sconto in euro", servizio: "Servizio o omaggio" } as const;

export const REFERRAL_STATUS = {
  registrato: "Registrato", qualificato: "Qualificato", premiato: "Premiato", in_verifica: "In verifica", respinto: "Respinto",
} as const;

export const FRAUD_SIGNALS: Record<string, string> = {
  stessa_email_normalizzata: "Stessa email (alias) dell'invitante",
  email_gia_registrata: "Email già registrata con un alias",
  limite_mensile: "Superato il limite mensile di inviti",
  stesso_telefono: "Stesso telefono dell'invitante",
};

export function benefitText(type: string, value: number | null): string {
  if (type === "percentuale" && value) return `Sconto del ${value}%`;
  if (type === "importo" && value) return `Sconto di ${value} €`;
  return "Servizio o omaggio";
}

export const fmtPoints = (n: number | null | undefined) => `${new Intl.NumberFormat("it-IT").format(n ?? 0)} punti`;

export type Tier = { code: string; name: string; min_points: number; bonus_pct: number; benefits: string[]; sort: number };
export type Wallet = {
  enabled: boolean; balance: number; earned: number; spent: number; expired: number; tier: Tier; next_tier: Tier | null;
  tier_points: number; tier_window_months: number; expiring_soon: number;
};

/** Avanzamento verso il livello successivo (0–100). */
export function tierProgress(w: Pick<Wallet, "tier" | "next_tier" | "tier_points">): number {
  if (!w.next_tier) return 100;
  const span = w.next_tier.min_points - w.tier.min_points;
  if (span <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round(((w.tier_points - w.tier.min_points) / span) * 100)));
}
