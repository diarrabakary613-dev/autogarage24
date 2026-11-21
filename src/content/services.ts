/**
 * Le sei aree commerciali di AutoGarage24 (testi dal brief di progetto).
 * Usate sia dalle card della homepage sia dalle pagine dedicate:
 * per modificare un testo basta cambiarlo qui.
 */
export type ServiceKey =
  | "auto-per-neopatentati"
  | "auto-usate"
  | "garages"
  | "meccanici"
  | "ricambi"
  | "servizi-auto";

export type ServiceArea = {
  key: ServiceKey;
  href: `/${ServiceKey}`;
  /** Nome breve (menu, breadcrumb). */
  name: string;
  /** Etichetta sopra il titolo. */
  eyebrow: string;
  title: string;
  description: string;
  benefits: string[];
  cta: string;
  /** Fase in cui le funzioni operative saranno attivate. */
  availableInPhase: number;
};

export const SERVICES: Record<ServiceKey, ServiceArea> = {
  "auto-per-neopatentati": {
    key: "auto-per-neopatentati",
    href: "/auto-per-neopatentati",
    name: "Auto per neopatentati",
    eyebrow: "AutoGarage24 Neopatentati",
    title: "Trova la tua prima auto.",
    description:
      "Scopri automobili pensate per chi ha appena conseguito la patente. Confronta modelli, prezzi, caratteristiche e informazioni fornite dai venditori.",
    benefits: [
      "Automobili da esplorare per nuovi conducenti.",
      "Informazioni tecniche disponibili.",
      "Contatto diretto con il venditore.",
      "Possibilità di richiedere informazioni e verifiche.",
    ],
    cta: "Scopri le auto",
    availableInPhase: 4,
  },
  "auto-usate": {
    key: "auto-usate",
    href: "/auto-usate",
    name: "Auto usate",
    eyebrow: "Auto usate",
    title: "La prossima auto ti aspetta.",
    description:
      "Esplora automobili nuove e usate pubblicate dai professionisti e dai venditori presenti sulla piattaforma.",
    benefits: [
      "Ricerca per marca e modello.",
      "Filtri per prezzo.",
      "Filtri per chilometraggio.",
      "Informazioni e fotografie.",
      "Contatto con il venditore.",
    ],
    cta: "Cerca un'auto",
    availableInPhase: 3,
  },
  garages: {
    key: "garages",
    href: "/garages",
    name: "Garages e officine",
    eyebrow: "Garages e officine",
    title: "Il professionista giusto per la tua auto.",
    description:
      "Trova officine e centri specializzati vicino a te. Scopri i servizi offerti e contatta direttamente il professionista.",
    benefits: [
      "Ricerca per città e CAP.",
      "Servizi disponibili.",
      "Informazioni sull'attività.",
      "Richieste di preventivo.",
      "Richieste di appuntamento.",
    ],
    cta: "Trova un'officina",
    availableInPhase: 5,
  },
  meccanici: {
    key: "meccanici",
    href: "/meccanici",
    name: "Meccanici indipendenti",
    eyebrow: "Meccanici indipendenti",
    title: "Un meccanico quando ne hai bisogno.",
    description:
      "Scopri meccanici indipendenti e professionisti che offrono servizi di manutenzione e riparazione.",
    benefits: [
      "Profili professionali.",
      "Specializzazioni.",
      "Area di intervento.",
      "Contatto diretto.",
      "Richieste di assistenza.",
    ],
    cta: "Trova un meccanico",
    availableInPhase: 5,
  },
  ricambi: {
    key: "ricambi",
    href: "/ricambi",
    name: "Pezzi di ricambio",
    eyebrow: "Pezzi di ricambio",
    title: "Trova il ricambio giusto.",
    description:
      "Cerca ricambi nuovi e usati, confronta le offerte e contatta i venditori per verificare disponibilità e compatibilità.",
    benefits: [
      "Ricerca per categoria.",
      "Ricerca per marca.",
      "Ricerca per modello.",
      "Ricerca per codice ricambio.",
      "Condizione e prezzo.",
      "Contatto con il venditore.",
    ],
    cta: "Cerca ricambi",
    availableInPhase: 6,
  },
  "servizi-auto": {
    key: "servizi-auto",
    href: "/servizi-auto",
    name: "Manutenzione e assistenza",
    eyebrow: "Manutenzione e assistenza",
    title: "Prenditi cura della tua automobile.",
    description:
      "Trova servizi per la manutenzione ordinaria e straordinaria e organizza le esigenze della tua automobile.",
    benefits: ["Manutenzione.", "Diagnostica.", "Tagliando.", "Freni.", "Pneumatici.", "Elettronica.", "Assistenza."],
    cta: "Scopri i servizi",
    availableInPhase: 6,
  },
};

/** Ordine di priorità commerciale della homepage (Neopatentati ha una sezione propria). */
export const HOME_SERVICE_ORDER: ServiceKey[] = ["garages", "meccanici", "auto-usate", "ricambi", "servizi-auto"];

export const PART_CATEGORIES = [
  "Motore",
  "Cambio",
  "Freni",
  "Carrozzeria",
  "Elettronica",
  "Sospensioni",
  "Pneumatici",
  "Interni",
  "Illuminazione",
  "Accessori",
  "Altri ricambi",
] as const;

export const CAR_SERVICES: { name: string; description: string }[] = [
  { name: "Tagliando", description: "Manutenzione periodica secondo il piano del costruttore." },
  { name: "Cambio olio", description: "Sostituzione di olio motore e filtri." },
  { name: "Freni", description: "Controllo e sostituzione di pastiglie, dischi e liquido." },
  { name: "Pneumatici", description: "Cambio stagionale, equilibratura e convergenza." },
  { name: "Diagnostica", description: "Lettura centraline e ricerca guasti elettronici." },
  { name: "Batteria", description: "Verifica dello stato di carica e sostituzione." },
  { name: "Climatizzazione", description: "Ricarica gas, igienizzazione e controllo impianto." },
  { name: "Distribuzione", description: "Sostituzione cinghia o catena e componenti collegati." },
  { name: "Frizione", description: "Controllo e sostituzione del kit frizione." },
  { name: "Revisione", description: "Preparazione e revisione periodica del veicolo." },
  { name: "Elettronica", description: "Impianti elettrici, sensori e dispositivi di bordo." },
  { name: "Carrozzeria", description: "Riparazioni, verniciatura e ripristino estetico." },
  { name: "Altri interventi", description: "Ogni altra esigenza meccanica o di assistenza." },
];
