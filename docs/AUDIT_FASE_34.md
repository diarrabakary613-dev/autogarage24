# AutoGarage24 — Audit completo (Fase 34)

Data: 20 novembre 2026 · Ambiente: sviluppo locale (nessuna pubblicazione, nessuna modifica al progetto Supabase reale).

> **Verdetto: PRONTO CON LIMITAZIONI — non è una release candidate.**
> Il codice non ha problemi P0 aperti e tutti i P1 di codice trovati sono stati corretti e testati.
> Restano aperti 3 problemi P1 **esterni al codice** (il P1-A, migrazioni sul database reale, è risolto il 20/11/2026; restano test
> end-to-end con utenti autenticati non eseguibili qui, provider email assente, revisione legale), che
> richiedono decisioni o autorizzazioni del fondatore. Finché sono aperti la piattaforma non va aperta
> al pubblico. Va bene per una **beta chiusa**, ora che le migrazioni sono applicate.

---

## 1. Metodo e limiti dell'audit

| Cosa | Come | Limite |
|---|---|---|
| Database, RLS, funzioni | PostgreSQL 16 locale con uno strato che imita Supabase (auth, storage), tutte le 28 migrazioni, 13 file di test SQL | Non è lo stack Supabase completo (GoTrue, PostgREST, Storage API, Realtime) |
| Concorrenza | Due sessioni PostgreSQL reali in parallelo (`npm run test:concurrency`) | Solo i riscatti Rewards |
| Codice | TypeScript, ESLint, 157 test unitari (Vitest) | — |
| Interfaccia | Build di produzione + Chrome (Playwright) su 32 pagine pubbliche × 2 dispositivi | Database finto: le pagine mostrano gli stati vuoti, non dati reali |
| Accessibilità | axe-core 4 (regole WCAG 2.0/2.1 A e AA) sulle stesse 64 visualizzazioni | Controllo automatico: non sostituisce una prova con lettore di schermo |
| Prestazioni | Misure del browser (LCP, CLS, FCP, peso) con rete e CPU mobile simulate | Lighthouse non eseguito: l'ambiente ha negato il permesso di lanciarlo |
| Carico | 20 connessioni simultanee per 20 s su 5 indirizzi, server su 2 CPU | Il client di carico gira sulla stessa macchina; i dati non arrivano dal database |
| Sicurezza dipendenze | `npm audit` | — |

Non è stato possibile eseguire: test con utenti autenticati nell'interfaccia (le immagini Docker di Supabase non sono scaricabili da questo ambiente), invio reale di email, caricamenti reali su Storage, job pg_cron in produzione, prove su telefoni fisici. **Nessuno di questi test viene dichiarato superato.**

## 2. Architettura (sintesi)

- **Next.js 16** (App Router, `cacheComponents`, rendering parziale): pagine pubbliche prerenderizzate con parti dinamiche in streaming; azioni del server per tutti i moduli.
- **Supabase**: PostgreSQL con RLS su ogni tabella; logica sensibile in funzioni `SECURITY DEFINER` con `search_path` fisso; Storage con bucket privati e pubblici; Auth con conferma email.
- Il browser usa solo la chiave *publishable*; la chiave segreta è usata solo dallo script del primo amministratore e non compare nel bundle (verificato, §6).
- Il proxy (`src/proxy.ts`) rinnova la sessione, applica i redirect SEO e blocca in anticipo le aree riservate; i controlli veri restano nelle pagine, nelle azioni e nella RLS.

Dettagli: [ARCHITECTURE.md](ARCHITECTURE.md), [DATABASE.md](DATABASE.md), [SECURITY.md](SECURITY.md).

## 3. Autenticazione e ruoli

- Registrazione con conferma email, password minima 10 caratteri (impostazione Supabase da verificare in produzione: [ENVIRONMENT.md](ENVIRONMENT.md) §4).
- Ruoli in `user_roles`, mai dai metadati modificabili dall'utente; permessi granulari in `role_permissions` (nuovi: `rewards.manage`, `growth.manage`, `seo.manage`).
- Azioni del fondatore (`super_admin`): approvazione delle email promozionali, attivazione delle automazioni, nomina amministratori.
- Testato: nessuna auto-assegnazione di ruoli, nessuna auto-approvazione dei professionisti, stato dell'account non modificabile dall'utente, impostazioni riservate.

