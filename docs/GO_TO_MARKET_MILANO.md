# Go-to-market Milano — Beta e piano operativo di 30 giorni

> Gli obiettivi qui sotto sono **traguardi da raggiungere**, non risultati ottenuti. Nessun partner è stato contattato e nessuna comunicazione è stata inviata.

## 1. Strategia di lancio in tre momenti

| Momento | Chi accede | Cosa si apre | Durata indicativa |
|---|---|---|---|
| **1. Beta privata** | Founding Partners invitati + 30–50 utenti iscritti alla Beta (amici, famiglie di neopatentati, clienti dei partner) | Tutto il sito, ma senza promozione; `noindex` facoltativo | 4–6 settimane |
| **2. Beta pubblica locale** | Chiunque a Milano e provincia | Sito indicizzato, landing di campagna, prime inserzioni a budget limitato (se approvato) | 2–3 mesi |
| **3. Espansione progressiva** | Altre città (Monza-Brianza, Bergamo, Torino…) | Una città alla volta, replicando il programma Founding Partners | Dopo i criteri |

### Criteri misurabili per passare alla fase successiva
**Beta privata → Beta pubblica** (tutti necessari):
- Migrazioni applicate in produzione, advisors Supabase senza criticità, email transazionali funzionanti.
- Pagine legali definitive approvate da un legale (vedi [CONTROLLO_LEGALE_BETA.md](CONTROLLO_LEGALE_BETA.md)).
- ≥ 10 partner registrati e approvati, di cui ≥ 5 officine/meccanici e ≥ 3 concessionari/venditori.
- ≥ 40 annunci auto pubblicati con autorizzazione, di cui ≥ 15 con esito «compatibile» per neopatentati.
- ≥ 10 richieste reali concluse (preventivo o appuntamento) senza errori bloccanti.
- Nessun bug bloccante aperto da più di 7 giorni; tempo medio di prima risposta dei partner < 24 ore.

**Beta pubblica → Espansione**:
- ≥ 20 Founding Partners attivi a Milano; ≥ 150 annunci pubblicati; ≥ 25 officine/meccanici.
- ≥ 60% delle richieste con una risposta entro 48 ore; ≥ 30% delle richieste di preventivo con un preventivo accettato.
- ≥ 15 recensioni verificate; segnalazioni gestite entro 72 ore.
- Costo per partner acquisito e per utente attivo noto (dati reali in Analytics) e sostenibile secondo il fondatore.

**Regola:** non si comunica il marketplace come «aperto al pubblico» finché i criteri della Beta privata non sono raggiunti.

## 2. Pubblici
Persone che cercano un'auto · Neopatentati e famiglie · Proprietari di auto · Officine e garages · Meccanici indipendenti · Concessionari · Venditori di ricambi. Messaggi per pubblico in [MARKETING_STRATEGY.md](MARKETING_STRATEGY.md).

## 3. Strumenti già pronti nella piattaforma
- Pagine: `/milano`, `/partner`, `/diventa-partner`, `/prima-auto`, `/trova-officina`, `/trova-ricambi`, `/diventa-officina-partner`, `/diventa-concessionario-partner`, `/mappa`, `/richiedi-intervento`.
- Candidature e iscrizioni Beta salvate nel database → `/admin/acquisizione` (candidature, iscritti Beta, CRM).
- CRM unico con Field Manager: pipeline, visite, telefonate, follow-up, Founding Partners, storico.
- Checklist di onboarding nell'area del professionista.
- Analytics senza cookie (`/admin/analytics`) e Centro marketing (`/admin/marketing`).
- Materiali commerciali: [MATERIALI_COMMERCIALI.md](MATERIALI_COMMERCIALI.md).

## 4. Piano operativo di 30 giorni

### Settimana 1 — Verifica prodotto e preparazione
| Giorno | Attività | Responsabile | Esito atteso |
|---|---|---|---|
| 1 | Confermare le migrazioni su Supabase; nominare il primo amministratore | Fondatore + tecnico | Database completo |
| 1–2 | Configurare email (provider + DNS) e hosting; deploy su ambiente di prova | Tecnico (con approvazione costi) | Sito di prova raggiungibile |
| 2–3 | Test end-to-end con 5 account separati sull'ambiente di prova (vedi §6 del report Fasi 11–20) | Fondatore + 2 tester | Lista bug |
| 3 | Consegnare le bozze legali al legale | Fondatore | Revisione avviata |
| 3–4 | Stampare/esportare i materiali commerciali; personalizzare email e WhatsApp | Fondatore | Kit pronto |
| 4–5 | Lista iniziale: 80 potenziali partner in Milano (40 officine/meccanici, 25 concessionari/venditori, 15 ricambi), inseriti in `/admin/acquisizione` come «Nuovo contatto» | Fondatore / collaboratore | 80 contatti nel CRM |
| 5 | Scegliere 3 quartieri pilota (es. Città Studi, Navigli, Lambrate) per le visite | Fondatore | Percorso visite |

### Settimana 2 — Primo contatto
- 40 primi contatti (telefono o visita), registrati come attività nel CRM con esito e prossima azione.
- Presentazione del programma Beta e Founding Partners (gratuito, nessun prezzo o sconto permanente).
- Invio della presentazione via email **manualmente**, solo a chi ha dato il consenso al contatto.
- **Obiettivi**: 40 contatti «Primo contatto effettuato», 15 «Interessato», 8 «In trattativa / In attesa di registrazione».

### Settimana 3 — Onboarding e annunci reali
- Sessioni di configurazione (30–45 minuti) con i partner interessati: profilo, servizi, orari, documenti per la verifica.
- Raccolta annunci auto con **autorizzazione documentata** (Field Manager → autorizzazione + ispezione facoltativa).
- Test delle richieste: 2–3 richieste reali per officina (amici/famiglie in Beta), con preventivo e appuntamento.
- **Obiettivi**: 10 partner registrati, 6 approvati, 30 annunci pubblicati, 10 richieste inviate.

### Settimana 4 — Analisi e preparazione Beta pubblica
- Lettura di `/admin/analytics` e `/admin/acquisizione`: tasso di conversione contattati → registrati, tempi di risposta, errori.
- Interviste di 15 minuti a 5 partner e 5 utenti (feedback strutturato).
- Correzione dei problemi emersi; aggiornamento FAQ e materiali.
- Verifica dei criteri di §1; decisione del fondatore sulla Beta pubblica.
- **Obiettivi**: 15 partner registrati (di cui ≥ 10 Founding), 40 annunci, 15 richieste con risposta, elenco bug chiuso.

### Ritmo settimanale
Lunedì: revisione pipeline e follow-up scaduti (il CRM li evidenzia) · Martedì–giovedì: visite e telefonate · Venerdì: onboarding e analisi.

## 5. Rischi principali
| Rischio | Mitigazione |
|---|---|
| Pochi annunci all'avvio → pagine vuote | Lancio pubblico solo con i criteri §1; landing con stati vuoti onesti |
| Partner che non rispondono alle richieste | Checklist onboarding, promemoria, metrica tempo di risposta |
| Annunci senza autorizzazione | Il sistema blocca la pubblicazione delle auto raccolte senza autorizzazione registrata |
| Aspettative di «clienti garantiti» | Materiali e pagine dicono esplicitamente che non ci sono risultati garantiti |
