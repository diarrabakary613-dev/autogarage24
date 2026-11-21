# Report finale — Fasi 11–20

Data: 19/11/2026. Ambiente: sviluppo locale. **Nulla è stato pubblicato, nessun partner contattato, nessuna comunicazione inviata, nessuna campagna avviata, nessun credito o servizio acquistato, dominio e DNS non toccati.**

## 1. Idoneità alla Beta
**Codice: pronto per una Beta privata su ambiente di prova. Piattaforma: NON pronta per la Beta pubblica.**
Bloccanti fuori dal codice:
1. **Migrazioni non applicate sul Supabase reale** (0004 e 0007–0018): la richiesta di conferma del connettore è scaduta 3 volte senza risposta.
2. Hosting e email non configurati.
3. Revisione legale non fatta ([CONTROLLO_LEGALE_BETA.md](CONTROLLO_LEGALE_BETA.md)).
4. Nessun partner reale e nessun annuncio reale: i criteri di passaggio sono in [GO_TO_MARKET_MILANO.md](GO_TO_MARKET_MILANO.md).

Rapporto iniziale sullo stato reale: [ANALISI_FASI_11_20.md](ANALISI_FASI_11_20.md).

## 2. Cosa è stato realizzato (senza duplicare l'esistente)
| Fase | Realizzato | Riuso dell'esistente |
|---|---|---|
| 11 Beta e partner | `/partner`, `/diventa-partner` (4 percorsi), `/milano`, modulo candidatura e iscrizione Beta salvati nel DB, Founding Partners con badge solo per ammessi, checklist di onboarding per officine/meccanici/ricambisti/concessionari, dashboard fondatore, analytics senza cookie | Candidature confluiscono nel CRM; verifica professionale esistente |
| 12 Marketing | `/admin/marketing` (panoramica, campagne con UTM, creatività/contenuti, calendario mese+lista, generatore di brief a regole, landing con risultati, pubblico, risultati per campagna, esperimenti con test statistico, budget con approvazione del fondatore), 5 landing di campagna con modulo funzionante, 5 documenti marketing | Analytics della Fase 11 |
| 13 Pannello | Notifiche interne allo staff (nuovi professionisti, annunci in revisione/pubblicati, segnalazioni, assistenza, verifiche), ultime registrazioni e attività, `/admin/professionisti` (elenco, approvazione/rifiuto, sospensione/riattivazione, recensioni e segnalazioni), filtri annunci per marca/modello/prezzo/categoria/neopatentati, modifica e rimozione annunci con motivazione | Pannello RBAC Fase 10 |
| 14 CRM | Pipeline a 9 stati (8 richiesti + «in trattativa»), vista a colonne con spostamento, categorie, primo contatto, origine, assegnazione, visite commerciali con referente/auto disponibili/auto per neopatentati/interesse/prossima azione, storico immutabile, dashboard fondatore | **Esteso il Field Manager** (stesse tabelle): un solo CRM |
| 15 Messaggi | Foto profilo degli interlocutori, video negli allegati, riprogrammazione appuntamenti in un passo | Chat realtime, non letti (`last_read_at` = stato di lettura: nessuna tabella `message_read_status` duplicata), annullamento già presente |
| 16 Riparazioni | `/richiedi-intervento` (categorie, auto del garage, km, alimentazione, foto/video, posizione facoltativa ~1 km, disponibilità), officine compatibili per servizio e distanza reale, invio a più officine, preventivi con manodopera/ricambi/extra/tempi/validità sempre indicativi, confronto, accettazione che chiude le altre richieste e avvisa le officine, «Le mie richieste di intervento» | Richieste, preventivi, appuntamenti, chat e recensioni esistenti |
| 17 Ricambi | Tipo di richiesta (informazioni, disponibilità, spedizione, ritiro), info spedizione/ritiro, disponibilità in scheda, preferiti con vincolo | Catalogo, ricerca OEM, compatibilità, moderazione esistenti (nessuna `parts_inquiries` duplicata) |
| 18 Recensioni | Criteri dettagliati (servizio: qualità/professionalità/prezzo; acquisto: descrizione/comunicazione/affidabilità), data dell'esperienza, `review_verifications`, recensioni di acquisto solo con conferma di **entrambe** le parti, controllo testi duplicati, segnale «sospetta» allo staff, rate limit, punteggi immodificabili da chiunque, storico decisioni, reputazione pubblica (media, distribuzione, medie per criterio, risposte), profilo venditore con data di iscrizione e annunci attivi | Risposta unica per recensione già presente (nessuna `review_replies` duplicata) |
| 19 Mappa | `/mappa` unica (officine, meccanici, concessionari, venditori ricambi, auto, ricambi) con indicatori distinti, elenco sincronizzato, filtri distanza/categoria/marca/prezzo/valutazione/disponibilità, ricerca per città/CAP, geolocalizzazione su consenso, modalità «auto per neopatentati vicino a te» (solo esito calcolato), indicazioni stradali per indirizzi pubblici | Leaflet/OSM già presenti; provider documentato in [MAPPE.md](MAPPE.md) |
| 20 Il mio Garage | Riepilogo (veicoli, prossime scadenze), scheda veicolo con scadenze, richieste e officine già contattate, documenti, data di acquisto, «Richiedi un intervento» precompilato, calendario `/dashboard/scadenze`, predisposizione push | Veicoli, storico, documenti privati, promemoria con job giornaliero e scadenze per km già presenti |

