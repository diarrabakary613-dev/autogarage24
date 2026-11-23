/**
 * Testi della homepage. Modificabili senza toccare i componenti.
 * Nella Fase 9 diventeranno gestibili dal pannello di amministrazione.
 */
export const HOME = {
  hero: {
    eyebrow: "Milano e provincia · servizi automobilistici",
    title: "Tutto il mondo dell'automobile.",
    titleAccent: "In un unico posto.",
    subtitle:
      "Trova la tua prossima automobile, scopri professionisti qualificati, cerca ricambi e gestisci le esigenze della tua auto con AutoGarage24.",
    primaryCta: { label: "Trova la tua prima auto", href: "/auto-per-neopatentati" },
    secondaryCta: { label: "Scopri i servizi", href: "/servizi-auto" },
    quickLinksLabel: "Cosa cerchi?",
    quickLinks: [
      { label: "Prima auto", href: "/auto-per-neopatentati" },
      { label: "Officina", href: "/garages#cerca" },
      { label: "Meccanico", href: "/meccanici#cerca" },
      { label: "Auto usata", href: "/auto-usate" },
      { label: "Ricambi", href: "/ricambi#cerca" },
      { label: "Tagliando", href: "/garages?q=tagliando#cerca" },
    ],
  },
  marquee: {
    label: "Marchi che puoi cercare su AutoGarage24",
    disclaimer: "I marchi appartengono ai rispettivi proprietari e sono citati solo come criterio di ricerca.",
  },
  brandGrid: {
    title: "Trova l'auto che fa per te.",
    description:
      "Esplora le automobili disponibili per marca e scopri le offerte pubblicate dai professionisti e dai venditori presenti su AutoGarage24.",
  },
  neopatentati: {
    eyebrow: "Il servizio AutoGarage24 Neopatentati",
    title: "La tua prima auto merita una scelta intelligente.",
    description:
      "Hai appena preso la patente? Trova automobili adatte ai neopatentati, confronta le caratteristiche e scopri i professionisti che possono aiutarti a scegliere con maggiore sicurezza.",
    primaryCta: { label: "Scopri le auto per neopatentati", href: "/auto-per-neopatentati" },
    secondaryCta: { label: "Come funziona il servizio", href: "/auto-per-neopatentati#come-funziona" },
    pillars: [
      {
        title: "Compatibilità chiara",
        text: "Ogni auto viene confrontata con le regole per neopatentati in vigore, usando i dati tecnici del veicolo. Se mancano dati, lo diciamo.",
      },
      {
        title: "Controllo AutoGarage24",
        text: "Quando un professionista controlla un'auto, trovi una scheda datata e firmata con l'esito di ogni verifica.",
      },
      {
        title: "Venditori identificabili",
        text: "Contatti direttamente professionisti e venditori con un profilo riconoscibile, senza intermediari.",
      },
    ],
    listingsTitle: "Auto per neopatentati disponibili",
    listingsEmpty:
      "Gli annunci per neopatentati saranno pubblicati solo dopo l'autorizzazione dei venditori e la verifica dei dati essenziali. Non mostriamo auto di esempio.",
  },
  services: {
    eyebrow: "Un ecosistema di servizi",
    title: "Tutto ciò che serve alla tua auto, con i professionisti giusti.",
  },
  professionals: {
    title: "Sei un professionista dell'automobile?",
    subtitle:
      "Fai conoscere la tua attività, raggiungi nuovi clienti e sviluppa la tua presenza online con AutoGarage24.",
    cards: [
      {
        title: "Ho un'officina",
        text: "Presenta la tua officina, i tuoi servizi e le automobili che hai in vendita.",
        cta: "Registra la mia officina",
        href: "/registrati?ruolo=officina",
      },
      {
        title: "Sono un meccanico indipendente",
        text: "Crea il tuo profilo professionale e rendi visibili le tue competenze.",
        cta: "Registrati come meccanico",
        href: "/registrati?ruolo=meccanico",
      },
    ],
    sellersNote: "Vendi automobili o ricambi come professionista?",
    sellersLinks: [
      { label: "Venditore di automobili", href: "/registrati?ruolo=venditore_auto" },
      { label: "Venditore di ricambi", href: "/registrati?ruolo=venditore_ricambi" },
    ],
  },
  featuredCars: {
    eyebrow: "Auto selezionate su AutoGarage24",
    title: "Automobili presentate dai professionisti della nostra rete.",
    empty:
      "Qui compariranno solo annunci autorizzati dai venditori, verificati nei dati essenziali e approvati per la pubblicazione. La raccolta delle prime automobili a Milano è in corso.",
  },
  howItWorks: {
    title: "Come funziona",
    steps: [
      { title: "Cerca", text: "Cerca il servizio o l'automobile di cui hai bisogno." },
      { title: "Scopri", text: "Scopri professionisti e annunci della tua zona." },
      { title: "Consulta", text: "Consulta informazioni, servizi e caratteristiche." },
      { title: "Contatta", text: "Contatta direttamente il venditore o il professionista." },
      { title: "Organizza", text: "Organizza il servizio, l'appuntamento o la visita." },
    ],
  },
  testimonials: {
    title: "Cosa dicono di AutoGarage24",
  },
} as const;

/**
 * Testimonianze: solo recensioni AUTENTICHE e verificabili, con il consenso
 * dell'autore. Finché l'elenco è vuoto la sezione non viene mostrata.
 */
export type Testimonial = { quote: string; author: string; context: string; date: string };
export const TESTIMONIALS: Testimonial[] = [];