## 4. RLS — priorità dell'audit

**Controlli automatici** (in `supabase/tests/99_audit_fase_34.sql`, falliscono se una migrazione futura introduce il problema):

| Controllo | Esito |
|---|---|
| RLS attiva su tutte le 146 tabelle pubbliche | ✅ |
| Ogni funzione `SECURITY DEFINER` ha `search_path` fisso | ✅ |
| Nessuna scrittura diretta degli anonimi in nessuna tabella | ✅ |
| Viste con `security_invoker` | ✅ (`listing_search`, `part_search`) |
| Funzioni privilegiate eseguibili da anonimi: elenco chiuso di 27, rivisto una per una | ✅ — 2 rimosse (`my_businesses`, `request_vehicle_info`) |
| Funzioni interne (`private.*`) non eseguibili dagli utenti | ✅ |

**Test negativi** (cosa NON deve succedere): anonimi senza accesso a profili, messaggi, notifiche, richieste, coda email, registro attività, ruoli, punti, attribuzione, richieste assicurative, errori applicativi; un utente non vede né modifica richieste, garage, notifiche e contatti di un altro; un partner non verifica né usa i codici premio di un altro partner; uno staff non fondatore non approva email né attiva automazioni. Questi si aggiungono ai test negativi delle fasi precedenti (totale database: **647 controlli superati, 0 falliti**).

## 5. Storage e caricamenti

| Bucket | Pubblico | Limite | Tipi |
|---|---|---|---|
| avatars | sì | 2 MB | JPG, PNG, WebP |
| business-media | sì | 5 MB | JPG, PNG, WebP |
| listing-images · blog-images | sì | 8 MB | JPG, PNG, WebP |
| listing-videos | sì | 50 MB | MP4, WebM, MOV |
| verification-documents · vehicle-documents · field-documents | no | 10 MB | PDF, JPG, PNG, WebP |
| message-attachments | no | 50 MB | PDF, immagini, video |
| service-photos · valuation-photos | no | 8 MB | JPG, PNG, WebP |

Ogni bucket ha limite e tipi ammessi (controllo automatico). Caricamento solo nella propria cartella; file privati solo con URL firmati temporanei; nomi casuali non indovinabili. **Corretto (P3):** il browser accettava foto fino a 8 MB anche per `business-media` (limite 5 MB) e `avatars` (2 MB): ora il limite del bucket viene controllato dopo la compressione, con un messaggio chiaro.

## 6. Protezione dagli attacchi

