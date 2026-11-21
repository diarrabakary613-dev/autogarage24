# AutoGarage24 — Rapporto tecnico Fasi 21–30

Data: 20 novembre 2026 · Ambiente di verifica: database PostgreSQL locale con le 23 migrazioni applicate, build di produzione Next.js 16, browser Chrome automatizzato (desktop 1366 px e smartphone 390 px).

## 0. Sintesi

| Fase | Modulo | Stato |
|---|---|---|
| 21 | Offerte, promozioni e coupon | ✅ Sviluppata e testata (database + interfaccia pubblica) |
| 22 | Marketplace «Trova la tua auto» | ✅ Estensioni sviluppate sul marketplace esistente |
| 23 | Assistenza stradale | ✅ Sviluppata e testata |
| 24 | Assicurazione auto (informazione e contatti) | ✅ Sviluppata · 🟠 servono partner autorizzati e parere legale |
| 25 | Revisioni | ✅ Sviluppata e testata |
| 26 | Valutazione, vendita e permuta | ✅ Sviluppata e testata |
| 27 | Prenotazioni e test drive | ✅ Sviluppata e testata · 🔧 Google Calendar predisposto, non attivo |
| 28 | Trasporto auto | ✅ Sviluppata e testata · 🔧 pagamenti solo predisposti |
| 29 | Potenziamento assistenza stradale | ✅ Integrato nel modulo della Fase 23 (nessun secondo marketplace) |
| 30 | Business Center | ✅ Sviluppato e testato · 🔧 piani a pagamento non attivi |

**Verifiche eseguite:** 495 controlli di sicurezza e logica sul database (tutte le fasi 1–30), 143 test unitari, controllo TypeScript e lint senza errori né avvisi, build di produzione riuscita, 77 collegamenti pubblici controllati (0 non funzionanti), 8 pagine nuove verificate su desktop e smartphone (nessun errore JavaScript, nessuno scorrimento orizzontale), rotte private protette (reindirizzamento all'accesso).

**Non verificato:** i flussi con utenti autenticati nell'interfaccia (servono il progetto Supabase reale con le migrazioni applicate e l'autenticazione), invio email, notifiche push, caricamenti reali su Storage, job pianificati (pg_cron) in produzione. La logica di questi flussi è coperta dai test del database, che simulano utenti reali con i ruoli `anon`, `authenticated` e `service_role`.

**Importante:** sul progetto Supabase reale (`mcjlyqplfiyhrxvazzzk`) le migrazioni 0004 e 0007–0023 **non sono ancora applicate**. Serve la tua conferma nel connettore («applica le migrazioni»).

---

## 1. Principi rispettati in tutte le fasi
- Nessun dato inventato: nessun operatore, partner, prezzo, disponibilità, preventivo, valutazione o autorizzazione fittizi. Le pagine pubbliche mostrano stati vuoti espliciti finché non ci sono dati reali.
- Nessun pagamento, deposito o escrow; nessun abbonamento a pagamento attivo.
- Nessun GPS simulato: la posizione dell'operatore compare solo se l'operatore la condivide davvero dal proprio telefono.
- Disponibilità e orari prenotabili derivano solo da quanto configurato da venditori e centri.
- Verifiche (veicoli, operatori, centri, partner assicurativi) registrate solo dallo staff con descrizione del controllo eseguito.
- Ogni transizione di stato avviene lato server (funzioni con controllo dei permessi), con cronologia non modificabile.
- Riutilizzo delle strutture esistenti: richieste, conversazioni e messaggi, notifiche, profili professionali, recensioni, «Il mio Garage», promemoria, mappa, impostazioni e registro attività.

## 2. Migrazioni SQL (nuove: 0019–0023)

