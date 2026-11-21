/** Costanti SEO condivise (senza dipendenze dal server). */
export const LOCAL_CATEGORIES = {
  officine: { type: "officina", label: "Officine", base: "/garages" },
  meccanici: { type: "meccanico", label: "Meccanici", base: "/meccanici" },
  ricambi: { type: "venditore_ricambi", label: "Ricambi auto", base: "/venditori-ricambi" },
  concessionari: { type: "venditore_auto", label: "Concessionari e venditori di auto", base: "/professionisti" },
} as const;
export type LocalCategory = keyof typeof LOCAL_CATEGORIES;
export const categoryForType = (t: string) => (Object.entries(LOCAL_CATEGORIES).find(([, v]) => v.type === t)?.[0] ?? null) as LocalCategory | null;

export const NEO_BANDS = {
  "fino-5000": { label: "fino a 5.000 €", min: 0, max: 500000 },
  "5000-10000": { label: "da 5.000 a 10.000 €", min: 500000, max: 1000000 },
  "10000-15000": { label: "da 10.000 a 15.000 €", min: 1000000, max: 1500000 },
  "oltre-15000": { label: "oltre 15.000 €", min: 1500000, max: 1e12 },
} as const;
export type NeoBand = keyof typeof NEO_BANDS;

