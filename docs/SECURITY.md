# Sicurezza

## Misure attive (Fase 1)

**Database**
- RLS attiva su tutte le tabelle; nessun accesso "di default": ogni permesso è concesso esplicitamente.
- Privilegi per colonna: un utente non può cambiare stato account, email, date di consenso o badge.
- I ruoli si leggono dalla tabella `user_roles`, **mai** dai metadati del token (che l'utente può modificare).
- Il ruolo `admin` non può essere ottenuto in registrazione: il database lo ignora.
- Account sospesi: perdono subito i permessi di ruolo e il loro profilo pubblico sparisce.
- Funzioni privilegiate in uno schema non esposto (`private`), con `search_path` vuoto.
- Audit log in sola aggiunta, protetto da trigger anche contro la chiave di servizio.
- Documenti di verifica in un bucket privato, con limiti di tipo e dimensione.

**Applicazione**
- Controlli di accesso lato server su ogni pagina e azione protetta.
- Validazione di tutti i dati in ingresso (zod) prima di ogni scrittura.
- Protezione da *open redirect* sui parametri `next`.
- Messaggi neutri su login, registrazione e recupero password (non rivelano quali email esistono).
- Campo trappola anti-bot sulla registrazione.
- Intestazioni HTTP: HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy; `X-Powered-By` disattivato.
- La chiave segreta di Supabase non è mai usata dal sito, solo dallo script del primo amministratore.
- Sessione in cookie gestiti da `@supabase/ssr` e rinnovati dal proxy; verifica con `getClaims()` (firma del token).

## Da completare prima del lancio (tracciato in ROADMAP)

- [ ] CAPTCHA (Cloudflare Turnstile, gratuito) su registrazione, login e recupero password
- [ ] Content-Security-Policy con nonce
- [ ] SMTP proprio e template email in italiano
- [ ] Esecuzione degli "Advisors" di sicurezza Supabase sul progetto reale
- [ ] Test end-to-end dei flussi di autenticazione sul progetto Supabase reale
- [ ] Protezione password compromesse ("leaked password protection") nelle impostazioni Auth
- [ ] Revisione legale di Privacy, Cookie e Termini

## Segnalare un problema

Le credenziali non vanno mai inviate via chat, email o caricate su GitHub. In caso di sospetta esposizione di una chiave: rigenerarla subito da Supabase → Project Settings → API Keys.

---

## Misure aggiunte nelle Fasi 3–10
- **Campi di sistema protetti**: alla creazione di annunci auto e ricambi, i trigger azzerano approvazione, pubblicazione, contatori ed esiti neopatentati; un utente non può auto-approvarsi.
- **Privacy dei professionisti**: indirizzo, coordinate esatte e referente non sono leggibili dalle API pubbliche (permessi per colonna); se l'indirizzo non è pubblico, la posizione è arrotondata a ~1 km.
- **Nomi degli altri utenti**: visibili solo in forma abbreviata ("Mario R.") e solo a chi condivide una conversazione o una richiesta.
- **Documenti e allegati** in bucket privati, letti con link firmati a scadenza breve; percorsi vincolati alla cartella dell'utente.
- **Lettura di conversazioni da parte dello staff** solo con motivazione registrata.
- **Rate limit** su richieste, conversazioni, messaggi, ticket, segnalazioni e registrazioni professionali.
- **CMS**: testo sanificato (nessun HTML), bozze non leggibili dal pubblico, storico di ogni modifica.
- **Geolocalizzazione** solo su clic dell'utente, coordinate arrotondate, mai salvate.
- **Pannello** filtrato per permesso sia nell'interfaccia sia nel database (`requirePermission` + `has_permission`).
- **Dipendenze**: `npm audit` senza vulnerabilità note (19/11/2026). Nessuna chiave privilegiata nel codice del frontend (verificato con ricerca nel sorgente).

## Punti aperti
- Advisors di Supabase da eseguire dopo l'applicazione delle migrazioni.
- Test di penetrazione esterno consigliato prima del lancio.
- Protezione anti-bot (CAPTCHA) sulla registrazione: da valutare (Supabase supporta hCaptcha/Turnstile).
- Le pagine con indirizzo inesistente restituiscono il contenuto "non trovato" con `noindex` ma codice HTTP 200 (limite dello streaming di Next.js con Cache Components): non è un rischio di sicurezza, solo SEO.

## Fasi 11–20
- Moduli pubblici (candidatura, Beta): campo trappola anti-bot, limiti per email (hash, nessun IP salvato) e globali, presa visione dell'informativa obbligatoria.
- Analytics: nessun cookie, nessuna memoria del browser, nessun identificativo; elenco chiuso di eventi e percorsi validati; Do Not Track/GPC rispettati; lettura solo con `analytics.view`.
- CRM, marketing e budget: accesso per permesso (`acquisition.manage`, `marketing.manage`); storico immutabile; approvazione spese solo Super Admin (controllo anche nel database).
- Richieste di intervento: posizione arrotondata (~1 km) e mai esposta; invio solo a officine compatibili scelte dal cliente (max 5 per volta, 10 in totale, 5 richieste al giorno).
- Recensioni: solo esperienze verificate; acquisti confermati da entrambe le parti; testi duplicati rifiutati; punteggi immodificabili; storico decisioni.
- Mappa: coordinate esatte solo per indirizzi resi pubblici dai professionisti; auto e ricambi sempre in forma approssimata.
- Allegati video fino a 50 MB solo nel bucket privato dei messaggi.

## Fasi 21–30
- Nuove tabelle tutte con RLS; colonne scrivibili dal client limitate per elenco; stati, verifiche, prezzi calcolati e risultati scritti solo da funzioni del server (`ag24.trusted` per gli aggiornamenti di sistema).
- Posizione esatta, indirizzi, telefoni e targhe in tabelle separate: visibili solo alla controparte scelta e solo finché la pratica è aperta; posizione dal vivo dell'operatore cancellata a fine intervento.
- Consenso esplicito per: posizione (soccorso), trasmissione ai partner assicurativi (uno per partner, con versione), condivisione di dati e foto con i professionisti (valutazioni), dati dei trasporti.
- Bucket privati `service-photos`, `valuation-photos`, `verification-documents`: caricamento solo nella propria cartella, lettura con URL firmati per le sole parti coinvolte.
- Nessuna credenziale nel database: le integrazioni assicurative registrano solo il nome della variabile d'ambiente.
- Business Center: isolamento per azienda (`private.business_can`), permessi granulari, nessun collaboratore modifica i propri permessi, solo il titolare nomina amministratori, registro aziendale non modificabile, esportazioni registrate. Le azioni delegate sulle prenotazioni impersonano il titolare solo dentro funzioni con controllo del permesso e ripristinano subito l'identità (testato).
- Cronologie immutabili (`private.history_immutable`): nessuna modifica o cancellazione diretta; eliminazione solo a cascata con la pratica, per consentire la cancellazione dei dati.
- Limiti antispam con `private.enforce_rate_limit` su richieste di soccorso, trasporti, assicurazioni, valutazioni, permute, revisioni, inviti e posizione dal vivo.

## Fasi 31–34
- Rewards: saldo derivato da un registro in sola aggiunta non scrivibile dai client; assegnazione idempotente; riscatto con blocchi su portafoglio e quantità (testato con sessioni simultanee); rettifiche solo con motivazione e registro; programma spento di default.
- Inviti: premio solo dopo verifica, segnali antifrode (email alias, email già registrata, stesso telefono, limite mensile) → verifica manuale.
- Email promozionali: solo con consenso, approvazione del solo fondatore, segmenti con chiavi predefinite (vincolo nel database), disiscrizione con token casuale, limite di frequenza, registro degli invii.
- Landing, messaggi, automazioni e redirect: destinazioni solo interne (o `https://` per i redirect), niente `//`; redirect senza catene né cicli, aree riservate escluse.
- Blog: nessun HTML, link filtrati (`javascript:`, `//` rifiutati), link esterni `nofollow`.
- Intestazioni: Content-Security-Policy (origini esterne solo se configurate), Cross-Origin-Opener-Policy, `X-Robots-Tag: noindex` sulle aree riservate. Limite: script inline ammessi (pagine prerenderizzate senza nonce).
- Pixel e GA4 solo dopo il consenso; nessuna chiave segreta nel frontend.
- Controlli automatici in `99_audit_fase_34.sql`: RLS su ogni tabella, `search_path` fisso su ogni funzione privilegiata, nessuna scrittura anonima, viste `security_invoker`, limiti su ogni bucket, elenco chiuso delle funzioni aperte agli anonimi.
- GDPR: esportazione e cancellazione estese a tutte le aree; registro errori ripulito da dati personali (conservazione 90 giorni).
- Audit completo: [AUDIT_FASE_34.md](AUDIT_FASE_34.md).
