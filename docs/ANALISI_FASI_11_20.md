# Rapporto iniziale — stato reale prima delle Fasi 11–20

Data: 19/11/2026. Fatto rileggendo il codice, lo schema e i risultati dei test, senza dare per scontato che le Fasi 1–10 siano complete.

## Cosa funziona davvero (verificato in locale)
| Area | Stato | Prova |
|---|---|---|
| Database (16 migrazioni, RLS su tutte le tabelle) | ✅ locale | 202 controlli su PostgreSQL |
| Autenticazione (registrazione, accesso, recupero) | ✅ codice | Reindirizzamenti verificati; email reali **non** provate |
| Dashboard utente e professionista | ✅ codice | Build e pagine protette |
| Pannello amministrativo con permessi per ruolo | ✅ codice | Test permessi per ruolo nel database |
| Responsive | ✅ | 9 pagine su desktop e smartphone |
| Sicurezza | ✅ locale | RLS, colonne private, rate limit, audit |

## Cosa NON è verificato o manca
| Problema | Impatto | Gravità |
|---|---|---|
| Sul progetto Supabase reale mancano 11 migrazioni (0004, 0007–0016): conferma del connettore senza risposta (3 tentativi) | Il sito reale oggi **non può** funzionare oltre a registrazione e profili | **Bloccante** |
| Nessun deploy | Nessuno può usarlo | Bloccante per la Beta |
| Email non configurate | Conferma registrazione con limiti bassi di Supabase; nessuna notifica email | Alta |
| Nessun test end-to-end con utenti reali | Possibili errori non visti in locale | Alta |
| Coordinate dei professionisti inserite a mano | Ricerca per distanza incompleta | Media |
| Pagine legali in bozza | Non si può aprire al pubblico | Bloccante per la Beta pubblica |

## Sovrapposizioni tra le nuove fasi e quanto esiste
Le Fasi 13–20 chiedono molte cose **già realizzate** nelle Fasi 3–10. Per non duplicare tabelle e funzioni:

| Fase | Già presente | Da aggiungere |
|---|---|---|
| 13 Pannello | statistiche, utenti, moderazione, verifiche, segnalazioni, recensioni, audit | elenco officine e professionisti con sospensione, filtri marca/modello/prezzo, ultime registrazioni e attività, **notifiche allo staff** |
| 14 CRM | Field Manager (`field_contacts`, `field_visits`) | pipeline a 8 stati, categorie, data primo contatto, dati della visita commerciale, storico modifiche, dashboard fondatore. **Un solo sistema**: si estende il Field Manager |
| 15 Messaggi | conversazioni, partecipanti, messaggi, realtime, notifiche, blocchi, rate limit; lettura tramite `last_read_at` | foto profilo nell'elenco, modifica e annullamento appuntamenti. `message_read_status` **non** viene creata: lo stato di lettura per partecipante esiste già |
| 16 Riparazioni | richieste, preventivi, appuntamenti, allegati | invio a **più officine** compatibili, preventivo con manodopera/ricambi/tempi/indicativo, confronto e chiusura automatica delle altre richieste, allegati video |
| 17 Ricambi | categorie, annunci, foto, compatibilità, preferiti, richieste | tipo di richiesta (info, disponibilità, spedizione, ritiro), categorie mancanti. Nessuna tabella `parts_inquiries` separata: si usano le richieste esistenti |
| 18 Recensioni | recensioni solo dopo intervento completato, risposta unica, segnalazioni, moderazione | valutazioni dettagliate, data dell'esperienza, recensioni del **venditore** dopo acquisto confermato da entrambe le parti, `review_verifications`, storico, controllo duplicati |
| 19 Mappa | mappa officine/meccanici, posizione su consenso | mappa unica con auto, ricambi e professionisti, filtri, modalità neopatentati, indicazioni stradali, provider configurabile |
| 20 Il mio Garage | veicoli, storico, documenti, promemoria con job, km, costi | scheda riepilogativa del veicolo, officine già contattate, scadenze per chilometraggio già presenti |

## Decisioni
- Non si riscrive nulla di esistente; le nuove funzioni sono migrazioni aggiuntive (0017–0019).
- Higgsfield: il connettore disponibile **legge** catalogo, crediti (10, piano "ultra") e generazioni, ma **non può generare**. Nessun asset è stato generato; preparo brief e prompt pronti.
- I test "con account separati" si fanno sul database **locale** con utenti simulati: sul database pubblico non vanno messi dati di prova (requisito della Fase 11).
