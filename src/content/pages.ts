/**
 * Testi delle pagine dedicate. Separati dai componenti per poterli
 * aggiornare facilmente (e, in futuro, gestirli dal pannello).
 */

export const NEOPATENTATI_PAGE = {
  heroTitle: "La tua prima auto, con più informazioni e meno dubbi.",
  heroDescription:
    "Trova automobili adatte ai neopatentati, consulta le informazioni disponibili e mettiti in contatto con professionisti che conoscono i veicoli che propongono.",
  filters: [
    "Marca e modello",
    "Prezzo minimo e massimo",
    "Alimentazione",
    "Cambio",
    "Anno di immatricolazione",
    "Chilometraggio",
    "Località",
    "Venditore professionale o privato",
    "Compatibilità con le regole per neopatentati",
  ],
  steps: [
    {
      title: "Esplora",
      text: "Consulta le auto pubblicate, con fotografie, dati tecnici e informazioni fornite dal venditore.",
    },
    {
      title: "Verifica la compatibilità",
      text: "Per ogni auto indichiamo se risulta compatibile con le regole per neopatentati configurate, oppure se i dati non bastano per dirlo.",
    },
    {
      title: "Leggi i controlli",
      text: "Se un professionista ha controllato l'auto, trovi la scheda Controllo AutoGarage24 con data, autore ed esiti.",
    },
    {
      title: "Contatta il venditore",
      text: "Chiedi informazioni o un appuntamento per vedere l'auto direttamente al venditore.",
    },
  ],
  rules: {
    title: "Una verifica basata sui dati, non sul nome del modello.",
    paragraphs: [
      "In Italia i neopatentati, per un periodo dopo il conseguimento della patente, possono guidare solo veicoli entro determinati limiti di potenza e di rapporto potenza/tara, con alcune eccezioni previste dalla legge.",
      "Queste regole sono cambiate nel tempo e possono cambiare ancora. Per questo AutoGarage24 non le scrive nel codice: le salva come regole versionate, aggiornabili solo dall'amministrazione e verificate su fonti ufficiali prima della pubblicazione.",
      "Il risultato tiene conto dei dati tecnici del veicolo (potenza, tara e altri parametri richiesti) e riporta sempre la versione della regola usata e la data della verifica.",
    ],
    outcomes: [
      { label: "Compatibile", text: "I dati tecnici disponibili rispettano le regole configurate alla data indicata." },
      { label: "Non compatibile", text: "Mostriamo una spiegazione chiara del motivo, ad esempio il parametro che supera il limite." },
      { label: "Compatibilità da verificare", text: "I dati del veicolo sono incompleti: non facciamo supposizioni." },
    ],
    disclaimer:
      "L'indicazione di AutoGarage24 non sostituisce il controllo della carta di circolazione e della normativa vigente. In caso di dubbio, verifica sempre i documenti ufficiali del veicolo.",
  },
  inspection: {
    intro:
      "Una scheda che documenta i controlli realmente eseguiti da un professionista su un'auto. Non è una certificazione e non sostituisce le dichiarazioni del venditore: le distingue.",
    fields: [
      "Professionista che ha eseguito il controllo e officina associata",
      "Data del controllo",
      "Chilometraggio dichiarato o rilevato",
      "Elementi controllati ed esito di ciascuno",
      "Fotografie",
      "Osservazioni e raccomandazioni",
      "Eventuali riparazioni consigliate",
    ],
    statuses: [
      { label: "Controllato", text: "Nessuna anomalia rilevata al momento del controllo." },
      { label: "Da monitorare", text: "Elemento funzionante, da tenere sotto osservazione." },
      { label: "Riparazione consigliata", text: "Il professionista suggerisce un intervento." },
      { label: "Non controllato", text: "Elemento non verificato in questo controllo." },
      { label: "Non applicabile", text: "Elemento non presente su questo veicolo." },
    ],
    disclaimer:
      "Un controllo descrive lo stato dell'auto alla data indicata: non è una garanzia sul futuro funzionamento del veicolo.",
  },
} as const;

export const MARKETPLACE_FEATURES = [
  "Ricerca per marca e modello",
  "Filtri per prezzo, anno e chilometraggio",
  "Alimentazione, cambio e carrozzeria",
  "Potenza",
  "Località e raggio di ricerca",
  "Venditore professionale o privato",
  "Preferiti e confronto tra veicoli",
  "Richiesta informazioni e appuntamento per vedere l'auto",
  "Segnalazione degli annunci",
] as const;

export const GARAGE_FEATURES = [
  "Ricerca per città, CAP e distanza",
  "Filtri per specializzazione, servizi e marche trattate",
  "Profili con orari, servizi e posizione su mappa",
  "Richiesta di preventivo",
  "Richiesta di appuntamento",
  "Salvataggio nei preferiti",
] as const;

export const MECHANIC_FEATURES = [
  "Ricerca per località",
  "Filtri per specializzazione",
  "Profili con competenze, servizi e zona di intervento",
  "Certificazioni solo se documentate",
  "Richiesta di assistenza e di preventivo",
  "Contatto diretto",
] as const;

export const PARTS_FEATURES = [
  "Ricerca per categoria, marca, modello e anno",
  "Ricerca per codice ricambio",
  "Condizione: nuovo o usato",
  "Prezzo, disponibilità e località",
  "Compatibilità dichiarata dal venditore, mai presunta",
  "Contatto con il venditore",
] as const;

export const SERVICES_FEATURES = [
  "Professionisti che offrono ciascun servizio",
  "Richiesta di preventivo",
  "Richiesta di appuntamento",
  "Contatto diretto con il professionista",
] as const;
