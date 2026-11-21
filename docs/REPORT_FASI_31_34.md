# AutoGarage24 — Rapporto tecnico Fasi 31–34

Data: 20 novembre 2026. Nulla è stato pubblicato, nessuna comunicazione è stata inviata, nessun servizio a pagamento è stato attivato, il progetto Supabase reale non è stato modificato.

## 0. Sintesi

| Fase | Risultato | Stato |
|---|---|---|
| 31 — AutoGarage24 Rewards | Portafoglio punti basato su registro, regole configurabili, livelli, catalogo premi dei partner con approvazione, riscatto atomico con codice monouso, inviti con controlli antifrode | ✅ sviluppata e testata · **spenta** finché regolamento e verifiche fiscali/normative non sono completati |
| 32 — Growth Engine | Growth Center con filtri, attribuzione delle registrazioni, landing configurabili con A/B, email promozionali con consenso e approvazione del fondatore, automazioni, architettura pixel con consenso | ✅ sviluppata e testata · invii reali solo con provider email · automazioni spente |
| 33 — SEO Engine | Sitemap dinamica, robots gestibile, meta per pagina, redirect, blog con bozze/programmazione/anteprima, pagine locali e neopatentati solo con contenuti sufficienti, JSON-LD, Search Console e GA4 via variabili | ✅ sviluppata e testata |
| 34 — Audit | Sicurezza, RLS, GDPR, database, test, prestazioni, accessibilità, matrice delle 27 aree, classificazione P0–P3 | ✅ completato · verdetto **PRONTO CON LIMITAZIONI** ([AUDIT_FASE_34.md](AUDIT_FASE_34.md)) |

Numeri finali: 647 controlli database, 4 di concorrenza, 157 unitari, 77 collegamenti, 64 visualizzazioni nel browser: tutti superati. TypeScript, lint, build e `npm audit`: nessun errore.

## 1. Migrazioni nuove (0024–0028)

| File | Contenuto |
|---|---|
| `20261120002400_enum_rewards_growth.sql` | Categorie di notifica «Premi e punti» e «Promozioni» |
| `20261120002500_rewards_referral.sql` | Rewards e inviti (Fase 31) |
| `20261120002600_growth_engine.sql` | Growth Engine (Fase 32) |
| `20261120002700_seo_engine.sql` | SEO Engine e blog (Fase 33) |
| `20261120002800_audit_hardening.sql` | Correzioni dell'audit (Fase 34) |

Nessuna migrazione precedente è stata modificata; il sistema coupon della Fase 21 è stato **esteso** (voucher personali), non duplicato; il Centro marketing della Fase 12 è stato **esteso** (destinatari, codice promo, pubblici), non duplicato.

---

## Fase 31 — AutoGarage24 Rewards

### 1. Cosa fa
- **Portafoglio** (`/dashboard/rewards`): saldo, punti guadagnati, usati, scaduti, in scadenza entro 60 giorni, livello con barra di avanzamento, catalogo premi, premi riscattati con codice, storico completo dei movimenti, inviti.
- **Regole** configurabili dallo staff (punti, attiva/non attiva, bonus livello, massimo per utente, periodo di validità, collegamento a una campagna). Valgono per i nuovi eventi.
- **Livelli** Bronze, Silver (500), Gold (1.500), Platinum (4.000) sui punti guadagnati negli ultimi 12 mesi, con bonus del 5/10/15% sulle attività idonee; soglie e vantaggi modificabili.
- **Catalogo**: i partner propongono premi reali (sconto %, sconto €, servizio/omaggio) con condizioni, quantità, limite per cliente, livello minimo e scadenza; lo staff approva prima della pubblicazione; una modifica a costo o condizioni di un premio pubblicato lo rimanda in revisione.
- **Riscatto** atomico: un codice `RW-XXXXXXXXXX` monouso, valido per i giorni indicati; per gli sconti crea un coupon personale nel sistema della Fase 21 (utilizzabile solo dal titolare).
- **Partner** (`/dashboard/rewards/partner`): convalida dei codici in sede, elenco dei codici emessi, annullamento con motivo (i punti tornano al cliente), statistiche per premio.
- **Inviti**: link personale `/invita/CODICE`, condivisione con copia, WhatsApp ed email (nessun invio automatico), storico senza nomi delle persone invitate.
- **Admin** (`/admin/rewards`): interruttore del programma (con conferma delle verifiche), regole, livelli, approvazione premi, riscatti, inviti in verifica, rettifiche e revoche con motivazione, statistiche.

