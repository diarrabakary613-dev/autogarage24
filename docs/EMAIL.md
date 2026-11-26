# Email

Analisi completa e proposta: documento «Analisi del sistema email e integrazione con Resend» (26/11/2026).

## Tre canali separati
| Tipo | Chi invia | Mittente consigliato |
|---|---|---|
| Email di accesso: conferma della registrazione, recupero password, cambio email | **Supabase Auth**, tramite l'SMTP del provider | `accesso@` su un sottodominio dedicato |
| Email di servizio: richieste, preventivi, appuntamenti, messaggi, recensioni, assistenza | Coda `email_outbox` → Edge Function `send-emails` | `EMAIL_FROM`, es. `notifiche@notifiche.<dominio>` |
| Email promozionali (Growth Center, solo dopo approvazione del fondatore) | Stessa coda, modello `marketing` | `EMAIL_FROM_MARKETING`, su un **sottodominio separato** |

## Come funziona la coda
1. Le funzioni del database inseriscono le email in `public.email_outbox`, **solo** se l'utente ha attivato quel tipo di email in *Impostazioni › Notifiche*. Una chiave di deduplicazione impedisce doppioni.
2. La Edge Function `supabase/functions/send-emails` (logica in `lib.ts`, coperta dai test `tests/unit/send-emails.test.ts`):
   - riprende le email rimaste «in_invio» da più di 15 minuti (esecuzione interrotta);
   - invia solo le email «dovute»: attesa crescente dalla creazione (0, 5, 20, 80, 320 minuti), massimo 5 tentativi;
   - circa 6 invii al secondo, sotto il limite di 10 richieste/s di Resend; `Idempotency-Key` = id dell'email contro i doppi invii;
   - errori **definitivi** (indirizzo o contenuto non validi): nessun nuovo tentativo;
   - errori di **configurazione** (chiave, mittente, dominio) o **limite di invio**: il giro si ferma senza consumare tentativi;
   - errori **temporanei** (server, rete): nuovo tentativo più tardi.
3. Email promozionali:
   - partono **solo** se è impostato `EMAIL_FROM_MARKETING`;
   - hanno sempre il link di disiscrizione nel testo e le intestazioni `List-Unsubscribe` + `List-Unsubscribe-Post` (disiscrizione con un clic, RFC 8058) verso `/api/disiscrizione/<token>`;
   - senza un link di disiscrizione valido vengono **bloccate** e mai inviate.
4. Nei log e in `last_error` solo codici tecnici: mai indirizzi o testi.

## Stato
- Coda, funzione e modelli: **pronti**, non distribuiti.
- Provider: **non configurato** (richiede la tua scelta e approvazione).
- Ancora da fare (con approvazione): job pianificato che avvia la funzione; cancellazione automatica delle email inviate dopo 30–90 giorni.

## Modelli delle email di accesso (Supabase Auth)
In `supabase/templates/`, in italiano, con il link standard `{{ .ConfirmationURL }}`:

| Supabase → Authentication → Emails | File | Oggetto consigliato |
|---|---|---|
| Confirm signup | `conferma-registrazione.html` | Conferma il tuo indirizzo email |
| Reset password | `recupero-password.html` | Reimposta la password di AutoGarage24 |
| Change email address | `cambio-email.html` | Conferma il nuovo indirizzo email |

Si incollano a mano nel pannello di Supabase (copia il contenuto del file nel campo «Body»). Non sono ancora stati applicati.

## Configurazione (quando approvata)
1. Account sul provider (**Resend**; piano gratuito: 3.000 email al mese e 100 al giorno, condivise con le email di accesso — verifica i prezzi attuali sul sito ufficiale).
2. Verifica del dominio di invio: record **SPF, DKIM** e **DMARC** forniti dal provider. *Modifica DNS: solo con la tua approvazione.*
3. Supabase → Edge Functions → Secrets: `RESEND_API_KEY` (solo permesso di invio), `EMAIL_FROM`, `SITE_URL`, `CRON_SECRET`; `EMAIL_FROM_MARKETING` solo quando si vorranno inviare promozionali.
4. Distribuzione: `supabase functions deploy send-emails --no-verify-jwt`.
5. Esecuzione ogni 5 minuti (Supabase → Integrations → Cron, tipo «Edge Function», intestazione `Authorization: Bearer <CRON_SECRET>`).
6. Supabase → Authentication → SMTP: host `smtp.resend.com`, porta 465, utente `resend`, password = una **seconda** chiave Resend solo per l'invio. Poi alzare il limite in Authentication → Rate Limits (con SMTP personalizzato parte da 30 all'ora).
7. Incollare i modelli in italiano; disattivare il tracciamento dei clic nel dominio Resend (può alterare i link di conferma).
8. Test solo con indirizzi propri e con gli indirizzi di prova di Resend (`delivered@resend.dev`, `bounced@resend.dev`).
