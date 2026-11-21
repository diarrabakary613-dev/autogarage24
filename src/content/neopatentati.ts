/**
 * FAQ neopatentati. Contenuti verificati sulle fonti ufficiali indicate in
 * docs/NEOPATENTATI_LEGISLAZIONE.md (ultima verifica: 19/11/2026).
 * In caso di modifica normativa aggiornare qui e la versione delle regole dal pannello.
 */
export const NEO_FAQ = [
  {
    q: "Quali auto può guidare un neopatentato?",
    a: "Per chi ha conseguito la patente B dal 14 dicembre 2024, nei primi tre anni non si possono guidare autoveicoli con rapporto potenza/tara superiore a 75 kW/t; per le autovetture (categoria M1) c'è anche un limite di potenza di 105 kW. Chi ha conseguito la patente entro il 13 dicembre 2024 resta soggetto alla regola precedente: primo anno, 55 kW/t e 70 kW.",
  },
  {
    q: "Come si calcola il rapporto potenza/tara?",
    a: "Si divide la potenza massima in kW (campo P.2 della carta di circolazione) per la tara espressa in tonnellate. Esempio: 70 kW e 1.150 kg danno 70 ÷ 1,15 ≈ 60,9 kW/t. Se il rapporto è riportato su un documento ufficiale, AutoGarage24 usa quel valore.",
  },
  {
    q: "Perché alcune auto risultano «da verificare»?",
    a: "Perché mancano dati tecnici (potenza o tara), perché il valore calcolato è molto vicino al limite oppure perché si tratta di auto elettriche o ibride plug-in per cui serve il rapporto documentato. In questi casi non dichiariamo mai la compatibilità.",
  },
  {
    q: "Ci sono eccezioni?",
    a: "Sì. I limiti non si applicano se a fianco del conducente siede, come istruttore, una persona di età non superiore a 65 anni con patente valida da almeno dieci anni, o se il veicolo è al servizio di una persona con disabilità munita del contrassegno previsto. Per le patenti dal 14/12/2024 è prevista anche l'esclusione in caso di conseguimento, entro i tre anni, di una patente di categoria superiore indicata dalla legge.",
  },
  {
    q: "Il risultato di AutoGarage24 ha valore legale?",
    a: "No. È un aiuto basato sui dati disponibili e sulle regole pubblicate dalla nostra amministrazione a partire dalle fonti ufficiali. Prima dell'acquisto e della guida verifica sempre la carta di circolazione e la normativa vigente.",
  },
  {
    q: "Cosa rischio se guido un'auto non consentita?",
    a: "Il Codice della strada prevede una sanzione amministrativa pecuniaria e la sospensione della patente. Gli importi sono aggiornati periodicamente: consulta le fonti ufficiali per i valori in vigore.",
  },
] as const;