### 2. Come si guadagnano i punti
Solo su conferme di una parte attendibile, mai sulla semplice richiesta: servizio/preventivo completato dal professionista, acquisto ricambi completato dal venditore, visita/test drive svolto, revisione registrata dal centro, soccorso concluso, trasporto confermato dopo la consegna, acquisto auto confermato da entrambe le parti, offerta segnata come utilizzata. In più: benvenuto alla conferma dell'email, profilo completo, prima auto nel garage, bonus al primo servizio. **Nessun punto per le recensioni** (verificato da un test). Se l'operazione torna indietro, i punti vengono stornati automaticamente.

### 3. Database
`reward_rules`, `reward_tiers`, `points_ledger` (registro in sola aggiunta, unica fonte del saldo), `rewards_wallets` (solo il livello per le notifiche), `reward_items`, `reward_redemptions`, `referral_codes`, `referrals`; `promotional_coupons` estesa con `assigned_user_id` e `reward_redemption_id`. Funzioni: `rewards_wallet`, `redeem_reward`, `verify_reward_code`, `use_reward_code`, `cancel_reward_redemption`, `my_referral_code`, `admin_adjust_points`, `admin_revoke_points`, `admin_review_reward_item`, `admin_review_referral`, `admin_rewards_stats`; interne `rewards_sync`, `expire_points` (giornaliera), `referral_qualify`.

### 4. Sicurezza e antifrode
- Il saldo non è una colonna modificabile: è la somma del registro, che nessun client può scrivere o modificare.
- Ogni regola si assegna una sola volta per origine (indice univoco); doppio clic sul riscatto → stesso codice (chiave di idempotenza); blocchi sul portafoglio e sulla quantità contro le richieste simultanee (testato con due sessioni reali).
- Saldo mai negativo, quantità mai sotto zero, codice mai riusabile, nessun riscatto dei premi della propria attività.
- Inviti: premio solo dopo il primo servizio verificato (utenti) o dopo verifica e pubblicazione dell'attività (partner); controlli su email alias (`+etichetta`, punti di Gmail), email già registrate, stesso telefono, limite mensile → «in verifica» per lo staff.
- Rettifiche manuali solo con motivazione (≥ 10 caratteri), mai sul proprio saldo, registrate nel registro attività e notificate all'utente.

### 5. Punti non sono denaro
Mai mostrati con simboli monetari (test), non convertibili, non cedibili, non prelevabili, non rimborsabili: indicato nel portafoglio e nel regolamento.

### 6. Regolamento, scadenze, rimborsi, verifiche normative
- Bozza tecnica del regolamento in `/regolamento-rewards`, marcata come documento in preparazione.
- Scadenza a 24 mesi (configurabile), consumo prima dei punti in scadenza, avviso 30 giorni prima.
- Codice non usato annullabile: punti restituiti con un movimento di «rimborso».
- **Il programma è spento.** Prima dell'attivazione servono: valutazione della disciplina delle manifestazioni a premio (DPR 430/2001: se il programma ricade tra le operazioni a premio, comunicazioni al Ministero, cauzione, regolamento depositato, oppure un'esclusione applicabile), trattamento fiscale dei premi, accordi scritti con i partner che li erogano. Nessuna di queste valutazioni è stata fatta o presunta.

### 7. Test
48 controlli database (file `95_fase_31.sql`), 4 di concorrenza, 3 unitari; interfaccia verificata nella build e nei collegamenti.

### 8. Prossimi passi
Parere legale e fiscale → regolamento definitivo → primi premi reali dei Founding Partners → attivazione dall'admin con conferma.

---

