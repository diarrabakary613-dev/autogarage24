# Continuità operativa e gestione degli incidenti

Complemento a [BACKUP_RESTORE](BACKUP_RESTORE.md) (backup e ripristino) e [DEPLOYMENT](DEPLOYMENT.md) (pubblicazione e rollback).

## 1. Stato attuale dei controlli
| Elemento | Stato | Cosa manca |
|---|---|---|
| Backup del database | Piano Free di Supabase: nessun backup scaricabile garantito | Piano Pro (da approvare) **oppure** `pg_dump` manuale prima di ogni migrazione e almeno settimanale |
| Backup dei file (Storage) | Procedura documentata | Prima copia da fare dopo il caricamento dei primi file reali |
| Prova di ripristino | Procedura documentata | **Da eseguire prima del lancio** su un progetto di prova |
| Health check | ✅ `/api/health` (applicazione + database) | Collegarlo a un servizio di uptime |
| Monitoraggio errori | ✅ Errori dell'app registrati senza dati personali (`/admin/sistema`, conservati 90 giorni); log di Hostinger e Supabase | Un avviso automatico in caso di picco (facoltativo, con il servizio di uptime) |
| Smoke test dopo il deploy | ✅ `npm run smoke -- <url>` | — |
| Rollback | ✅ Procedura in DEPLOYMENT §7 | Prova pratica sull'ambiente di prova |
| Contatti di emergenza | Da compilare (§5) | Nomi e numeri reali |

## 2. Livelli di gravità
| Livello | Esempi | Tempo di presa in carico | Chi decide |
|---|---|---|---|
| **S1 — Critico** | Sito irraggiungibile; dati personali esposti; accesso non autorizzato; dati persi | Subito, anche fuori orario | Fondatore |
| **S2 — Grave** | Registrazione, accesso, richieste o messaggi non funzionano; email bloccate; errori diffusi | Entro 2 ore lavorative | Responsabile tecnico + fondatore |
| **S3 — Moderato** | Una funzione secondaria non va; pagina lenta; errore grafico | Entro 1 giorno lavorativo | Responsabile tecnico |
| **S4 — Minore** | Testo errato, dettaglio grafico | Nel ciclo successivo | Team |

## 3. Procedura in caso di incidente
1. **Rilevare**: avviso dell'uptime, segnalazione di un utente, `/api/health` in errore, picco in `/admin/sistema`.
2. **Valutare** la gravità (§2) e annotare l'ora di inizio nel registro incidenti (documento condiviso: data, ora, sintomo, gravità, azioni, chi).
3. **Contenere**:
   - deploy difettoso → **rollback** al deploy precedente (DEPLOYMENT §7);
   - funzione pericolosa → disattivarla dal pannello (Rewards, automazioni, privati) o sospendere i contenuti coinvolti;
   - sospetta violazione dei dati → ruotare subito le chiavi (Supabase → API Keys; segreti delle Edge Function), sospendere gli account coinvolti, conservare i log;
   - database non raggiungibile → controllare lo stato su status.supabase.com e la pausa del progetto (piano Free).
4. **Comunicare**: se l'incidente dura più di 30 minuti, avviso sui canali ufficiali (social, email ai partner coinvolti) e risposta ai ticket aperti. Un banner di avviso nel sito non esiste ancora: si può aggiungere come miglioramento.
5. **Ripristinare** e verificare con `npm run smoke -- <url>`.
6. **Dati personali**: se c'è una violazione, il fondatore valuta con il legale la notifica al Garante **entro 72 ore** (art. 33 GDPR) e l'avviso agli interessati (art. 34).
7. **Analizzare** entro 5 giorni lavorativi: causa, impatto, cosa cambiare, test aggiunti. Senza colpe personali.

## 4. Casi frequenti e risposta rapida
| Sintomo | Prima azione |
|---|---|
| `/api/health` → `database: "errore"` | Supabase Dashboard: progetto in pausa? (piano Free dopo inattività) → riattivarlo; altrimenti status.supabase.com |
| Nessuna email arriva | `/admin/sistema`: coda e invii falliti; controllare il provider e i secret della funzione `send-emails`; limiti dell'email di Supabase Auth |
| Errori dopo un deploy | Rollback al deploy precedente, poi analisi con `npm run predeploy` in locale |
| Migrazione fallita | Non riprovare alla cieca: leggere l'errore, correggere con una nuova migrazione; ripristino del backup solo come ultima risorsa |
| Contenuto illecito pubblicato | Sospenderlo da Moderazione o Segnalazioni, registrare la motivazione, informare l'autore |
| Account compromesso | Sospendere l'account (`/admin/utenti`), chiedere il cambio password, controllare l'audit (`/admin/audit`) |

## 5. Contatti di emergenza (da compilare con dati reali)
| Ruolo | Nome | Telefono | Email |
|---|---|---|---|
| Fondatore (decisioni S1) | [da compilare] | [da compilare] | [da compilare] |
| Responsabile tecnico | [da compilare] | [da compilare] | [da compilare] |
| Supporto Hostinger | — | — | hPanel → Assistenza |
| Supporto Supabase | — | — | supabase.com/dashboard/support |
| Legale (violazioni dei dati) | [da compilare] | [da compilare] | [da compilare] |

## 6. Routine di continuità
- **Ogni giorno**: controllo di `/admin/sistema` e del cruscotto (routine nel [Manuale amministratore](manuali/MANUALE_AMMINISTRATORE.md)).
- **Ogni settimana**: `pg_dump` (finché si è sul piano Free), controllo dei backup, aggiornamenti di sicurezza (`npm audit`).
- **Ogni mese**: rotazione del `CRON_SECRET` se condiviso, revisione degli accessi dello staff.
- **Ogni trimestre**: prova di ripristino su un progetto di prova.
