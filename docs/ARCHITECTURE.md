# Architettura

## In breve

```
Browser ──► Next.js (pagine + azioni server) ──► Supabase
                │                                 ├─ Auth (account, sessioni)
                │                                 ├─ PostgreSQL + RLS (dati e permessi)
                └─ proxy.ts: rinnovo sessione      └─ Storage (immagini e documenti)
```

- **Next.js 16 (App Router) + React 19 + TypeScript**: pagine, interfaccia e logica server.
- **Tailwind CSS 4**: stile, con i colori del brand definiti come token in `src/app/globals.css`.
- **Supabase**: autenticazione, database, archiviazione file. Le regole di accesso stanno **nel database** (RLS), quindi restano valide anche se qualcuno chiamasse le API direttamente.

## Principi

1. **Il database è l'ultima linea di difesa.** Ogni tabella ha RLS attiva; i privilegi sono concessi colonna per colonna dove serve (es. un utente non può modificare il proprio stato account).
2. **Autorizzazione sempre lato server.** Pagine e azioni protette passano da `src/lib/auth/session.ts` (`requireUser`, `requireAdmin`). Nascondere un pulsante non è mai considerato una protezione.
3. **Operazioni amministrative tramite funzioni del database** (`admin_*`) che verificano il ruolo e scrivono l'audit log nella stessa transazione.
4. **Nessun dato inventato.** Le sezioni senza dati reali mostrano stati vuoti espliciti.
5. **Testi centralizzati** in `src/i18n/` per aggiungere altre lingue in futuro.

## Struttura delle cartelle

```
src/
  app/                    Pagine (una cartella = un indirizzo del sito)
    (auth)/               accedi, registrati, recupera-password, aggiorna-password
    (legal)/              privacy, cookie, termini (bozze)
    auth/confirm/         destinazione dei link inviati per email
    dashboard/            area personale
    admin/                pannello di amministrazione
    design-system/        catalogo dei componenti (non indicizzato)
  components/
    ui/                   componenti base: pulsanti, campi, avvisi, badge, card, skeleton
    layout/               header, footer, menu mobile, logo
    auth/                 moduli di accesso e registrazione
  config/                 marchi, media, menu, contatti, SEO
  content/                testi della homepage e delle pagine pubbliche
  components/marketing/   sezioni della homepage e delle pagine pubbliche
  i18n/                   testi dell'interfaccia
  lib/
    auth/                 ruoli, sessione, azioni di autenticazione, redirect sicuri
    supabase/             client per browser, server e proxy; tipi del database
    validation/           regole di validazione dei moduli (zod)
  proxy.ts                rinnovo sessione + controllo rapido aree protette
supabase/
  migrations/             schema del database, versionato
  tests/                  test di sicurezza del database
scripts/                  test-db.sh, bootstrap-admin.mjs
tests/unit/               test automatici del codice
docs/                     documentazione
```

## Scelte tecniche

| Scelta | Motivo |
|---|---|
| Cache Components di Next.js 16 attivi | Le parti statiche si caricano subito, quelle personali arrivano in streaming dietro `<Suspense>` |
| Font Inter e Manrope serviti dal sito | Nessuna richiesta a Google Fonts (privacy/GDPR) e nessuna dipendenza esterna |
| `notFound()` per aree non autorizzate | Non riveliamo l'esistenza delle pagine riservate |
| Campo trappola anti-bot nella registrazione | Riduce lo spam senza ostacolare le persone; CAPTCHA previsto prima del lancio |
| Tipi del database scritti a mano | Saranno rigenerati automaticamente appena collegato il progetto Supabase |

---

## Aggiornamento Fasi 3–10
- **Dati**: `src/lib/data/*` (lettura, con cache `"use cache"` e tag invalidati dalle azioni: `listings`, `listing:<slug>`, `profiles`, `profile:<slug>`, `neo-rules`, `parts`).
- **Azioni**: `src/lib/actions/*` (scrittura, sempre lato server, validazione con Zod, chiamate RPC con i permessi dell'utente).
- **Logica di dominio pura e testata**: `src/lib/neopatentati/engine.ts` (identica alla funzione SQL), `src/lib/parts/compatibility.ts`, `src/lib/professionals/hours.ts`, `src/lib/garage/symptoms.ts`, `src/config/cms.ts`.
- **Tempo reale**: Supabase Realtime per chat e notifiche (`chat-view`, `realtime-refresh`).
- **Mappe**: Leaflet + tile OpenStreetMap, caricate solo nel browser; nessuna chiave API.
- **Email**: coda nel database + Edge Function `supabase/functions/send-emails` (non distribuita).
- **Pannello**: `src/app/admin/*`, ogni pagina verifica il permesso; menu filtrato per ruolo.
- Con `cacheComponents` attivo, ogni accesso a dati dinamici è dentro un `<Suspense>`; 89 percorsi in build.