## Fase 32 — Growth Engine

### 1. Growth Center (`/admin/growth`)
Indicatori reali con filtri per periodo (7/30/90/365 giorni), sorgente, campagna UTM e tipo di account: registrazioni, attivati (richiesta, visita, auto nel garage o profilo pubblicato), con servizio completato, consenso marketing, andamento giornaliero, sorgenti e campagne con tasso di attivazione, tipi di account, imbuto degli inviti, email (in coda, consegnate al provider, errori, esclusi, disiscrizioni), automazioni. Esportazione CSV senza dati personali (protetta da formule).

### 2. Attribuzione
Il modulo di registrazione invia UTM e pagina d'ingresso catturati nella scheda (nessun cookie; nulla se il browser chiede di non essere tracciato). **Corretto:** prima della Fase 32 questi dati non arrivavano mai al database. Salvati per utente in `user_acquisition` (conservazione 25 mesi), inclusi nell'esportazione GDPR.

### 3. Inviti
Programmi separati per utenti e partner (regole distinte), premio solo dopo verifica (Fase 31); link `/invita/CODICE` → registrazione con il codice precompilato.

### 4. Campagne e landing
- Campagne: destinatari (utenti/partner), codice promo, nuovi pubblici «utenti inattivi» e «professionisti».
- Landing configurabili senza codice (`/lp/indirizzo`): titolo, sottotitolo, testo, punti elenco, pulsante (solo destinazioni interne), sezione con **dati reali** (auto compatibili per neopatentati, ultime auto, officine verificate, offerte attive; se non ci sono contenuti lo dice), campagna collegata, indicizzazione facoltativa (mai durante un esperimento).
- Campagne neopatentati: la sezione mostra solo annunci pubblicati con compatibilità calcolata, con l'avviso di verificare la carta di circolazione.

### 5. Esperimenti A/B
Variante per visualizzazione (senza cookie), viste e clic misurati per variante, esito calcolato con il test statistico già esistente: con pochi dati mostra «dati insufficienti», non dichiara vincitori.

### 6. Email marketing
Consenso esplicito obbligatorio; registro dei consensi con la fonte; disiscrizione senza accesso con `/disiscriviti/token` (con conferma, così i controlli antivirus delle email non disiscrivono per errore); preferenza «Promozioni» come ulteriore rinuncia; segmenti solo con filtri predefiniti (tipo di utente, città, inattività, data di registrazione, campagna); anteprima del pubblico; **approvazione obbligatoria del fondatore**; invio separato; registro di ogni invio ed esclusione con il motivo; limite di frequenza (7 giorni); separazione dai messaggi di servizio (modello `marketing`, categoria «Promozioni»). Il provider email non è configurato: le email restano in coda. Provider e costi: vedi [EMAIL.md](EMAIL.md).

### 7. Automazioni
Quattro automazioni con condizioni predefinite (primi passi, garage vuoto, profilo partner non pubblicato, utente inattivo), notifica in app ed email facoltativa (solo con consenso), massimo invii per persona e intervallo minimo, interruttore generale; **tutte spente**; l'attivazione è riservata al fondatore e una modifica al testo le rispegne.

### 8. Pubblicità
Meta Pixel, TikTok Pixel, Google Ads e GA4 solo tramite ID pubblici in variabili d'ambiente, caricati solo dopo il consenso nel banner (che compare solo se almeno un ID è configurato), con revoca dal footer. Nessuna chiave segreta nel frontend; l'invio delle conversioni lato server **non è implementato** e non viene dichiarato funzionante.

Test: 36 controlli database (`96_fase_32.sql`), 4 unitari.

---

## Fase 33 — SEO Engine

