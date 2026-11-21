# Email transazionali

## Come funziona
1. Le funzioni del database inseriscono le email in `public.email_outbox` (es. nuova richiesta, preventivo, appuntamento, promemoria), **solo** se l'utente ha attivato quel tipo di email in *Impostazioni › Notifiche*. Una chiave di deduplicazione impedisce doppioni.
2. La Edge Function `supabase/functions/send-emails` legge la coda, invia tramite il provider e segna ogni email come `inviata` o `errore` (max 5 tentativi). I log non contengono indirizzi o testi.
3. Le email di registrazione, conferma e recupero password sono inviate da **Supabase Auth** (non dalla coda).

## Stato
- Coda e funzione: **pronte**, non distribuite.
- Provider: **non configurato** (richiede la tua scelta e approvazione).

## Configurazione (quando approvata)
1. Crea un account sul provider (il codice usa **Resend**; piano gratuito con limite di invii giornalieri, piani a pagamento oltre — verifica i prezzi attuali).
2. Verifica il dominio di invio: il provider fornisce record **SPF, DKIM** (e consiglia **DMARC**) da aggiungere al DNS del dominio. *Modifica DNS: solo con la tua approvazione.*
3. In Supabase → Edge Functions → Secrets: `RESEND_API_KEY`, `EMAIL_FROM` (es. `AutoGarage24 <notifiche@tuodominio.it>`), `SITE_URL`, `CRON_SECRET` (stringa casuale lunga).
4. Distribuisci la funzione: `supabase functions deploy send-emails --no-verify-jwt`.
5. Pianifica l'esecuzione ogni 5 minuti (Supabase → Integrations → Cron, tipo "Edge Function", intestazione `Authorization: Bearer <CRON_SECRET>`).
6. Per le email di Auth: Supabase → Authentication → SMTP → usa lo stesso provider (il servizio di invio integrato di Supabase ha limiti molto bassi, adatti solo ai test).

## Comunicazioni promozionali
Non vengono mai inviate dalla coda. Il consenso marketing è separato (profilo → `marketing_consent`) e va usato solo con uno strumento dedicato e un'informativa aggiornata.
