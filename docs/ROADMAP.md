# Roadmap

Aggiornata al 19/11/2026 (Fasi 11–20: vedi docs/REPORT_FASI_11_20.md). "Sviluppata" = codice scritto, compilato e testato in locale (unit test + test del database su PostgreSQL). "Da verificare online" = manca il test con il database Supabase reale e un browser collegato (impossibile da questo ambiente, vedi report).

| Fase | Contenuto | Stato |
|---|---|---|
| 1 | Fondamenta: architettura, database, autenticazione, ruoli, sicurezza, design system | ✅ Completata |
| 2 | Homepage commerciale e pagine pubbliche, SEO | ✅ Completata |
| 3 | Marketplace auto: ricerca, filtri, schede, foto, preferiti, richieste, appuntamenti, dashboard venditore, moderazione | ✅ Sviluppata · da verificare online |
| 4 | Neopatentati: regole versionate con fonti ufficiali, calcolatore, ricerca per compatibilità, confronto, profilo, backoffice regole | ✅ Sviluppata · da verificare online · revisione legale consigliata |
| 5 | Garages e officine: ricerca, mappa, profili, servizi, preventivi, appuntamenti, recensioni, registrazione e verifica | ✅ Sviluppata · da verificare online |
| 6 | Meccanici indipendenti: modalità di intervento, zone, collegamento con officine, certificazioni verificate | ✅ Sviluppata · da verificare online |
| 7 | Ricambi: catalogo, ricerca per codice OEM e per auto, compatibilità trasparente, dashboard venditore | ✅ Sviluppata · da verificare online |
| 8 | Manutenzione: garage virtuale, storico con provenienza, documenti privati, promemoria con job giornaliero, chilometraggio, costi, assistenza | ✅ Sviluppata · da verificare online |
| 9 | Messaggistica in tempo reale, notifiche, preferenze, attività, supporto, email (coda + funzione di invio) | ✅ Sviluppata · email da configurare |
| 10 | Pannello completo (RBAC), CMS, Field Manager, segnalazioni, GDPR, monitoraggio, documentazione di lancio | ✅ Sviluppata · lancio NON autorizzato |
| 11 | Beta Milano: pagine partner, candidature, Founding Partners, onboarding, analytics, go-to-market | ✅ Sviluppata · nessun partner contattato |
| 12 | Centro marketing, calendario, brief, landing di campagna, esperimenti, budget | ✅ Sviluppata · nessuna campagna avviata; Higgsfield non genera via connettore |
| 13 | Pannello: notifiche staff, professionisti, attività recenti, gestione annunci | ✅ Sviluppata |
| 14 | CRM partner unico (esteso dal Field Manager) | ✅ Sviluppata |
| 15 | Messaggi: avatar, video, riprogrammazione appuntamenti | ✅ Sviluppata |
| 16 | Richieste di intervento a più officine e preventivi dettagliati | ✅ Sviluppata · testata a livello database |
| 17 | Ricambi: tipi di richiesta, spedizione/ritiro | ✅ Sviluppata |
| 18 | Recensioni verificate e reputazione | ✅ Sviluppata |
| 19 | Mappa unica e geolocalizzazione | ✅ Sviluppata · geocodifica non testabile offline |
| 20 | Il mio Garage: scheda veicolo, scadenze, predisposizione push | ✅ Sviluppata |
| 21 | Offerte, promozioni e coupon | ✅ Sviluppata |
| 22 | Trova la tua auto (video, verifiche, storico prezzi, distanza, confronto a 4) | ✅ Sviluppata |
| 23 | Assistenza stradale | ✅ Sviluppata |
| 24 | Assicurazione auto (informazione e contatti) | ✅ Sviluppata · 🟠 partner autorizzati e parere legale |
| 25 | Revisioni e scadenze art. 80 CdS | ✅ Sviluppata |
| 26 | Valutazione, vendita e permuta | ✅ Sviluppata |
| 27 | Prenotazioni e test drive | ✅ Sviluppata · 🔧 Google Calendar predisposto |
| 28 | Trasporto auto | ✅ Sviluppata · 🔧 pagamenti solo predisposti |
| 29 | Potenziamento assistenza stradale | ✅ Integrato nella Fase 23 |
| 30 | Business Center | ✅ Sviluppata · 🔧 piani a pagamento non attivi |
| 31 | AutoGarage24 Rewards | ✅ Sviluppata · ⚖️ spenta fino a regolamento e verifiche (DPR 430/2001) |
| 32 | Growth Engine | ✅ Sviluppata · 🟠 provider email; automazioni spente |
| 33 | SEO Engine e blog | ✅ Sviluppata · 🔧 Search Console |
| 34 | Audit, sicurezza, GDPR, rilascio | ✅ Completato · verdetto PRONTO CON LIMITAZIONI |
| 35 | Final Launch: audit finale, assistenza, cruscotto KPI, deploy, manuali, piano Milano | ✅ Completato · verdetto PRONTO CON LIMITAZIONI · lancio pubblico in attesa di approvazione |

## Prossimi passi (richiedono il fondatore)
1. ~~Applicare le migrazioni 0004 e 0007–0028~~ — fatto il 20/11/2026 sul progetto reale (database vuoto); verificato per impronta e advisors.
2. Configurare `.env` di produzione e verificare il piano Hostinger (vedi DEPLOYMENT).
3. Scegliere e configurare il provider email (vedi EMAIL).
4. Far rivedere da un legale: informativa privacy, cookie, termini, normativa neopatentati.
5. Test end-to-end con utenti reali sull'ambiente di prova, poi decisione di lancio.