- **Tecnico**: titoli e descrizioni per pagina con override dal pannello (27 pagine principali), canonical, Open Graph e Twitter, breadcrumb con JSON-LD, sitemap dinamica (annunci pubblicati, profili approvati con descrizione, offerte attive, articoli, categorie con articoli, landing indicizzabili, pagine locali e neopatentati sopra soglia; esclusi i percorsi in `noindex`), `robots.txt` con esclusioni aggiuntive dal pannello, `X-Robots-Tag: noindex` sulle aree riservate, redirect 301/302/308 dal pannello (senza catene né cicli, applicati entro un minuto), combinazioni di filtri canonicalizzate sulla pagina base.
- **Offerte**: corretto il titolo uguale per tutte; aggiunti descrizione, immagine, canonical, `noindex` per le offerte concluse e dati strutturati `Offer`.
- **Neopatentati**: 4 pagine per fascia di prezzo, indicizzabili solo con almeno 6 annunci compatibili (configurabile).
- **SEO locale**: `/zona/città/categoria` (officine, meccanici, ricambi, concessionari) solo dove esistono profili pubblicati; indicizzabile solo con almeno 3 (configurabile). Nessuna pagina generata per città senza contenuti.
- **Marketplace**: annunci venduti visibili come «Venduto», `noindex` e `SoldOut` nei dati strutturati; rimossi non accessibili.
- **JSON-LD**: Organization e WebSite (home), BreadcrumbList, Car/Offer, AutoRepair/AutoPartsStore/AutoDealer (con `AggregateRating` solo da recensioni verificate pubblicate), Offer, Article; sempre coerenti con il contenuto visibile.
- **Blog** (`/blog`): categorie, autore reale, copertina con testo alternativo, contenuto in un formato semplice e sicuro (titoli, elenchi, grassetto, link; nessun HTML), indice automatico, tempo di lettura, meta, bozze, programmazione con data, anteprima riservata allo staff, nessuna pubblicazione con meno di 300 caratteri.
- **Search Console e GA4**: meta tag di verifica e GA4 tramite variabili; il pannello dice «meta tag presente» e non dichiara mai il dominio verificato.
- **SEO Manager** (`/admin/seo`): controlli di qualità (annunci senza foto o descrizione, profili brevi o senza città, articoli senza meta/categoria/testo alternativo, landing senza descrizione, override in `noindex`), pagine locali e fasce con i conteggi, articoli, categorie, meta, redirect, sitemap e robots, integrazioni.
- **Prestazioni**: immagini con `next/image` e dimensioni dichiarate, CLS misurato 0 su tutte le pagine provate, dati in cache con invalidazione dal pannello.

Test: 20 controlli database (`97_fase_33.sql`), 7 unitari (tra cui il filtro dei link pericolosi negli articoli, che ha trovato e fatto correggere un problema).

---

## Fase 34 — Audit

Documento completo: **[AUDIT_FASE_34.md](AUDIT_FASE_34.md)** (metodo, architettura, RLS, storage, attacchi, GDPR, pagamenti, database, test, prestazioni, carico, monitoraggio, accessibilità, matrice delle 27 aree, P0–P3, controlli per l'ambiente di prova, verdetto). Procedura di backup: **[BACKUP_RESTORE.md](BACKUP_RESTORE.md)**.

Correzioni principali: esportazione e cancellazione GDPR complete, tipo dei valori degli interruttori, CSP e COOP, 34 indici, registro errori senza dati personali, funzioni non necessarie chiuse agli anonimi, limiti di caricamento allineati, accessibilità del logo e dei marchi.

## Pagine nuove

Pubbliche: `/regolamento-rewards`, `/invita/[codice]`, `/lp/[indirizzo]`, `/disiscriviti/[token]`, `/blog`, `/blog/[articolo]`, `/blog/categoria/[categoria]`, `/zona/[città]/[categoria]`, `/auto-per-neopatentati/prezzo/[fascia]`.
Area personale: `/dashboard/rewards`, `/dashboard/rewards/partner`.
Pannello: `/admin/rewards`, `/admin/growth` (+ `/admin/growth/esporta`), `/admin/seo` (+ `/admin/seo/anteprima/[id]`).

## Problemi ancora aperti

Vedi [AUDIT_FASE_34.md §15](AUDIT_FASE_34.md): 4 P1 esterni al codice (migrazioni sul progetto reale, test end-to-end autenticati, provider email, revisione legale), 3 P2 e 2 P3 documentati.
