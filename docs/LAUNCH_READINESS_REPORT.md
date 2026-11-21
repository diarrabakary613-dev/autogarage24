# AutoGarage24 — Launch Readiness Report (Fase 35)

Data: 20/11/2026 · Ambito: Milano · Ambiente verificato: codice locale + progetto Supabase `mcjlyqplfiyhrxvazzzk` (via strumenti di gestione).

## Verdetto: 🟠 PRONTO CON LIMITAZIONI

Il software è completo, testato e pronto per una **Beta privata** su un ambiente di prova. **Non** è pronto per l'apertura al pubblico: mancano configurazioni esterne (email, hosting, dominio), test end-to-end con utenti reali e la revisione legale. Nessuna di queste è un difetto del codice, ma ognuna è bloccante per il pubblico.

Legenda: ✅ verificato · 🔧 da fare · 🟠 richiede approvazione · ⚖️ richiede un professionista · ❓ non verificato.

## 1. Stato generale
| Area | Stato |
|---|---|
| Codice applicativo | ✅ completo per le fasi 1–35 |
| Database di produzione | ✅ 29 migrazioni applicate · 🟠 0030 in attesa |
| Problemi P0 (bloccanti del codice) | ✅ nessuno |
| Problemi P1 (bloccanti esterni) | 🔧 10, elencati al §11 |
| Utenti, annunci, partner reali | 0 — nessun dato di prova inserito in produzione |

## 2. Frontend
- ✅ 46 pagine pubbliche controllate con browser automatico su desktop (1366 px) e telefono (390 px): nessun errore in console, nessuno scorrimento orizzontale, un solo titolo H1 per pagina, anche con il database irraggiungibile.
- ✅ Homepage con CTA **«Trova la tua prima auto»**; schede auto con prezzo, km, città e badge neopatentati; **stato vuoto onesto** al posto di annunci fittizi.
- ✅ Nuova pagina `/assistenza` (canali, domande frequenti, avviso quando mancano i contatti ufficiali); `/contatti` aggiornata; link nel footer.
- ❓ Le aree con accesso (cliente, professionista, admin) non sono state percorse con un account reale: l'ambiente di lavoro non raggiunge Supabase (vedi §9).
- ❓ Dispositivi reali (iPhone, Android) non provati.

## 3. Backend
- ✅ Azioni server con validazione, limiti di frequenza su richieste, messaggi e ticket; nessuna chiave privilegiata nel frontend.
- ✅ `/api/health` controlla applicazione e database.
- ✅ Ticket: nuove categorie **Reclamo** e **Supporto partner** (codice + 0030).
- 🔧 Funzione email `send-emails` pronta ma **non distribuita** (mancano provider e secret).
- 🔧 Google Calendar e notifiche push non attivi (facoltativi).

## 4. Database
- ✅ 29 migrazioni applicate al progetto reale, verificate per impronta; tipi TypeScript rigenerati dal progetto reale.
- ✅ RLS su tutte le tabelle; privilegi minimi su viste e funzioni (0029).
- ✅ pg_cron attivo con 11 job.
- 🟠 **0030** `launch_support_kpi` (vincolo delle categorie ticket, avvisi allo staff, funzione `admin_launch_kpis`): testata in locale, **non applicata**. Non distruttiva: sostituisce un vincolo di controllo e una funzione, aggiunge una funzione.
- 🔧 Piano Free: nessun backup scaricabile garantito → `pg_dump` manuale o piano Pro (🟠 costo).

## 5. Sicurezza
- ✅ `npm audit --omit=dev`: 0 vulnerabilità (20/11/2026).
- ✅ Intestazioni di sicurezza (CSP, X-Frame-Options, nosniff, HSTS), nessun `X-Powered-By`: controllate dallo smoke test in locale.
- ✅ Advisors Supabase: nessun ERROR (20/11/2026); avvisi residui motivati in AUDIT_FASE_34 §16.
- ✅ `admin_launch_kpis` negata a clienti e anonimi (test).
- ⚖️ Test di penetrazione esterno consigliato prima del pubblico.
- 🔧 Nessun cambio email in autonomia per gli utenti (P3, da fare tramite assistenza).

