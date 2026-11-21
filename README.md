# AutoGarage24

Ecosistema digitale che mette in contatto proprietari di automobili, neopatentati, officine, meccanici indipendenti, venditori di auto e venditori di ricambi. Mercato iniziale: Milano e provincia.

> **Stato attuale (19/11/2026): Fasi 1–20 sviluppate nel codice e testate in locale. NON ancora online.**
> Prima del lancio servono: applicazione della migrazione 0030 (in attesa della tua conferma), configurazione di email e hosting, test end-to-end reali, revisione legale. Stato complessivo: [`docs/LAUNCH_READINESS_REPORT.md`](docs/LAUNCH_READINESS_REPORT.md). Tutto è elencato in [`docs/LAUNCH_CHECKLIST.md`](docs/LAUNCH_CHECKLIST.md) e nei report [Fasi 3–10](docs/REPORT_FASI_3_10.md) e [Fasi 11–20](docs/REPORT_FASI_11_20.md).

## Cosa fa la piattaforma

| Area | Indirizzo | Cosa c'è |
|---|---|---|
| Marketplace auto | `/auto-usate`, `/auto/[slug]` | Ricerca con 15 filtri combinabili e URL condivisibili, ordinamento, paginazione, scheda con galleria a schermo intero, caratteristiche tecniche, venditore, ispezioni, contatto, preferiti, confronto, segnalazione |
| Neopatentati | `/auto-per-neopatentati`, `/confronta` | Calcolatore con regole versionate e fonti ufficiali, ricerca per compatibilità, verifica sulla scheda, confronto fino a 3 auto, profilo neopatentato |
| Officine | `/garages`, `/garages/[slug]` | Ricerca per città, CAP, servizio, marca, verificati, posizione (solo su richiesta), mappa OpenStreetMap, profilo pubblico, preventivi e appuntamenti |
| Meccanici | `/meccanici`, `/meccanici/[slug]` | Come sopra, con modalità di intervento e zone servite (indirizzo privato mai esposto) |
| Ricambi | `/ricambi`, `/ricambi/[slug]`, `/venditori-ricambi/[slug]` | Ricerca per nome, codice OEM/produttore, categoria, automobile del garage; compatibilità «verificata / potenziale / da verificare» |
| Area personale | `/dashboard/...` | Annunci, richieste, preventivi, appuntamenti, messaggi in tempo reale con allegati, notifiche, preferiti, garage virtuale, manutenzione, documenti, costi, assistenza, privacy |
| Professionisti | `/professionisti/registrazione-*`, `/dashboard/garage`, `/meccanico`, `/venditore-ricambi` | Registrazione salvabile in bozza, verifica documentale, servizi, statistiche reali, recensioni autentiche |
| Beta e partner | `/milano`, `/partner`, `/diventa-partner`, landing di campagna | Candidature, iscrizione Beta, Founding Partners, onboarding |
| Interventi e mappa | `/richiedi-intervento`, `/mappa` | Richieste a più officine, confronto preventivi, mappa unica con modalità neopatentati |
| Pannello | `/admin/...` | Statistiche, utenti e ruoli (RBAC), moderazione, verifiche, segnalazioni, recensioni, assistenza, Field Manager, regole neopatentati, contenuti del sito, categorie, piani (non attivi), GDPR, email, registro attività |

Nessun annuncio, recensione, professionista o statistica è inventato: dove mancano dati, le pagine mostrano uno stato vuoto.

## Avvio rapido (sviluppatori)

Requisiti: Node.js 20.9+ (consigliato 22). Per i test del database: PostgreSQL 15+.

```bash
npm install
cp .env.example .env.local   # inserisci URL e chiave pubblica Supabase: vedi docs/ENVIRONMENT.md
npm run dev                  # http://localhost:3000
```

## Comandi utili

| Comando | A cosa serve |
|---|---|
| `npm run dev` | Avvia il sito in sviluppo |
| `npm run build` / `npm start` | Crea e avvia la versione di produzione |
| `npm run check` | **Tutti** i controlli: tipi, lint, test, test database, build |
| `npm test` | Test automatici del codice (159) |
| `npm run test:db` | Applica le 30 migrazioni a un database temporaneo e verifica regole di sicurezza, flussi e audit (665 controlli) |
| `npm run predeploy` | Controlli prima di ogni pubblicazione (variabili, segreti, audit, test, build) |
| `npm run smoke -- https://<dominio>` | Controlli di sola lettura sul sito pubblicato |
| `npm run test:concurrency` | Riscatti Rewards con due sessioni simultanee (4 controlli) |
| `npm run check:links -- http://localhost:3000` | Controlla i collegamenti interni (con il sito avviato) |
| `bash scripts/gen-types.sh` | Rigenera i tipi TypeScript dallo schema |
| `npm run admin:bootstrap -- email@esempio.it` | Nomina il primo amministratore (una sola volta) |

## Documentazione

