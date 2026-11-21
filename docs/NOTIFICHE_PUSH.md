# Notifiche push (predisposizione)

Stato: **non attive**. Già pronti nel database (migrazione 0018):
- `notification_preferences.push` — preferenze per categoria, come per in-app ed email;
- `push_subscriptions` — iscrizioni dei dispositivi (endpoint e chiavi), visibili solo al proprietario.

Per attivarle servono: chiavi VAPID (gratuite, da generare e tenere segrete sul server), un service worker, un pulsante «Attiva notifiche» (solo su richiesta esplicita dell'utente), e l'estensione della funzione `send-emails` (o una nuova Edge Function) per inviare i push dalla coda. I promemoria del Garage sono già generati ogni giorno dal server (`pg_cron`), non da timer nel browser.