| Migrazione | Contenuto |
|---|---|
| 0019 `roles_services` | Nuovi ruoli: `soccorritore`, `trasportatore`, `centro_revisione` (auto-registrabili), `intermediario_assicurativo` (solo su abilitazione dello staff) |
| 0020 `offers_marketplace_bookings` | Permessi nuovi, `platform_settings`; Fase 21 (offerte, coupon, riscatti, storico); Fase 22 (video, verifiche, storico prezzi, notifiche sugli annunci salvati, privati disattivabili, distanza); Fase 27 (disponibilità, blocchi, prenotazioni, eventi, promemoria, Google Calendar predisposto) |
| 0021 `roadside_transport` | Fasi 23/29 (operatori, richieste, posizione esatta separata, destinatari, preventivi, eventi, posizione dal vivo) e Fase 28 (trasportatori, richieste, indirizzi separati, preventivi, verbali, eventi); bucket privato `service-photos` |
| 0022 `insurance_inspection_valuation` | Fase 24 (partner, referenti, integrazioni, richieste con consenso per partner, preventivi, eventi); Fase 25 (regole art. 80 configurabili, calcolo scadenze, centri, autorizzazioni, appuntamenti, storico revisioni, promemoria); Fase 26 (valutazioni, stima interna, richieste professionali, proposte e controproposte, permute, storico trattative, bucket privato `valuation-photos`); cronologie cancellabili solo insieme alla pratica (diritto alla cancellazione) |
| 0023 `business_center` | Visualizzazioni giornaliere, piani e limiti, collaboratori, registro aziendale, stato CRM e note interne, attività, statistiche, completezza del profilo, azioni delegate sulle prenotazioni, panoramica amministrativa |

Totale progetto: **23 migrazioni**. Le migrazioni già applicate non sono state modificate.

## 3. Fase 21 — Offerte e coupon
**Funzionalità:** sezione pubblica «Offerte per automobilisti» (`/offerte`) con 9 categorie, filtri per città, distanza dalla posizione (solo su consenso) e categoria; sezione dedicata `/offerte/neopatentati`; scheda offerta con foto, prezzo originale e promozionale, sconto calcolato dal database, partner, località, validità e condizioni; preferiti; richiesta dell'offerta con codice univoco `AG24-XXXXXXXX` e conversazione con il partner (il riscatto è una richiesta, non un acquisto); dashboard partner (creazione, modifica, date, quantità, sospensione, coupon, richieste ricevute, statistiche); «Le mie offerte» per l'utente; pannello amministratore (approvazione configurabile, rifiuto, sospensione, controllo coupon, statistiche, segnalazioni).
**Coupon:** codici univoci, percentuale o importo fisso, utilizzi massimi, limite per utente, importo minimo, categorie, scadenza; protezione dagli usi doppi lato server.
**Analytics partner:** visualizzazioni, clic, richieste, coupon generati, utilizzi confermati dal partner e conversione, tenuti distinti.
**Tabelle:** `promotional_offers`, `offer_status_history`, `promotional_coupons`, `offer_claims`, `coupon_redemptions`; `favorites.offer_id` (riuso dei preferiti esistenti).

## 4. Fase 22 — Trova la tua auto
**Riuso:** il marketplace esistente (annunci, foto, ricerca, idoneità neopatentati con normativa e data di riferimento, preferiti, messaggi, moderazione) resta la base.
**Aggiunte:** titolo «Trova la tua auto» e accesso diretto alle auto per neopatentati; filtro per distanza; confronto fino a 4 auto; video degli annunci (bucket `listing-videos`, max 3 × 50 MB); stato di verifica con tre verifiche documentate dallo staff (documentazione, identità del venditore, dati tecnici) e avvertenza esplicita che non si certifica l'assenza di incidenti o guasti; storico prezzi pubblico; notifiche a chi ha salvato l'annuncio quando cambia prezzo o stato; pubblicazione dei privati attivabile o disattivabile dall'amministratore; statistiche venditore (visualizzazioni, preferiti, richieste, prenotazioni, variazioni di prezzo); reputazione del venditore sulla scheda; collegamenti a permuta, trasporto, valutazione e assicurazione.

