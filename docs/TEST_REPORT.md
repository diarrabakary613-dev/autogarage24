# Report dei test

Ultimo aggiornamento: 19 novembre 2026 — **Fasi 11–20** (dettaglio in REPORT_FASI_11_20.md §4). Comandi: `npm run check` e `npm run check:links`.

| Controllo | Fase 2 | Fasi 3–10 | Fasi 11–20 |
|---|---|---|---|
| TypeScript | ✅ | ✅ Nessun errore | ✅ |
| ESLint | ✅ | ✅ Nessun avviso | ✅ |
| Test del codice (Vitest) | ✅ 63/63 | ✅ 100/100 | ✅ 122/122 |
| Test del database (PostgreSQL locale, 16 migrazioni) | ✅ 44/44 | ✅ 202/202 in 3 suite | ✅ 296/296 in 5 suite |
| Build di produzione | ✅ 30 percorsi | ✅ 89 percorsi | ✅ 115 percorsi |
| Collegamenti interni (crawler) | ✅ 35/0 | ✅ 46 controllati, 0 non funzionanti | ✅ 58/0 |
| Browser (Chrome headless) desktop e smartphone, 9 pagine | ✅ | ✅ Nessun errore in console, nessuno scorrimento orizzontale | ✅ 11 nuove pagine |
| Aree protette (`/dashboard`, `/admin`) senza accesso | ✅ | ✅ Reindirizzano a `/accedi` | ✅ |
| `npm audit` (dipendenze di produzione) | — | ✅ 0 vulnerabilità | ✅ |

## Cosa verificano i nuovi test
**Codice** (`tests/unit`):
- Motore neopatentati: regime 2011 e 2024 per data della patente, scadenza dei mesi, margine del 2%, elettriche/ibride plug-in, dati mancanti → "da verificare".
- Compatibilità ricambi: solo codice OEM/telaio dà "verificata"; marca e modello da soli mai.
- Orari dei professionisti, segnali di pericolo nell'assistenza auto, sanificazione dei testi del CMS.

**Database** (`supabase/tests`):
- Un utente non vede né modifica dati di altri (annunci in bozza, garage, documenti, messaggi, richieste, preventivi).
- Non si può auto-approvare un annuncio o un profilo; i campi di sistema vengono azzerati.
- Indirizzi e coordinate dei professionisti mascherati; nomi degli altri utenti abbreviati e solo per chi ha una relazione.
- Recensioni solo dopo una richiesta completata; ricerca ricambi per codice e per veicolo; bozze del CMS non pubbliche.
- Permessi del pannello per ogni ruolo; registro attività scritto dalle azioni amministrative.

## Non ancora testato (richiede il progetto Supabase reale e la rete)
- Registrazione, conferma email e recupero password con email vere.
- Caricamento reale di foto e documenti su Storage.
- Chat e notifiche in tempo reale tra due utenti reali.
- Job pianificati (pg_cron) e invio email (provider non configurato).
- Flussi completi end-to-end: pubblicazione annuncio → moderazione → richiesta → preventivo → appuntamento → recensione.
- Prova su dispositivi fisici iOS/Android.

## Fasi 21–30 (20/11/2026)
- Database: **495 controlli superati** (nuovi file 60, 70, 80, 90): offerte e coupon, prenotazioni simultanee e fuso orario, test drive, soccorso con protezione della posizione, trasporti con verbali, partner assicurativi e consenso, scadenze delle revisioni, stima con dati insufficienti, trattative e permute, Business Center con isolamento tra aziende e limiti del piano.
- Unitari: **143 superati**. TypeScript e lint: nessun errore né avviso. Build di produzione riuscita.
- Collegamenti pubblici: 77, nessuno non funzionante. Pagine nuove verificate su 1366 px e 390 px senza errori JavaScript né scorrimento orizzontale.
- Non testati: flussi autenticati nell'interfaccia con il progetto Supabase reale, caricamenti su Storage, notifiche push ed email, job pianificati in produzione.

## Fasi 31–34 (20/11/2026)
- Database: **647 controlli superati** in 13 file (nuovi: 95 Rewards, 96 Growth, 97 SEO, 99 audit con controlli strutturali, RLS negativa e GDPR).
- Concorrenza (`npm run test:concurrency`): **4 superati** con due sessioni PostgreSQL simultanee (ultimo pezzo di un premio, doppia spesa dello stesso saldo).
- Unitari: **157 superati** (14 file). TypeScript e ESLint su tutto il progetto: nessun errore né avviso. Build di produzione riuscita. `npm audit`: 0 vulnerabilità.
- Collegamenti: 77, nessuno non funzionante. Browser: 32 pagine × desktop e mobile = 64 visualizzazioni senza errori JavaScript, scorrimento orizzontale o violazioni CSP.
- Accessibilità (axe-core, WCAG 2.1 AA): corretti contrasto e nome accessibile del logo; resta solo il logotipo (eccezione WCAG).
- Prestazioni e carico: misure reali e limiti in [AUDIT_FASE_34.md](AUDIT_FASE_34.md) §11. Lighthouse non eseguito (permesso negato dall'ambiente).
- **Non testati**: flussi autenticati nell'interfaccia sul progetto Supabase reale, email e push reali, caricamenti reali, job pianificati in produzione, dispositivi fisici.
