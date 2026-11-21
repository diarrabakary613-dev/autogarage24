# Messa online (deployment)

> **Nulla è stato pubblicato.** Questo documento prepara il lancio. Ogni passaggio con costi, effetti sul dominio o sulla produzione richiede l'approvazione del fondatore.

## 1. Ambienti
| Ambiente | Applicazione | Database | Variabili | Dati |
|---|---|---|---|---|
| **Development** | `npm run dev` sul computer | Supabase locale o progetto di sviluppo | `.env.local` (mai nel repository) | Solo dati di prova |
| **Staging** (prova) | Seconda Web App o sottodominio protetto (es. `prova.<dominio>`, non indicizzato) | **Progetto Supabase separato** (non esiste ancora: crearlo richiede approvazione) | Variabili del pannello hosting, con il proprio `NEXT_PUBLIC_SITE_URL` | Solo dati di prova, cancellabili |
| **Production** | Web App sul dominio principale | Progetto `mcjlyqplfiyhrxvazzzk` (eu-central-1) | Variabili del pannello hosting | **Solo dati reali**: nessun account o annuncio di prova |

Regole: chiavi diverse per ogni ambiente; mai copiare dati reali in staging senza anonimizzarli; ogni migrazione passa prima da staging (o almeno da `npm run test:db`). L'elenco completo delle variabili è in [`.env.example`](../.env.example).

## 2. Hosting: Hostinger "Unlimited"
AutoGarage24 è un'applicazione **Next.js con parti eseguite sul server** (pagine dinamiche, azioni, `/api/health`, `/api/account/export`). Non può essere caricata come sito statico: serve un hosting **Node.js**.

Secondo la documentazione Hostinger (verificata il 19/11/2026), le applicazioni Node.js ("Web App") sono supportate sui piani **Business/Unlimited** e **Cloud**, con riconoscimento di Next.js, Node 18–24 e deploy da GitHub o archivio. Il piano "Unlimited" **dovrebbe essere compatibile**, ma va verificato in hPanel:
1. hPanel → Siti web → **Crea sito** → deve comparire **Web App / Node.js**.
2. Controllare i limiti del piano (numero di app Node.js, memoria, processi).

Se l'opzione non compare, alternative (da approvare, con costi da verificare al momento della scelta): Hostinger Cloud, Vercel (Pro per uso commerciale), VPS.

## 3. Variabili d'ambiente
| Variabile | Dove | Note |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Hosting (build e runtime) | URL del progetto dell'ambiente |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Hosting | Chiave **pubblica** (mai la secret) |
| `NEXT_PUBLIC_SITE_URL` | Hosting | Es. `https://www.<dominio>` |
| `NEXT_PUBLIC_GA4_ID`, pixel | Hosting, **facoltative** | Solo dopo la cookie policy approvata: attivano il banner di consenso |
| `SUPABASE_SECRET_KEY` | **solo** sul computer del fondatore per `npm run admin:bootstrap` | Mai sull'hosting, mai con prefisso `NEXT_PUBLIC_` |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `CRON_SECRET` | **Supabase → Edge Functions → Secrets** | Per la funzione `send-emails`, non sull'hosting |

Le variabili `NEXT_PUBLIC_*` sono incluse nella build (anche nella Content Security Policy e negli indirizzi delle immagini): dopo una modifica serve una nuova build.