## 5. Fase 27 — Prenotazioni e test drive
**Funzionalità:** sulla scheda auto «Prenota visione o test drive» con orari reali (cinque tipi di appuntamento), orario alternativo, messaggio e telefono; sezione test drive con dichiarazione di patente valida, anni di esperienza, condizioni del venditore e avviso su assicurazione e responsabilità (nessun documento caricato); «Orari per le visite» del venditore (durata, preavviso, giorni prenotabili, fasce settimanali, chiusure, condizioni del test drive, indirizzo mostrato solo dopo la conferma); «Visite e test drive» per acquirente e venditore (conferma, rifiuto, proposta di nuovo orario, accettazione o rifiuto della modifica, annullamento con motivo, completato, mancata presentazione); pannello amministratore.
**Sicurezza:** blocco transazionale contro le prenotazioni simultanee, indice univoco sugli orari confermati, fuso Europe/Rome (testato anche nei giorni di cambio d'ora), conversazione unica riutilizzata per lo stesso annuncio, promemoria 24 e 2 ore prima senza duplicati.
**Google Calendar:** tabella `calendar_connections` predisposta; nell'interfaccia lo stato è «non configurato». Per attivarlo servono un progetto Google Cloud con OAuth e l'approvazione del fondatore.

## 6. Fasi 23 e 29 — Assistenza stradale
**Funzionalità:** pagina pubblica con il pulsante «HO BISOGNO DI ASSISTENZA» e avviso di emergenza sempre visibile (112, autostrada, sicurezza); richiesta in tre passaggi su smartphone: tipo di problema (11 casi, tra cui batteria, foratura, incidente, chiavi chiuse, traino), posizione GPS solo con consenso esplicito oppure inserimento manuale, auto dal garage o manuale, targa facoltativa (privata), foto facoltative, destinazione; ricerca degli operatori compatibili per servizio, tipo di veicolo, raggio coperto, disponibilità dichiarata non scaduta e verifica dello staff; invio a più operatori, ciascuno con conversazione dedicata; preventivi con prezzo, uscita, costi aggiuntivi, condizioni e tempo di arrivo dichiarato; accettazione; stati dell'intervento registrati con data e ora; mappa con posizione del veicolo e posizione dell'operatore solo se condivisa durante l'intervento; aggiornamento automatico della pagina ogni 20 secondi (rilegge il database); conferma di conclusione; collegamento alla richiesta di riparazione esistente (Fase 16/18, nessuna seconda procedura).
**Operatori:** registrazione del servizio, interventi, veicoli, H24 o disponibilità per 1–24 ore, sospensione della ricezione, tariffe indicative dichiarate, statistiche.
**Protezione dei dati:** agli operatori contattati solo la zona arrotondata (~1 km); indirizzo, coordinate, telefono e targa solo all'operatore scelto e solo fino alla chiusura; posizione dal vivo cancellata alla consegna o chiusura.

## 7. Fase 28 — Trasporto auto
**Funzionalità:** pagina pubblica e procedura di richiesta (ritiro, consegna, date e flessibilità, priorità programmata o urgente, categoria, marciante o no, condizioni, foto, collegamento all'annuncio acquistato); trasportatori attivi vedono le richieste aperte nelle proprie regioni (senza indirizzi); preventivi con prezzo totale, tipo di trasporto, date, costi aggiuntivi, condizioni, copertura assicurativa (solo se dichiarata e verificata nel profilo) e validità; confronto in tabella; accettazione con apertura della pratica; stati (programmato, ritirato, in corso, consegnato, completato, problema segnalato, annullato); verbali digitali di ritiro e consegna con foto, chilometri, carburante, danni, accessori, persona presente, data e ora (non modificabili); contestazione segnalata allo staff.
**Pagamenti:** non implementati per scelta. Architettura descritta nel §14.

## 8. Fase 24 — Assicurazione auto
**Funzionalità:** pagina informativa con le 9 coperture spiegate in modo semplice e il ruolo di AutoGarage24; elenco dei soli partner verificati; richiesta di preventivo dal veicolo del garage con dati minimi (nessuna storia assicurativa), consenso esplicito per ogni partner scelto con versione del consenso; «Le mie richieste assicurative» con stato per partner, preventivi ricevuti (premio, coperture, franchigie, massimali, esclusioni, durata, validità, link al set informativo) e ritiro o cancellazione dei dati; area del referente partner per aggiornare lo stato e inviare preventivi; pannello amministratore per registrare partner con sezione e numero RUI o codice impresa IVASS, data ed esito della consultazione del registro, informativa privacy, referenti abilitati e integrazioni (solo metadati: le credenziali stanno nelle variabili d'ambiente).
**Garanzie:** un partner non può risultare «verificato» senza registro consultato e informativa privacy (vincolo del database); nessun preventivo può essere creato dalla piattaforma: solo dal partner o da un'integrazione ufficiale attiva; nessun confronto di prezzi simulato.
**Da verificare prima del rilascio commerciale (non risolto dal codice):** il ruolo di AutoGarage24 rispetto alla distribuzione assicurativa (D.Lgs. 209/2005, Regolamento IVASS n. 40/2018), eventuali compensi dai partner, obblighi informativi e accordi di contitolarità o titolarità autonoma GDPR con ciascun partner. Serve un parere legale.

## 9. Fase 25 — Revisioni
**Funzionalità:** pagina pubblica con «Trova un centro revisione» (città, posizione, categoria, mappa) e calcolatore della scadenza; scheda del centro con orari dichiarati, recensioni, distanza, stato dell'autorizzazione e prenotazione (orari reali se configurati, altrimenti data preferita); dashboard del centro (categorie, servizi, autorizzazione da caricare, statistiche, conferma, rifiuto, nuovo orario, esito, mancata presentazione); «Scadenze e storico revisioni» in Il mio Garage (categoria e uso del veicolo, prossima scadenza, storico, registrazione manuale con documento).
**Calcolo delle scadenze (art. 80 D.Lgs. 285/1992):** prima revisione a 4 anni dall'immatricolazione e poi ogni 2 anni; annuale per veicoli oltre 3,5 t, autobus, taxi, NCC e ambulanze; esito «ripetere» entro un mese; esito «sospeso» con circolazione vietata. Scadenza a fine mese. Fonte e data di aggiornamento sempre mostrate; regole modificabili dallo staff in Impostazioni.
**Esiti:** «confermato dal centro» solo per le revisioni completate da un centro sulla piattaforma; quelle inserite dall'utente risultano «dichiarate» o «con documento allegato».
**Promemoria:** l'esito aggiorna il promemoria «revisione» della Fase 20 (30 giorni prima e a scadenza superata); promemoria 24 ore prima dell'appuntamento.

## 10. Fase 26 — Valutazione, vendita e permuta
**Funzionalità:** procedura guidata in 4 passaggi con indicatore di avanzamento e ritorno senza perdita dei dati, anche partendo da un'auto del garage; stima interna preliminare con valore minimo, medio e massimo, metodo, data, numero di annunci comparabili, affidabilità e informazioni mancanti; con meno annunci comparabili della soglia configurata (3) non viene mostrato alcun valore e si chiedono altri dati o una valutazione professionale; richiesta a concessionari e officine verificati con consenso e scelta delle foto; il professionista può chiedere informazioni, rifiutare motivando o proporre valutazione o offerta di acquisto; proposte e controproposte alternate fino all'accettazione; permuta dalla scheda auto con differenza indicativa calcolata dal server sul prezzo reale dell'annuncio, valutazione del venditore, richiesta di ispezione, controproposta; «Le mie valutazioni» (stime, richieste e offerte, permute) e area professionisti con filtri; pannello amministratore con statistiche, proposte anomale (scostamento ≥ 40% dalla stima) e regole della stima in Impostazioni.
**Metodo della stima:** mediana dei prezzi richiesti negli annunci pubblicati o venduti su AutoGarage24 (stessa marca e modello, ±2 anni, stessa alimentazione e cambio se indicati), corretti per età (6%/anno), chilometri (1,5%/10.000 km), condizioni e danni dichiarati. È esplicitamente indicato che i prezzi degli annunci non sono prezzi di vendita effettivi. Nessun listino esterno è collegato.

## 11. Fase 30 — Business Center (`/business`)
**Funzionalità:** dashboard differenziata per tipo di attività e per permessi del ruolo; indicatori reali (visualizzazioni del profilo e degli annunci, contatti, richieste di preventivo, prenotazioni, appuntamenti, da gestire, recensioni, servizi completati, conversioni solo con almeno 5 casi) con periodi Oggi, 7, 30, 90 giorni e personalizzato; CRM che unisce le richieste reali di tutte le fonti (richieste, prenotazioni, soccorso, trasporti, revisioni, valutazioni, permute, offerte) con 7 stati, assegnazione, note interne mai visibili ai clienti e promemoria; attività con scadenza, priorità, assegnazione e notifiche; statistiche (andamento giornaliero, canali, servizi più richiesti, conversioni, annunci più visti, provenienza geografica aggregata con soglia di 3 contatti, recensioni mensili); report stampabile in PDF dal browser ed esportazioni CSV compatibili con Excel (richieste, preventivi, appuntamenti, servizi completati, andamento mensile, annunci) registrate nel registro aziendale; centro di gestione di profilo, servizi, annunci, ricambi, offerte, orari e servizi specializzati; «Migliora la tua presenza su AutoGarage24» con punteggio di completezza e suggerimenti calcolati dai dati, dichiarato come non garanzia di posizionamento.
**Team:** ruoli proprietario, amministratore aziendale, responsabile, dipendente, operatore; 9 permessi granulari; inviti per email, accettazione, revoca, registro non modificabile; un collaboratore autorizzato gestisce le prenotazioni e gli appuntamenti di revisione (azione eseguita per conto del titolare con le stesse regole di disponibilità e registrata), ma non accede alle conversazioni personali del titolare.
**Piani:** Free (attivo, gratuito durante il lancio), Starter, Professional, Business (non attivi, prezzo da definire). Limiti configurabili (annunci, ricambi, collaboratori, offerte attive, storico statistiche, esportazioni, visibilità, funzioni avanzate) verificati lato server da trigger e funzioni.
**Visualizzazioni giornaliere:** registrate da questa versione in poi; per i periodi precedenti non vengono ricostruite né stimate.

## 12. Pagine create
**Pubbliche:** `/offerte`, `/offerte/neopatentati`, `/offerte/[slug]`, `/soccorso-stradale`, `/soccorso-stradale/richiesta`, `/trasporto-auto`, `/trasporto-auto/richiesta`, `/revisione-auto`, `/revisione-auto/[slug]`, `/assicurazione-auto`, `/assicurazione-auto/richiesta`, `/valuta-la-tua-auto`.
**Area personale:** `/dashboard/offerte`, `/dashboard/le-mie-offerte`, `/dashboard/prenotazioni` (+ dettaglio), `/dashboard/disponibilita`, `/dashboard/statistiche-annunci`, `/dashboard/soccorso` (+ dettaglio, `operatore`), `/dashboard/trasporti` (+ dettaglio, `operatore`), `/dashboard/revisioni` (+ dettaglio, `garage`, `centro`), `/dashboard/assicurazioni` (+ dettaglio, `partner`), `/dashboard/valutazioni` (+ dettaglio, `richiesta/[id]`, `professionista`, `professionista/[id]`), `/dashboard/permute/[id]`.
**Business Center:** `/business`, `/business/lead`, `/business/lead/dettaglio`, `/business/prenotazioni`, `/business/attivita`, `/business/statistiche`, `/business/report`, `/business/esporta` (CSV), `/business/gestione`, `/business/presenza`, `/business/team`, `/business/benvenuto`.
**Amministrazione:** `/admin/offerte`, `/admin/impostazioni`, `/admin/prenotazioni`, `/admin/servizi` (operatori, soccorso, trasporti, centri revisione, statistiche), `/admin/assicurazioni`, `/admin/valutazioni`, `/admin/business`.
Menu, piè di pagina e sitemap aggiornati.

## 13. Policy RLS (sintesi)
- 106 nuove policy nelle migrazioni 0020–0023, RLS attiva su ogni nuova tabella, `service_role` con accesso completo solo lato server.
- Utenti: solo le proprie richieste, prenotazioni, valutazioni, richieste assicurative.
- Professionisti: solo le richieste ricevute o rese disponibili dalle regole (operatori contattati, trasportatori attivi nelle regioni, centri scelti, partner con consenso); dati esatti solo dopo la scelta.
- Posizioni, indirizzi, targhe e telefoni in tabelle separate con accesso ristretto.
- Colonne scrivibili dal client limitate per elenco esplicito; stati, verifiche e risultati scritti solo da funzioni del server.
- Bucket privati `service-photos`, `valuation-photos`, `verification-documents` con URL firmati di breve durata; foto dei professionisti visibili solo se condivise esplicitamente.
- Business Center: isolamento per azienda tramite `private.business_can`, note e stati CRM mai leggibili dai clienti.

## 14. Servizi esterni da configurare (nessuno attivato)
| Servizio | Stato | Cosa serve |
|---|---|---|
| Supabase (progetto reale) | 🟠 migrazioni 0004, 0007–0023 da applicare | Conferma del fondatore nel connettore |
| Google Calendar | 🔧 predisposto | Progetto Google Cloud, schermata di consenso OAuth, ID e segreto client come variabili d'ambiente, verifica dell'app Google |
| Integrazioni assicurative | 🔧 predisposto | Contratto con il partner, documentazione API ufficiale, credenziali come variabili d'ambiente, endpoint webhook dedicato |
| Pagamenti (trasporti, abbonamenti) | 🔧 solo architettura | Provider (es. Stripe Connect o equivalente con conti separati per i partner), struttura legale per incassi per conto terzi, condizioni contrattuali, approvazione del fondatore; nessun escrow interno |
| Notifiche push | 🔧 predisposto (Fase 20) | Chiavi VAPID |
| Email transazionali | 🔧 predisposto | Provider e dominio verificato |
| Mappe e geocodifica | ✅ OpenStreetMap/Nominatim per test | Fornitore commerciale per la Beta pubblica (costo da approvare); percorsi e tempi stimati non attivati |
| pg_cron | 🔧 | Estensione attiva sul progetto (job: promemoria prenotazioni, offerte scadute, pulizia soccorso, promemoria revisioni, attività del Business Center) |

## 15. Test eseguiti e risultati
- **Database:** 495 controlli, tutti superati. Nuovi file `60_fasi_21_22_27.sql`, `70_fasi_23_28_29.sql`, `80_fasi_24_25_26.sql`, `90_fase_30.sql` (tra gli altri: approvazione offerte, coupon usati due volte, scadenze, prenotazioni simultanee, fuso orario, test drive senza patente, posizione nascosta ai candidati, transizioni non valide, verbali obbligatori, partner non verificabile senza registro, preventivi solo dai partner, ritiro e cancellazione dei dati, calcolo delle scadenze per categoria ed esito, esiti dichiarati non verificati, stima con dati insufficienti, controproposte alternate, isolamento tra aziende, revoca dei collaboratori, limiti del piano).
- **Unitari:** 143 test (nuovo `tests/unit/fasi-21-30.test.ts`: fuso orario anche nei giorni di cambio d'ora, transizioni del soccorso, etichette e stati).
- **Statici:** TypeScript e lint senza errori né avvisi.
- **Build:** riuscita con tutte le rotte.
- **Collegamenti:** 77 controllati, 0 non funzionanti.
- **Responsive:** soccorso, richiesta di soccorso, trasporto, revisione, assicurazione, valutazione, offerte, auto usate su 1366 px e 390 px: nessun errore JavaScript, nessuno scorrimento orizzontale.
- **Accesso:** tutte le rotte di area personale, Business Center e amministrazione reindirizzano all'accesso senza sessione.

## 16. Problemi ancora aperti
1. Migrazioni non applicate sul progetto Supabase reale (serve la tua conferma).
2. Flussi autenticati da provare end-to-end sull'ambiente reale con utenti di prova (prenotazioni, soccorso con due telefoni, verbali con foto, Business Center con collaboratori).
3. Parere legale su: assicurazioni (IVASS), condizioni del test drive, verbali di trasporto, trattamento delle posizioni, ruolo di intermediario nei servizi.
4. I collaboratori del Business Center non accedono alle conversazioni del titolare (scelta di riservatezza); per rispondere ai messaggi resta necessario il titolare.
5. Le azioni dei collaboratori sulle prenotazioni sono registrate nel registro aziendale; nella cronologia della prenotazione risultano a nome del titolare con la nota «gestita da un collaboratore».
6. Le visualizzazioni giornaliere partono da questa versione: per i periodi precedenti si vedono solo i contatti.
7. La stima interna dipende dagli annunci presenti sulla piattaforma: all'inizio molte valutazioni risulteranno «dati insufficienti» (comportamento voluto).
8. Percorso stradale e tempo di arrivo calcolati non sono attivi: serve un fornitore di routing (costo da approvare).
9. Le sezioni pubbliche di soccorso, trasporti, revisioni e assicurazioni restano vuote finché lo staff non verifica i primi operatori e partner reali.