| Area | Stato |
|---|---|
| Intestazioni | nosniff, `X-Frame-Options: DENY`, HSTS, Referrer-Policy, Permissions-Policy, **nuove**: Content-Security-Policy, Cross-Origin-Opener-Policy; `X-Robots-Tag: noindex` sulle aree riservate |
| CSP | `default-src 'self'`, nessun plugin, nessun frame (tranne Google Ads se configurato), `form-action 'self'`, `base-uri 'self'`; origini di GA4/pixel aggiunte solo se configurati. Nessuna violazione su 64 visualizzazioni |
| XSS | Nessun HTML grezzo dagli utenti: articoli del blog renderizzati come elementi React; `dangerouslySetInnerHTML` usato solo per il JSON-LD con escape di `<`. **Corretto (P2):** il filtro dei link negli articoli accettava `//sito-esterno` |
| Iniezione SQL | Solo query parametrizzate e funzioni; i segmenti delle email accettano solo chiavi predefinite (vincolo nel database) |
| Open redirect | Destinazioni delle landing, dei messaggi e delle automazioni solo interne (vincolo + controllo nel codice); redirect SEO senza catene né cicli, aree riservate escluse |
| CSRF | Azioni del server Next.js (controllo dell'origine) + cookie di sessione `SameSite` |
| Limiti di frequenza | `private.enforce_rate_limit` per utente (riscatti, richieste, inviti…), `enforce_anon_limit` sui moduli pubblici, tetto globale sugli eventi di misurazione e sul registro errori |
| Segreti | Nessuna chiave segreta nel bundle (cercati `service_role`, `sb_secret_`, `SERVICE_ROLE` in `.next/static`: unica occorrenza = codice della libreria Supabase che riconosce i prefissi). Nessuna credenziale nel database |
| Dipendenze | `npm audit`: **0 vulnerabilità** (produzione e sviluppo) |

## 7. GDPR

Implementato (senza dichiarare alcuna certificazione: **AutoGarage24 non è "certificato GDPR"**, la conformità richiede anche misure organizzative e la revisione di un professionista):

| Diritto / principio | Come |
|---|---|
| Accesso e portabilità (art. 15, 20) | Download JSON da *Impostazioni*. **Corretto (P1):** l'esportazione non includeva i dati delle fasi 21–32 (offerte, prenotazioni, soccorso, trasporti, revisioni, assicurazioni, valutazioni, permute, team, punti, premi, inviti, provenienza, consensi, comunicazioni, notifiche). Testato |
| Rettifica (art. 16) | Modifica di profilo, garage, annunci, preferenze dall'area personale |
| Cancellazione (art. 17) | Richiesta dall'area personale, gestione in `/admin/gdpr`. **Corretto (P1):** la procedura non trattava le nuove aree e lasciava l'email leggibile nel profilo; ora pseudonimizza l'email, elimina attribuzione, notifiche, preferiti, token, richieste assicurative, annulla prenotazioni, codici premio e inviti. Testata anche l'eliminazione definitiva dell'account (cascata completa nonostante gli storici immutabili) |
| Consenso marketing | Facoltativo alla registrazione, revocabile da impostazioni o dal link nelle email senza accesso; ogni variazione registrata con la fonte |
| Minimizzazione | Misurazione interna senza cookie e senza identificativi; attribuzione solo dalla scheda aperta, mai con Do Not Track/GPC; registro errori ripulito da email, telefoni, UUID e token |
| Conservazione | Eventi di misurazione, attribuzione e registro invii: 25 mesi; errori applicativi: 90 giorni; posizione dal vivo del soccorso: cancellata a fine intervento |
| Terze parti | GA4 e pixel solo dopo consenso esplicito, rifiuto con la stessa evidenza dell'accettazione, consenso rinnovato dopo 12 mesi |

**Da verificare con un legale** (non risolvibili nel codice): informativa privacy e cookie policy definitive (oggi in bozza, con avviso); registro dei trattamenti; nomine dei responsabili (Supabase, Hostinger, provider email, Google/Meta/TikTok se attivati) e trasferimenti extra-UE; base giuridica dell'attribuzione per utente (legittimo interesse, da documentare); tempi di conservazione per obblighi fiscali; DPIA per la posizione dal vivo del soccorso; regolamento Rewards e disciplina delle manifestazioni a premio (DPR 430/2001); accordi con i partner che erogano i premi; DSA (segnalazioni e moderazione), direttiva Omnibus sui prezzi barrati delle offerte.

## 8. Pagamenti

**Non esistono pagamenti sulla piattaforma.** Nessun provider è configurato, nessun dato di carta viene raccolto o trasmesso. Offerte, coupon, trasporti, piani Business e premi Rewards non comportano transazioni su AutoGarage24. I piani a pagamento esistono solo come configurazione disattivata. I punti Rewards non sono denaro e non sono convertibili.

## 9. Affidabilità del database

- **Integrità**: chiavi esterne, vincoli di controllo su stati, importi, percorsi e formati; storici in sola aggiunta (punti, consensi, stati delle pratiche); il saldo punti è sempre la somma del registro.
- **Indici**: trovate 195 chiavi esterne senza indice (la maggior parte di tipo «creato da»). **Corretto (P2):** aggiunti 34 indici sulle chiavi usate dalle regole RLS, dagli elenchi e dalle cancellazioni a cascata.
- **Concorrenza**: testata con due sessioni simultanee: due utenti che chiedono l'ultimo pezzo di un premio → un solo riscatto; lo stesso utente che spende lo stesso saldo su due premi insieme → un solo riscatto; nessun saldo negativo, quantità mai sotto zero. Le prenotazioni simultanee erano già testate (Fase 27).
- **Idempotenza**: riscatti con chiave di richiesta (il doppio clic restituisce lo stesso codice), punti una sola volta per origine, inviti una sola volta per persona, email una sola volta per messaggio.
- **Backup e ripristino**: procedura in [BACKUP_RESTORE.md](BACKUP_RESTORE.md). Non è stata eseguita alcuna operazione sul database di produzione.

## 10. Test automatici eseguiti

| Tipo | Quantità | Esito |
|---|---|---|
| Database: RLS, funzioni, flussi, audit (`npm run test:db`) | 647 controlli in 13 file | ✅ tutti superati |
| Concorrenza (`npm run test:concurrency`) | 4 controlli, 2 sessioni parallele | ✅ |
| Unitari (`npm test`) | 157 in 14 file | ✅ |
| TypeScript e ESLint (tutto il progetto) | — | ✅ nessun errore, nessun avviso |
| Build di produzione | — | ✅ |
| Collegamenti interni (`npm run check:links`) | 77 | ✅ 0 non funzionanti |
| Navigazione: 32 pagine × desktop 1366 px e mobile 390 px | 64 | ✅ nessun errore JavaScript, nessuno scorrimento orizzontale, nessuna violazione CSP |
| Aree riservate senza accesso (`/dashboard`, `/admin`, `/business`) | — | ✅ reindirizzate all'accesso |
| End-to-end con utenti autenticati | — | ❌ **non eseguiti** (vedi §1) |

## 11. Prestazioni e carico

Misure reali in questo ambiente (database finto, quindi **solo** la parte statica e il rendering):

| Pagina (mobile: CPU ×4, rete 1,6 Mbps, 150 ms) | FCP | LCP | CLS | Peso |
|---|---|---|---|---|
| Home | 0,77 s | 1,02 s | 0 | 461 KB (276 KB JS) |
| Auto per neopatentati | 0,32 s | 0,32 s | 0 | 68 KB |
| Offerte | 0,30 s | 0,59 s | 0 | 51 KB |
| Blog | 0,24 s | 0,29 s | 0 | 62 KB |

Le pagine con dati (annunci, officine) hanno un caricamento totale di ~7 s **solo perché il database di prova non risponde**: non è un dato rappresentativo. INP non misurabile senza interazioni reali. Con il database reale vanno misurati LCP e INP con Lighthouse o PageSpeed Insights (consigliato prima del lancio).

Carico (20 connessioni simultanee, 20 s, server di produzione Next.js su 2 CPU):

| Indirizzo | Richieste/s | p50 | p95 | p99 | Errori |
|---|---|---|---|---|---|
| `/` | 52 | 368 ms | 523 ms | 578 ms | 0 |
| `/chi-siamo` | 91 | 210 ms | 280 ms | 302 ms | 0 |
| `/robots.txt` | 932 | 21 ms | 27 ms | 32 ms | 0 |
| `/sitemap.xml` | 979 | 19 ms | 27 ms | 31 ms | 0 |
| `/api/health` | — | — | — | — | risponde 503 (corretto: database non raggiungibile) |

## 12. Monitoraggio e log

- `/api/health`: stato dell'applicazione e del database (nuova funzione `health_check`), nessun dato personale. Da collegare a un servizio di uptime (scelta del fondatore).
- **Nuovo (P2):** registro errori dell'applicazione (`app_errors`): gli errori del browser vengono salvati senza email, telefoni, identificativi e token, con limite di volume e conservazione 90 giorni; visibili in *Admin › Email e sistema*.
- Registro attività amministrative immutabile; registro aziendale del Business Center; registro invii delle email promozionali con il motivo di ogni esclusione.

## 13. Accessibilità

axe-core (WCAG 2.0/2.1 A e AA) su 64 visualizzazioni. **Corretti:** testo dei marchi in home con contrasto 2,26:1 (ora ≥ 4,5:1); nome accessibile del logo diverso dal testo visibile (WCAG 2.5.3). **Rimane segnalato** solo il logotipo arancio/bianco (2,72:1), che rientra nell'eccezione WCAG 1.4.3 per i logotipi. Già presenti: navigazione da tastiera, etichette e messaggi di errore collegati ai campi, aree di tocco ≥ 44 px, `aria-live` per le conferme. Da fare: prova manuale con VoiceOver/TalkBack.

## 14. Matrice delle 27 aree funzionali

Legenda stato finale: ✅ pronto · 🟡 pronto con limitazioni esterne · ⛔ bloccato.

| # | Area | Stato codice | Test | Errori trovati / corretti | Mancante | Dipendenze esterne | Finale |
|---|---|---|---|---|---|---|---|
| 1 | Account e autenticazione | Completo | DB + interfaccia pubblica | — | E2E con email vere | SMTP | 🟡 |
| 2 | Ruoli e permessi staff | Completo | DB (escalation negativa) | — | — | — | ✅ |
| 3 | Profili professionali e verifica | Completo | DB | — | Verifica di professionisti reali | Documenti reali | 🟡 |
| 4 | Marketplace auto | Completo | DB + navigazione | — | Annunci reali | — | 🟡 |
| 5 | Neopatentati | Completo | Unitari + DB | — | Revisione legale delle regole | Parere legale | 🟡 |
| 6 | Ricambi | Completo | Unitari + DB | — | — | — | ✅ |
| 7 | Richieste, preventivi, messaggi | Completo | DB | — | Realtime tra utenti reali | Supabase Realtime | 🟡 |
| 8 | Recensioni verificate | Completo | DB | — | — | — | ✅ |
| 9 | Garage, manutenzione, scadenze | Completo | DB | — | Job pianificati in produzione | pg_cron | 🟡 |
| 10 | Notifiche | Completo | DB | — | Email e push reali | Provider email, chiavi push | 🟡 |
| 11 | Pannello admin e moderazione | Completo | DB | — | — | — | ✅ |
| 12 | Acquisizione partner (CRM, Field Manager) | Completo | DB | — | — | — | ✅ |
| 13 | Centro marketing | Completo | DB | Esteso (destinatari, codice promo) | — | — | ✅ |
| 14 | Misurazione e analytics | Completo | DB + unitari | **P2** UTM della registrazione mai inviati → corretto | — | — | ✅ |
| 15 | Mappa e ricerca geografica | Completo | Navigazione | — | Fornitore di tile commerciale | OpenStreetMap (limiti d'uso) | 🟡 |
| 16 | Offerte e coupon | Completo | DB | **P2** titolo e meta uguali per tutte le offerte → corretti, aggiunto JSON-LD | — | — | ✅ |
| 17 | Prenotazioni visite e test drive | Completo | DB (simultaneità) | — | Google Calendar | OAuth (facoltativo) | ✅ |
| 18 | Assistenza stradale | Completo | DB | — | Operatori reali verificati | — | 🟡 |
| 19 | Trasporto auto | Completo | DB | — | Trasportatori reali | — | 🟡 |
| 20 | Revisioni | Completo | DB | — | Centri autorizzati reali | — | 🟡 |
| 21 | Assicurazioni (informazione) | Completo | DB | — | Partner RUI/IVASS | Parere legale | 🟡 |
| 22 | Valutazioni e permute | Completo | DB | — | — | — | ✅ |
| 23 | Business Center e piani | Completo | DB | — | Piani a pagamento (spenti) | Pagamenti (non attivi) | ✅ |
| 24 | Rewards e inviti | Completo, **spento** | DB + concorrenza + unitari | **P1** interruttori del pannello inviavano un tipo errato → corretto | Attivazione | Regolamento, DPR 430/2001, fisco | 🟡 |
| 25 | Growth Engine | Completo, automazioni spente | DB + unitari | — | Invii reali | Provider email, approvazione fondatore | 🟡 |
| 26 | SEO Engine e blog | Completo | DB + unitari + navigazione | **P2** link `//esterni` negli articoli → corretto | Primi articoli reali | Search Console | 🟡 |
| 27 | Privacy, GDPR, legale | Completo | DB | **P1** esportazione e cancellazione incomplete → corrette | Documenti definitivi | Legale | 🟡 |

Nessuna area è ⛔ per motivi di codice; le migrazioni sono applicate sul progetto reale (P1-A risolto il 20/11/2026).

## 15. Problemi classificati

**P0** — blocca o compromette la sicurezza: **nessuno trovato.**

**P1 — corretti in questa fase e testati**
1. Esportazione dei dati personali incompleta (dati delle fasi 21–32). → migrazione 0028.
2. Cancellazione dell'account: nuove aree non trattate, email ancora leggibile. → migrazione 0028.
3. Interruttori del pannello (Rewards, automazioni) inviavano `"true"` come testo: l'impostazione booleana veniva rifiutata e le funzioni non si sarebbero mai attivate. → valori booleani, test sul tipo.

**P1 — aperti (esterni al codice, richiedono il fondatore)**
- ~~**A.** Migrazioni 0004 e 0007–0028 non applicate al progetto Supabase reale.~~ **Risolto il 20/11/2026**: su autorizzazione del fondatore («applica le migrazioni») sono state applicate direttamente al progetto reale `mcjlyqplfiyhrxvazzzk`, che era vuoto (0 utenti). Non è stato usato un progetto di prova separato. Verifiche in §16.
- **B.** Test end-to-end con utenti autenticati mai eseguiti (registrazione → richiesta → preventivo → appuntamento → recensione; riscatto di un premio; invio di una campagna). Da fare sull'ambiente di prova, su desktop e telefono.
- **C.** Provider email non configurato: conferme di registrazione affidate al servizio Supabase incluso (limiti molto bassi), notifiche email in coda e mai inviate.
- **D.** Documenti legali in bozza e verifiche in §7 (privacy, cookie, termini, regolamento Rewards, DPR 430/2001).

**P2 — corretti:** UTM della registrazione mai inviati; meta e dati strutturati delle offerte; CSP assente; link protocol-relative negli articoli; 34 indici mancanti; registro errori assente; due problemi di accessibilità.

**P2 — aperti**
- Pagine inesistenti dentro le pagine dinamiche rispondono 200 con `noindex` e contenuto «non trovato» (effetto dello streaming di Next.js, comportamento già presente). Google le tratta come non indicizzabili; da rivalutare con gli aggiornamenti di Next.js.
- La CSP ammette gli script inline (necessario senza nonce per le pagine prerenderizzate). Le origini esterne restano bloccate.
- Lighthouse/PageSpeed non eseguiti in questo ambiente: da eseguire sul sito di prova.

**P3 — corretti:** due funzioni eseguibili da anonimi senza necessità; limite di dimensione delle foto non allineato ai bucket.
**P3 — corretti il 20/11/2026 (migrazione 0029, applicata e verificata sul reale):** indice duplicato su `favorites`; privilegi superflui di `anon`/`authenticated` sulle viste `listing_search` e `part_search` (ora solo SELECT); `listing_favorite_count` e `valuation_professionals` non più eseguibili da anonimi. Tipi TypeScript rigenerati dal database reale: l'app compila senza errori.
**P3 — aperti:** 161 chiavi esterne di tipo «creato da/approvato da» senza indice (impatto trascurabile ai volumi previsti); contrasto del logotipo (eccezione WCAG).

## 16. Ambiente di prova e release candidate — controlli

| Controllo | Esito |
|---|---|
| Build di produzione con variabili di esempio | ✅ |
| Migrazioni applicabili in ordine su database vuoto | ✅ (29 migrazioni, 653 controlli) |
| Migrazioni applicate al progetto reale | ✅ 20/11/2026 — 29/29 registrate (inclusa la 0029 di pulizia) |
| Nessun segreto nel codice e nel bundle | ✅ |
| Variabili d'ambiente documentate | ✅ [ENVIRONMENT.md](ENVIRONMENT.md) |
| Backup/ripristino documentati | ✅ [BACKUP_RESTORE.md](BACKUP_RESTORE.md) · prova di ripristino da fare sul progetto reale |
| Monitoraggio uptime collegato | ❌ da scegliere |
| Test E2E autenticati | ❌ |
| Documenti legali definitivi | ❌ |
| Funzioni sensibili spente di default (Rewards, automazioni, pixel) | ✅ |

### 16.1 Verifica del database reale dopo l'applicazione (20/11/2026)

Metodo: le migrazioni sono state inviate tramite il connettore Supabase in una versione senza righe di commento, identica per contenuto agli originali (con questa versione la suite locale aveva dato 647 test superati, 0 falliti). Poi, sul database reale e su un PostgreSQL locale costruito con gli stessi file, è stata calcolata un'impronta (hash MD5) per ogni categoria di oggetti di `public` e `private`.

| Categoria | Reale | Locale | Esito |
|---|---|---|---|
| Colonne | 1828 | 1828 | ✅ identiche |
| Vincoli | 1332 | 1332 | ✅ identici |
| Indici | 374 | 374 | ✅ identici |
| Trigger | 141 | 141 | ✅ identici |
| Valori enum | 184 | 184 | ✅ identici |
| Dati iniziali (permessi, impostazioni, regole Rewards) | — | — | ✅ identici |
| Funzioni | 343 | 343 | ✅ 342 identiche; `private.is_user_active` differisce solo per l'a capo (applicata in una sessione precedente), logica uguale |
| Policy RLS | 294 | 294 | ✅ 293 identiche; «business_members: inviti ricevuti» differisce solo per un cast `::text` aggiunto da Postgres (`auth.users.email` è `varchar` su Supabase) |
| Permessi | — | — | ⚠️ differenze dovute ai privilegi predefiniti di Supabase: viste `listing_search`/`part_search` (vedi P3) e `EXECUTE` esplicito ad `anon` su `listing_favorite_count` e `valuation_professionals` (anche in locale eseguibili tramite `PUBLIC`; per un anonimo restituiscono 0 righe) |

Altri controlli sul reale: 146 tabelle in `public`, **tutte con RLS attiva**; 28 policy di storage; 11 bucket; 11 job pg_cron attivi; 0 utenti.

**Advisors Supabase:**
- Sicurezza: **nessun ERROR**. INFO: 3 tabelle con RLS e senza policy (`private.rate_limit_events`, `daily_view_counts`, `email_unsubscribe_tokens`), accessibili solo dalle funzioni: voluto. WARN: 27 funzioni `SECURITY DEFINER` eseguibili da `anon` (ricerche pubbliche, tracciamento, candidature, disiscrizione, controllo di stato: tutte previste e con controlli interni) e 166 eseguibili da `authenticated` (le operazioni dell'app, tutte con controllo dei permessi all'interno).
- Prestazioni: 1 WARN (indice duplicato su `favorites`, rimosso con la 0029); 57 WARN «più policy permissive» (scelta di leggibilità, costo trascurabile ai volumi attuali); INFO: 161 chiavi esterne senza indice e 155 indici «non usati» (normale su un database vuoto).

Non verificato qui: il comportamento con utenti reali (test E2E, P1-B).

## 17. Verdetto

**PRONTO CON LIMITAZIONI.** La release candidate non può essere dichiarata perché restano aperti 3 P1 (B–D); il P1-A è risolto (20/11/2026). Ordine consigliato:
1. ~~Applicare le migrazioni (A)~~ — fatto. Creare il primo amministratore con `npm run admin:bootstrap`.
2. Configurare il provider email (C) e l'SMTP di Supabase Auth.
3. Eseguire i test end-to-end autenticati su desktop e telefono (B) e misurare le prestazioni con PageSpeed Insights.
4. Far rivedere i documenti legali (D); solo dopo, aprire al pubblico e attivare le funzioni facoltative una alla volta.
