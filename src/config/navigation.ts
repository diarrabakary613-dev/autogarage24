/**
 * Voci di navigazione. Contengono solo pagine esistenti: un test automatico
 * (tests/unit/navigation.test.ts) verifica che ogni link punti a una pagina reale.
 */
export type NavItem = { href: string; label: string };

export const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/auto-per-neopatentati", label: "Auto per neopatentati" },
  { href: "/auto-usate", label: "Trova la tua auto" },
  { href: "/garages", label: "Garages" },
  { href: "/meccanici", label: "Meccanici" },
  { href: "/ricambi", label: "Ricambi" },
  { href: "/servizi-auto", label: "Servizi auto" },
];

export const HEADER_CTAS = {
  service: { href: "/servizi-auto", label: "Cerco un servizio" },
  professional: { href: "/professionisti", label: "Sono un professionista" },
} as const;

export const FOOTER_NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Servizi",
    items: [
      { href: "/auto-per-neopatentati", label: "Auto per neopatentati" },
      { href: "/auto-usate", label: "Trova la tua auto" },
      { href: "/garages", label: "Garages" },
      { href: "/meccanici", label: "Meccanici" },
      { href: "/ricambi", label: "Ricambi" },
      { href: "/servizi-auto", label: "Servizi auto" },
      { href: "/mappa", label: "Mappa" },
      { href: "/richiedi-intervento", label: "Richiedi un intervento" },
      { href: "/offerte", label: "Offerte e promozioni" },
      { href: "/soccorso-stradale", label: "Assistenza stradale" },
      { href: "/trasporto-auto", label: "Trasporto auto" },
      { href: "/revisione-auto", label: "Revisione auto" },
      { href: "/assicurazione-auto", label: "Assicurazione auto" },
      { href: "/valuta-la-tua-auto", label: "Valuta la tua auto" },
    ],
  },
  {
    title: "AutoGarage24",
    items: [
      { href: "/chi-siamo", label: "Chi siamo" },
      { href: "/contatti", label: "Contatti" },
      { href: "/assistenza", label: "Assistenza e domande frequenti" },
      { href: "/blog", label: "Blog" },
      { href: "/professionisti", label: "Registrazione professionisti" },
      { href: "/diventa-partner", label: "Diventa partner" },
      { href: "/partner", label: "AutoGarage24 Partner" },
      { href: "/milano", label: "AutoGarage24 Milano" },
    ],
  },
  {
    title: "Legale",
    items: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookie", label: "Cookie Policy" },
      { href: "/termini", label: "Termini e condizioni" },
      { href: "/note-legali", label: "Informazioni legali" },
    ],
  },
];

/** Compatibilità con la Fase 1. */
export const LEGAL_NAV = FOOTER_NAV[2].items;
