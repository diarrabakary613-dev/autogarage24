/**
 * Pagine pubbliche indicizzabili. Le pagine con soli filtri (es. ?marca=)
 * e le pagine riservate non sono incluse. Le pagine locali (es. /garages/milano)
 * verranno aggiunte solo quando avranno contenuti reali sufficienti.
 */
export const PUBLIC_ROUTES: { path: string; priority: number }[] = [
  { path: "/", priority: 1 },
  { path: "/auto-per-neopatentati", priority: 0.95 },
  { path: "/garages", priority: 0.85 },
  { path: "/meccanici", priority: 0.85 },
  { path: "/auto-usate", priority: 0.8 },
  { path: "/ricambi", priority: 0.7 },
  { path: "/servizi-auto", priority: 0.7 },
  { path: "/professionisti", priority: 0.7 },
  { path: "/prima-auto", priority: 0.8 },
  { path: "/milano", priority: 0.75 },
  { path: "/mappa", priority: 0.7 },
  { path: "/richiedi-intervento", priority: 0.7 },
  { path: "/offerte", priority: 0.7 },
  { path: "/offerte/neopatentati", priority: 0.6 },
  { path: "/soccorso-stradale", priority: 0.8 },
  { path: "/trasporto-auto", priority: 0.7 },
  { path: "/revisione-auto", priority: 0.8 },
  { path: "/assicurazione-auto", priority: 0.6 },
  { path: "/valuta-la-tua-auto", priority: 0.8 },
  { path: "/trova-officina", priority: 0.7 },
  { path: "/trova-ricambi", priority: 0.6 },
  { path: "/partner", priority: 0.6 },
  { path: "/diventa-partner", priority: 0.6 },
  { path: "/diventa-officina-partner", priority: 0.5 },
  { path: "/diventa-concessionario-partner", priority: 0.5 },
  { path: "/chi-siamo", priority: 0.4 },
  { path: "/contatti", priority: 0.4 },
  { path: "/assistenza", priority: 0.4 },
];