| Documento | Contenuto |
|---|---|
| [docs/AUDIT_FASE_34.md](docs/AUDIT_FASE_34.md) | **Audit completo e verdetto di rilascio** |
| [docs/REPORT_FASI_31_34.md](docs/REPORT_FASI_31_34.md) | Report Fasi 31–34: Rewards, Growth, SEO, audit |
| [docs/BACKUP_RESTORE.md](docs/BACKUP_RESTORE.md) | Backup e ripristino |
| [docs/REPORT_FASI_11_20.md](docs/REPORT_FASI_11_20.md) | **Report Fasi 11–20**: idoneità Beta, funzioni, test, costi |
| [docs/GO_TO_MARKET_MILANO.md](docs/GO_TO_MARKET_MILANO.md) | Strategia di lancio e piano di 30 giorni |
| [docs/MATERIALI_COMMERCIALI.md](docs/MATERIALI_COMMERCIALI.md) | Presentazioni, script, email, WhatsApp, FAQ, onboarding |
| [docs/MARKETING_STRATEGY.md](docs/MARKETING_STRATEGY.md) · [CREATIVE_GUIDELINES](docs/CREATIVE_GUIDELINES.md) · [ADVERTISING](docs/ADVERTISING_STRATEGY.md) · [CALENDARIO](docs/CONTENT_CALENDAR.md) · [ESPERIMENTI](docs/GROWTH_EXPERIMENTS.md) | Marketing e brief Higgsfield |
| [docs/CONTROLLO_LEGALE_BETA.md](docs/CONTROLLO_LEGALE_BETA.md) | Punti da far verificare al legale |
| [docs/REPORT_FASI_3_10.md](docs/REPORT_FASI_3_10.md) | Report Fasi 3–10 |
| [docs/LAUNCH_READINESS_REPORT.md](docs/LAUNCH_READINESS_REPORT.md) | Rapporto di prontezza al lancio (Fase 35) |
| [docs/LAUNCH_CHECKLIST.md](docs/LAUNCH_CHECKLIST.md) | Checklist di lancio con stato di ogni voce |
| [docs/manuali/](docs/manuali/README.md) | Manuali per amministratori, officine, concessionari, venditori e clienti |
| [docs/ONBOARDING_OFFICINE.md](docs/ONBOARDING_OFFICINE.md), [docs/PIANO_LANCIO_MILANO.md](docs/PIANO_LANCIO_MILANO.md), [docs/PACCHETTO_LANCIO.md](docs/PACCHETTO_LANCIO.md) | Onboarding dei partner, piano di lancio, testi di brand |
| [docs/CHECKLIST_LEGALE_AMMINISTRATIVA.md](docs/CHECKLIST_LEGALE_AMMINISTRATIVA.md), [docs/INCIDENTI_E_CONTINUITA.md](docs/INCIDENTI_E_CONTINUITA.md) | Verifiche legali e fiscali; incidenti e continuità |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Guida al pannello per il fondatore, passo per passo |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hosting (Hostinger), variabili, migrazioni, rollback |
| [docs/EMAIL.md](docs/EMAIL.md) | Email transazionali: provider, DNS, costi |
| [docs/NEOPATENTATI_LEGISLAZIONE.md](docs/NEOPATENTATI_LEGISLAZIONE.md) | Normativa implementata, fonti, punti da verificare |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Organizzazione del codice |
| [docs/DATABASE.md](docs/DATABASE.md) | Tabelle, migrazioni, regole di accesso |
| [docs/SECURITY.md](docs/SECURITY.md) | Misure di sicurezza e privacy |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Variabili d'ambiente |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Stato delle fasi |
| [docs/TEST_REPORT.md](docs/TEST_REPORT.md) | Test eseguiti e risultati |
| [docs/MEDIA.md](docs/MEDIA.md), [docs/CONTENUTI.md](docs/CONTENUTI.md) | Foto/video con diritti d'uso, testi e contenuti |

## Fasi 21–30
Offerte e coupon, «Trova la tua auto», prenotazioni e test drive, assistenza stradale, trasporto auto, assicurazione auto (informazione e contatti), revisioni, valutazione e permuta, Business Center. Rapporto completo: [docs/REPORT_FASI_21_30.md](docs/REPORT_FASI_21_30.md). Migrazioni: 23 (0019–0023 nuove).

## Fasi 31–34
AutoGarage24 Rewards (punti, livelli, premi dei partner, inviti; spento fino alle verifiche normative), Growth Engine (Growth Center, landing A/B, email con consenso, automazioni, pixel con consenso), SEO Engine (sitemap dinamica, meta, redirect, blog, pagine locali), audit completo. Rapporto: [docs/REPORT_FASI_31_34.md](docs/REPORT_FASI_31_34.md) · verdetto: [docs/AUDIT_FASE_34.md](docs/AUDIT_FASE_34.md). Migrazioni: 28 (0024–0028 nuove).

## Fase 35 — Final Launch
Audit finale, centro assistenza (`/assistenza`), categorie Reclamo e Supporto partner, cruscotto di lancio con dati reali (`/admin/lancio`), script `predeploy` e `smoke`, manuali, piano di lancio a Milano, pacchetto di brand, checklist legale, continuità operativa. Rapporto: [docs/LAUNCH_READINESS_REPORT.md](docs/LAUNCH_READINESS_REPORT.md). Migrazioni: 30 (0030 nuova, **non ancora applicata** al progetto reale).