## 3. Database
- **0017** (Fasi 11–14): `analytics_events`, `field_contact_history`, `partner_applications`, `founding_partners`, `beta_signups`, `marketing_campaigns`, `marketing_items`, `growth_experiments`, `ad_budget_entries`, `marketing_status_history`, estensione di `field_contacts`/`field_visits`; funzioni `submit_partner_application`, `join_beta`, `track_event`, `admin_review_application`, `admin_set_founding_partner`, `founding_partner_profiles`, `admin_edit_listing`, `admin_delete_listing`, `admin_recent_activity`, `admin_growth_stats`; notifiche allo staff; nuovi permessi `acquisition.manage`, `marketing.manage`, `analytics.view`. Corretti 3 errori (chiave categorie, vincoli duplicati, permessi del ruolo di servizio).
- **0018** (Fasi 15–20): `repair_requests`, `review_verifications`, `review_history`, `push_subscriptions`; colonne su `requests`, `quotes`, `reviews`, `part_listings`, `notification_preferences`; funzioni `create_repair_request`, `match_workshops`, `dispatch_repair_request`, `cancel_repair_request`, `send_quote_detailed`, `reschedule_appointment`, `counterpart_avatars`, `confirm_vehicle_purchase`, `profile_reputation`, `map_search`, `vehicle_contacted_professionals`; approvazione delle spese solo per il Super Admin.
- RLS attiva su tutte le nuove tabelle; nessuna tabella pubblica leggibile senza regola.

## 4. Test eseguiti
| Controllo | Risultato |
|---|---|
| TypeScript, ESLint | ✅ nessun errore né avviso |
| Test del codice (Vitest) | ✅ 122/122 (17 nuovi: generatore di brief, significatività, CRM, video, categorie) |
| Test del database (18 migrazioni) | ✅ **296** controlli in 5 suite (94 nuovi), tra cui il **percorso completo** cliente → 2 officine → 2 preventivi → confronto → accettazione → chiusura dell'altra → appuntamento → riprogrammazione, con account separati |
| Build di produzione | ✅ 115 percorsi applicativi |
| Collegamenti interni | ✅ 58 controllati, 0 non funzionanti |
| Browser (Chrome) desktop 1440 px e smartphone 390 px, 11 nuove pagine | ✅ nessun errore applicativo, nessuno scorrimento orizzontale, un solo H1; corretto un bug (titolo della hero invisibile) |
| Aree protette | ✅ `/admin/acquisizione`, `/admin/marketing/*`, `/dashboard/richieste-intervento` → accesso richiesto |
| Validazione modulo partner | ✅ errori mostrati sui campi |

Simulazioni della Fase 12 (cliente, neopatentato, concessionario, officina, meccanico, ricambista, amministratore): eseguite **sul database locale** con account separati e dati isolati (le suite vengono annullate a fine test). **Non** eseguite sul Supabase reale né con email vere: nessun dato di prova è stato scritto nel database pubblico.

## 5. Problemi aperti
1. Migrazioni da applicare (vedi §1).
2. Nessun test end-to-end nel browser con utenti autenticati (servono database reale ed email).
3. Higgsfield: il connettore non genera contenuti → nessun asset prodotto; brief e prompt pronti in [CREATIVE_GUIDELINES.md](CREATIVE_GUIDELINES.md).
4. Geocodifica Nominatim e tile OSM: adatte alla Beta, non al traffico elevato.
5. Notifiche push predisposte ma non attive.
6. «Visitatori» in Analytics = ingressi, non persone uniche (scelta di privacy).
7. Recensioni dei venditori privati non previste (solo professionisti con profilo).
8. Pagine con indirizzo inesistente: codice 200 con noindex (limite noto).

## 6. Costi eventualmente necessari (nessuno attivato)
| Voce | Quando | Note |
|---|---|---|
| Supabase Pro | Beta pubblica (backup, nessuna pausa) | Prezzo da verificare |
| Provider email | Prima della Beta privata | Piano gratuito con limiti, poi a pagamento |
| Tile/geocodifica commerciali | Prima della Beta pubblica o con traffico | Piani gratuiti con quote |
| Pubblicità | Beta pubblica | Proposta 500–800 € nel primo mese, da approvare |
| Crediti Higgsfield | Produzione video | 10 crediti disponibili; nessun acquisto senza approvazione |
| Consulenza legale | Prima di ogni apertura | Da preventivare |

## 7. Attività che richiedono il fondatore
- Confermare l'applicazione delle migrazioni (accettando le richieste del connettore).
- Approvare hosting, provider email, DNS, eventuali piani a pagamento.
- Incaricare il legale e approvare i testi definitivi.
- Nominarsi Super Admin (`npm run admin:bootstrap`), approvare le spese pubblicitarie.
- Contattare i partner (script e materiali pronti), raccogliere le autorizzazioni per foto e annunci.
- Generare gli asset in Higgsfield con i prompt forniti e registrarne i diritti.
- Decidere il passaggio alla Beta pubblica in base ai criteri.