## 4. Supabase (per ogni ambiente)
1. **Migrazioni**: 30 nel repository. In produzione ne sono applicate 29; la **0030** (`launch_support_kpi`: categorie Reclamo e Supporto partner, cruscotto di lancio) è **in attesa di approvazione**. Mai modificare una migrazione già applicata.
2. Dopo ogni migrazione: Advisors (sicurezza e prestazioni) e rigenerazione dei tipi (`src/lib/supabase/database.types.ts`).
3. **Authentication → URL Configuration**: Site URL = `NEXT_PUBLIC_SITE_URL`; Redirect URL: `https://<dominio>/auth/confirm`.
4. **Authentication → Providers**: email attiva, conferma email obbligatoria, accesso anonimo disattivato.
5. **Authentication → SMTP**: provider email reale (l'invio integrato di Supabase è solo per test).
6. **Email della piattaforma** ([EMAIL](EMAIL.md)): secret, `supabase functions deploy send-emails --no-verify-jwt`, pianificazione ogni 5 minuti con l'intestazione `Authorization: Bearer <CRON_SECRET>`.
7. **pg_cron**: attivo in produzione con 11 job (promemoria, scadenze, pulizie). Controllo: Integrations → Cron.
8. **Piano**: il Free mette in pausa i progetti inattivi e non offre backup scaricabili. Per la produzione valutare il **Pro** (a pagamento, da approvare).

## 5. Procedura di pubblicazione (quando approvata)
1. **Controllo locale**: `npm run predeploy` (Node, variabili, nessun segreto pubblico, installazione pulita, audit delle dipendenze, typecheck, lint, test, test del database, build). Deve finire senza errori.
2. **Backup** del database di produzione (`pg_dump`, [BACKUP_RESTORE §3](BACKUP_RESTORE.md)) e verifica del file.
3. **Migrazioni** in attesa: prima in staging, poi in produzione; Advisors senza nuovi avvisi.
4. **Codice** su un repository GitHub **privato**.
5. hPanel → Web App → importa il repository → Next.js, build `npm run build`, avvio `npm start`, Node 22.
6. Inserire le variabili del §3 e avviare la build.
7. **Smoke test**: `npm run smoke -- https://<dominio>` (salute del database, HTTPS, intestazioni di sicurezza, 30 pagine pubbliche, aree protette, robots, sitemap, 404). Se nel terminale sono impostate `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (chiave pubblica), controlla anche le impostazioni di Auth.
8. **Primo amministratore**: `npm run admin:bootstrap` dal computer del fondatore.
9. **Controlli manuali**: registrazione e conferma email, accesso, recupero password, pubblicazione di un annuncio fino alla moderazione, richiesta di preventivo, messaggio, appuntamento, assistenza — con account reali del team, poi rimossi o mantenuti come account staff.
10. **Dominio e HTTPS**: collegare il dominio alla Web App e attivare SSL in hPanel. *Modifica DNS: solo con approvazione.*
11. [Checklist di lancio](LAUNCH_CHECKLIST.md) e [rapporto di prontezza](LAUNCH_READINESS_REPORT.md) aggiornati.

Durante la Beta privata il sito può restare su un indirizzo non pubblicizzato; l'apertura al pubblico è una decisione separata del fondatore.

## 6. Monitoraggio
- Uptime: collegare `/api/health` a un servizio di monitoraggio (es. piano gratuito di UptimeRobot) — da attivare.
- Errori applicativi: `/admin/sistema`; log di Hostinger; Supabase → Logs (database, auth, realtime, funzioni).
- Email: `/admin/sistema` mostra la coda e gli invii falliti.
- Indicatori: `/admin/lancio` (cruscotto di lancio) e `/admin/analytics`.
- Incidenti: [INCIDENTI_E_CONTINUITA](INCIDENTI_E_CONTINUITA.md).

## 7. Rollback
| Cosa | Come | Quando |
|---|---|---|
| Codice | hPanel → ridistribuire il deploy o il commit precedente (oppure `git revert` e push) | Errori dopo un deploy, smoke test rosso |
| Variabili | Ripristinare i valori precedenti e rifare la build | Variabile errata |
| Migrazione | Nuova migrazione correttiva; il ripristino del backup è l'ultima risorsa perché perde i dati scritti nel frattempo | Errore di schema o di permessi |
| Contenuti CMS | Storico in `/admin/contenuti`, ritiro della pubblicazione con un clic | Testo errato |
| Funzioni rischiose | Interruttori nel pannello (Rewards, automazioni, venditori privati) | Comportamento anomalo |

Dopo ogni rollback: `npm run smoke -- <url>` e annotazione nel registro incidenti.