## 6. SEO
- ✅ Metadata, canonical, Open Graph, sitemap dinamica (ora con `/assistenza`), robots con `/admin` escluso, dati strutturati solo da dati reali, pagine 404 corrette.
- 🔧 Search Console e invio della sitemap dopo il dominio.
- 🔧 Primi articoli reali del blog.

## 7. Prestazioni
- ✅ Build di produzione superata; immagini con `next/image`; pagine pubbliche con cache.
- ❓ **PageSpeed / Core Web Vitals non misurati**: richiedono il sito pubblicato su un indirizzo raggiungibile. Da eseguire sull'ambiente di prova.

## 8. Integrazioni
| Integrazione | Stato |
|---|---|
| Supabase (database, auth, storage, realtime, cron) | ✅ configurato · 🔧 URL di Auth e SMTP per il dominio |
| Email transazionali (Resend o altro) | 🟠 non configurato |
| Hosting Hostinger (Web App Node.js) | 🔧 compatibilità da verificare in hPanel |
| Dominio, DNS, SPF/DKIM/DMARC | 🟠 non modificati |
| Mappe (OpenStreetMap) | ✅ per la Beta · 🟠 fornitore commerciale per il pubblico |
| GA4 / pixel | Spenti (si attivano solo con ID e consenso) |
| Pagamenti | Non presenti, per scelta |
| Rewards | Spento fino al parere legale e fiscale |

## 9. Test
| Test | Risultato |
|---|---|
| Typecheck | ✅ superato |
| Lint | ✅ superato |
| Unit test | ✅ 159/159 |
| Test del database (30 migrazioni su PostgreSQL 16) | ✅ 665 controlli superati, di cui 12 nuovi della Fase 35 |
| Build di produzione | ✅ superata |
| `npm run predeploy` | ✅ superato (con variabili pubbliche di prova) |
| Smoke test sul sito locale | ✅ tutto superato tranne `/api/health` (nessun database locale: atteso) |
| Controllo visivo 46 pagine × 2 formati | ✅ |
| **End-to-end con Supabase reale e utenti reali** | ❓ **non eseguito**: l'ambiente di lavoro non raggiunge `*.supabase.co`. Da fare dal tuo computer o dall'ambiente di prova |
| PageSpeed | ❓ non eseguito |
| Prova di ripristino del backup | ❓ non eseguita |

