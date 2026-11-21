# Neopatentati — normativa implementata

**Ultima verifica delle fonti:** 19 novembre 2026
**Responsabile della verifica:** sviluppo AutoGarage24 (da confermare da parte del fondatore o di un consulente legale prima del lancio)

> Questo documento descrive le regole che AutoGarage24 usa per il calcolo automatico.
> Non è un parere legale. Prima del lancio va riletto da un consulente.

## 1. Fonti ufficiali

| Fonte | Link | Uso |
|---|---|---|
| Legge 25 novembre 2024, n. 177 — modifiche al Codice della strada (art. 7) | https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2024-11-25;177 | Regola "2024" |
| D.Lgs. 30 aprile 1992, n. 285 — Codice della strada, art. 117 (testo vigente) | https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto.legislativo:1992-04-30;285 | Testo consolidato dell'art. 117 |
| ACI — Rivista giuridica, «Limitazioni per i neopatentati» (versione aggiornata 2026) | https://rivistagiuridica.aci.it/fileadmin/Documenti/2026/Dottrina_e_Approfondimenti/Limitazioni_per_i_neopatentati_versione_aggiornata.pdf | Lettura di supporto (regime transitorio, eccezioni) |
| Polizia di Stato — limitazioni neopatentati (regime precedente) | https://poliziadistato.it/articolo/pdf/11365 | Regola "2011" |

Le stesse fonti sono salvate nel database (`legal_rule_versions.sources`) e mostrate nella scheda di ogni automobile.

## 2. Regole implementate

Le soglie **non sono scritte nel codice**: sono parametri delle versioni di regola
(`legal_rule_versions.params`), modificabili solo dal pannello `/admin/neopatentati`
dopo un test e con fonte e data di consultazione obbligatorie.

### Versione «2024 — L. 177/2024, patenti dal 14/12/2024»
- Si applica a chi ha conseguito la patente **B dal 14 dicembre 2024**.
- Durata: **3 anni** dal conseguimento (`duration_months: 36`).
- Rapporto potenza/tara massimo: **75 kW/t** (tutti gli autoveicoli).
- Potenza massima: **105 kW**, solo per veicoli di categoria **M1** (autovetture).

### Versione «2011 — patenti conseguite fino al 13/12/2024»
- Si applica a chi ha conseguito la patente **fino al 13 dicembre 2024** (regime transitorio).
- Durata: **1 anno** dal rilascio (`duration_months: 12`).
- Rapporto potenza/tara massimo: **55 kW/t**; potenza massima per M1: **70 kW**.
- Con la data di oggi (19/11/2026) il periodo è concluso per tutte queste patenti; la versione resta per lo storico.

### Calcolo
- Potenza: valore in kW (campo P.2 della carta di circolazione).
- Rapporto: se è presente un rapporto **documentato** si usa quello; altrimenti `potenza kW ÷ (tara kg / 1000)`.
- **Prudenza:** se il rapporto è *calcolato* ed è entro ±2% dal limite (`borderline_margin_pct: 2`) l'esito è **da verificare**.
- Elettriche e ibride plug-in: serve il rapporto documentato, altrimenti **da verificare** (la tara e la potenza da considerare possono differire per questi veicoli).
- Dato mancante (potenza o tara) → **da verificare**, mai "compatibile". Un superamento certo (es. potenza > 105 kW) è comunque **non compatibile**.
- Il marchio o il modello non sono mai usati per decidere: conta solo la versione con i suoi dati.

Implementazione identica in due punti, coperta da test:
- database: `private.evaluate_neo` (migrazione 0010) — usata per gli annunci;
- TypeScript: `src/lib/neopatentati/engine.ts` — usata dal calcolatore pubblico (`tests/unit/neopatentati.test.ts`).

### Storico
Ogni verifica di un veicolo è salvata in `vehicle_compatibility_checks` con la versione di regola usata. Pubblicare una nuova versione non cancella i risultati precedenti: i veicoli vengono ricalcolati e il nuovo esito si aggiunge allo storico.

## 3. Eccezioni previste (mostrate all'utente, non applicate in automatico)
- Accompagnatore: a fianco del conducente una persona di età non superiore a 65 anni, con patente valida per la stessa categoria da almeno 10 anni (o di categoria superiore).
- Veicolo al servizio di persona con disabilità munita del contrassegno previsto (art. 188).
- Solo regola 2024: conseguimento, entro i tre anni, di patente BE, C1, C, C1E, CE, D1, D1E, D o DE.

Le eccezioni dipendono dalla situazione di guida, non dall'auto: il sistema le spiega ma non modifica l'esito.

## 4. Da verificare prima del lancio
1. Lettura legale dell'art. 117 vigente e di eventuali decreti attuativi successivi al 19/11/2026.
2. Definizione di "tara" da usare per veicoli elettrici e ibridi plug-in (oggi: obbligo di valore documentato).
3. Patenti B96/BE e categorie diverse dalla B: il calcolatore oggi copre solo la **B**.
4. Importi aggiornati delle sanzioni (le FAQ rimandano alle fonti ufficiali senza indicare cifre).
5. Eventuali regole specifiche per veicoli N1 (il limite di 105 kW è configurato solo per M1).

## 5. Come aggiornare le regole
Vedi `docs/ADMIN_GUIDE.md`, sezione «Regole neopatentati»: si crea una nuova versione in bozza, si inseriscono fonte e data di consultazione, si esegue il test sui veicoli e solo dopo si pubblica.