## 10. Configurazioni mancanti
1. Variabili d'ambiente sull'hosting (§3 di DEPLOYMENT).
2. Supabase Auth: Site URL, Redirect URL, SMTP personalizzato.
3. Secret della funzione email (`RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `CRON_SECRET`) e pianificazione.
4. Contatti ufficiali (`contactEmail`, `contactPhone` in `src/config/site.ts`): oggi vuoti, **non inventati**.
5. Dati societari nelle note legali e nel footer.
6. Primo amministratore (`npm run admin:bootstrap`).
7. Servizio di uptime su `/api/health`.
8. Contatti di emergenza (INCIDENTI_E_CONTINUITA §5).

## 11. Problemi aperti
| # | Priorità | Problema | Chi |
|---|---|---|---|
| 1 | P1 | Test end-to-end con utenti reali mai eseguiti | Fondatore + tecnico |
| 2 | P1 | Email non configurate (provider, DNS, SMTP, funzione) | 🟠 |
| 3 | P1 | Pagine legali in bozza | ⚖️ |
| 4 | P1 | Hosting da verificare e configurare | 🔧 / 🟠 |
| 5 | P1 | Dominio e HTTPS | 🟠 |
| 6 | P1 | Nessun ambiente di staging | 🟠 |
| 7 | P1 | Migrazione 0030 non applicata | 🟠 |
| 8 | P1 | Backup non garantiti sul piano Free; ripristino mai provato | 🟠 / 🔧 |
| 9 | P1 | Contatti ufficiali e dati societari assenti | Fondatore |
| 10 | P1 | Primo amministratore non creato | Fondatore |
| 11 | P2 | PageSpeed non misurato; dispositivi reali non provati | 🔧 |
| 12 | P2 | Fornitore mappe commerciale per il pubblico | 🟠 |
| 13 | P3 | Nessun cambio email in autonomia; nessun banner di avviso incidenti | 🔧 |

## 12. Approvazioni richieste
Nessuna di queste operazioni è stata eseguita.
| # | Operazione | Tipo | Effetto |
|---|---|---|---|
| A1 | Applicare la migrazione **0030** al progetto reale | Produzione, non distruttiva | Abilita Reclamo/Supporto partner e il cruscotto `/admin/lancio` |
| A2 | Creare un **progetto Supabase di staging** | Nuovo servizio (gratuito sul Free, entro i limiti dell'organizzazione) | Ambiente di prova separato |
| A3 | Passare la produzione al **piano Supabase Pro** | Costo mensile | Backup giornalieri, niente pausa |
| A4 | Configurare l'**hosting** (Web App Node.js) ed eventualmente cambiare piano | Possibile costo | Sito raggiungibile |
| A5 | Scegliere e collegare il **dominio**, modificare i **DNS** | DNS | Indirizzo definitivo, HTTPS |
| A6 | Attivare il **provider email** e i record SPF/DKIM/DMARC | Costo possibile + DNS | Email di conferma e notifiche |
| A7 | Creare il **primo amministratore** | Produzione | Accesso al pannello |
| A8 | Affidare la **revisione legale** e fiscale | Costo professionale | Pagine legali definitive |
| A9 | Pubblicare **email e telefono ufficiali** | Contenuto pubblico | Contatti in `/assistenza` e `/contatti` |
| A10 | **Fornitore mappe** commerciale | Costo | Necessario per traffico pubblico |
| A11 | Elenco dei **partner da contattare** e messaggi da usare | Contatto esterno | Avvio della Fase A |
| A12 | **Budget pubblicitario** | Costo | Solo in Fase B |
| A13 | **Lancio pubblico** (apertura e indicizzazione) | Irreversibile in pratica | Servizio accessibile a tutti |

## 13. Procedura di pubblicazione
Passo per passo in [DEPLOYMENT §5](DEPLOYMENT.md): `npm run predeploy` → backup → migrazioni (staging, poi produzione) → repository privato → Web App → variabili → build → `npm run smoke -- <url>` → primo amministratore → controlli manuali → dominio e HTTPS → checklist. Rollback in DEPLOYMENT §7; incidenti in [INCIDENTI_E_CONTINUITA](INCIDENTI_E_CONTINUITA.md).

Ordine consigliato: **A1, A2 → A4 → A7 → test end-to-end sullo staging → A6 → A5 → A8, A9 → Beta privata (A11) → A13**.

## 14. Piano dei primi 30 giorni
Dettaglio in [PIANO_LANCIO_MILANO](PIANO_LANCIO_MILANO.md):
- **Settimana 1**: hosting e staging, email, primo amministratore, test end-to-end; lista di 60–80 partner potenziali approvata.
- **Settimana 2**: correzioni; dominio e DNS; 20–30 telefonate e 8–10 visite.
- **Settimana 3**: Beta privata in produzione; onboarding dei primi 5–10 partner ([checklist](ONBOARDING_OFFICINE.md)) e prime auto reali.
- **Settimana 4**: monitoraggio, prova di ripristino, revisione con `/admin/lancio`, decisione sulla Fase B.

## Documenti prodotti nella Fase 35
Manuali e guide ([docs/manuali/](manuali/README.md)), [ONBOARDING_OFFICINE](ONBOARDING_OFFICINE.md), [PIANO_LANCIO_MILANO](PIANO_LANCIO_MILANO.md), [PACCHETTO_LANCIO](PACCHETTO_LANCIO.md), [CHECKLIST_LEGALE_AMMINISTRATIVA](CHECKLIST_LEGALE_AMMINISTRATIVA.md), [INCIDENTI_E_CONTINUITA](INCIDENTI_E_CONTINUITA.md), [DEPLOYMENT](DEPLOYMENT.md) riscritto, `.env.example` con gli ambienti, script `predeploy` e `smoke`.
