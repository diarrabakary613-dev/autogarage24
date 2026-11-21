# Guida al pannello di amministrazione

Per il fondatore e lo staff. Ogni azione importante viene registrata nel **Registro attività** con chi, cosa e quando.

## 1. Accedere al pannello
1. Vai su `/accedi` ed entra con il tuo account.
2. Nel menu dell'area personale clicca **Pannello amministrativo** (o vai su `/admin`).
3. Il menu a sinistra mostra solo le sezioni consentite al tuo ruolo:
   - **Super Admin / Admin**: tutto (solo il Super Admin nomina altri amministratori).
   - **Moderatore**: utenti (lettura), annunci, segnalazioni, recensioni, statistiche.
   - **Operatore assistenza**: utenti (lettura), ticket, segnalazioni.

Primo accesso in assoluto: dopo aver creato il tuo account, chi gestisce il server esegue una sola volta `npm run admin:bootstrap -- tua@email.it`.

## 2. Panoramica e statistiche (`/admin`)
Scegli l'intervallo (7, 30, 90 giorni, 1 anno). I numeri vengono dal database: utenti, annunci, richieste, preventivi, appuntamenti, ticket, segnalazioni, email in errore. Clicca un riquadro per andare alla sezione collegata.

## 3. Gestire utenti e ruoli (`/admin/utenti`)
1. Cerca per email o nome, filtra per ruolo o stato.
2. Apri l'utente: vedi ruoli, stato, data di registrazione.
3. **Sospendere**: scegli "Sospeso", scrivi la motivazione, conferma. L'utente non può più operare.
4. **Ruoli**: "Assegna" o "Revoca" e scegli il ruolo. Non puoi modificare il tuo account né i tuoi ruoli.

## 4. Approvare gli annunci (`/admin/moderazione`)
1. Scheda **Automobili** → filtro "In revisione".
2. Per ogni annuncio controlla le spunte verdi/rosse (anno, km, prezzo, foto, dichiarazioni del venditore, dati per neopatentati; per le auto del Field Manager anche l'autorizzazione del venditore).
3. Decisione: **Approva e pubblica**, **Approva** (pubblica il venditore), **Richiedi modifiche** o **Rifiuta** (motivazione obbligatoria, la vede il venditore).
4. Un annuncio pubblicato si può **sospendere** in qualsiasi momento.
5. Stesse operazioni per **Ricambi**; in **Servizi** puoi disattivare un servizio scorretto.

## 5. Verificare i professionisti (`/admin/verifiche`)
1. **Profili** → "Inviato": leggi descrizione, indirizzo, referente, dati aziendali.
2. Metti "In verifica" mentre controlli, poi **Approva e pubblica** o **Rifiuta** (con nota).
3. **Richieste di verifica**: apri i documenti (collegamenti validi 5 minuti), approva solo se corrispondono. Approvando si assegna il badge corrispondente: *Identità*, *Attività* o *Documenti*.
4. **Certificazioni**: verifica l'attestato prima di renderlo pubblico.
5. Se un documento scade o era falso: **Revoca badge** con motivazione.
Ricorda: un badge indica un controllo di identità o di dati, non la qualità del lavoro.

## 6. Segnalazioni (`/admin/segnalazioni`)
1. Le segnalazioni aperte sono in cima, per priorità.
2. Assegnale a te, imposta "In esame", indaga dalla sezione collegata.
3. Per una conversazione segnalata puoi leggerla solo indicando una **motivazione** (resta nel registro).
4. Chiudi con "Risolta" scrivendo la decisione. Nessun utente viene sospeso automaticamente: se serve, fallo da *Utenti*.

## 7. Recensioni (`/admin/recensioni`)
Vedi le recensioni segnalate; puoi metterle "In moderazione" o "Nascosta" con motivazione. Non si possono modificare i testi.

## 8. Assistenza clienti (`/admin/supporto`)
1. Apri un ticket, scegli "Assegna a me": entri nella conversazione.
2. Clicca **Rispondi** e scrivi all'utente da *Messaggi*.
3. Aggiorna lo stato: In lavorazione → In attesa dell'utente → Risolta → Chiusa.

## 9. Field Manager (`/admin/field-manager`) — anche da smartphone
1. **Nuovo contatto**: nome attività, tipologia, referente, telefono, città, prossimo follow-up.
2. Dopo una visita: apri il contatto → **Registra visita o contatto** (tipo, esito, note, nuovo stato, prossimo follow-up). In cima all'elenco compaiono i follow-up scaduti.
3. **Nuova auto raccolta**: si apre la stessa procedura di pubblicazione degli annunci (6 passaggi, foto incluse), collegata al contatto.
4. **Registra autorizzazione**: chi ha autorizzato, quando, come (modulo firmato, email…), cosa (pubblicazione, foto, prezzo) e allega il documento. **Senza autorizzazione l'annuncio non può essere pubblicato.**
5. **Nuova ispezione** (Controllo AutoGarage24): esito per ogni voce, osservazioni, riparazioni consigliate. Salvata in bozza, poi **Pubblica** per mostrarla sulla scheda.
6. Invia l'annuncio in revisione dal passaggio 6 e approvalo da *Moderazione*.

## 10. Regole neopatentati (`/admin/neopatentati`)
Quando cambia la legge:
1. Compila **Nuova versione**: nome, date di validità, periodo delle patenti interessate, limiti (mesi, kW/t, kW), fonti ufficiali (una per riga: `Titolo | https://…`), data di consultazione, motivazione.
2. **Esegui test**: vedi quanti annunci risulterebbero compatibili / non compatibili / da verificare e quanti esiti cambierebbero.
3. **Pubblica** con motivazione: gli annunci vengono ricalcolati, lo storico precedente resta.
4. Una versione pubblicata non si modifica: si crea una nuova versione e si archivia la vecchia.
Usa "Prova su un veicolo di esempio" per controllare casi particolari. Aggiorna anche `docs/NEOPATENTATI_LEGISLAZIONE.md`.

## 11. Modificare i contenuti del sito (`/admin/contenuti`)
1. Scegli il contenuto a sinistra (titolo della homepage, avviso importante, contatti, FAQ…).
2. Scrivi i testi (solo testo semplice, i tag vengono rimossi), scegli "Mantieni come bozza", **Salva**.
3. Controlla l'anteprima, poi salva con "Pubblica subito".
4. Per tornare al testo predefinito: **Ritira la pubblicazione**. Lo storico mostra ogni modifica.

## 12. Altre sezioni
- **Categorie**: aggiungi o disattiva categorie di attività e di ricambi.
- **Piani commerciali**: struttura dei piani futuri, sempre **non attivi** (nessun pagamento è abilitato).
- **Privacy e cancellazioni**: gestisci le richieste entro 30 giorni; "Completata" è irreversibile.
- **Email e sistema**: email in coda e fallite, link al controllo di salute.
- **Registro attività**: tutte le operazioni amministrative, filtrabili per azione.

## 13. Acquisizione partner (`/admin/acquisizione`) — CRM unico con il Field Manager
- **Dashboard fondatore**: contatti, officine contattate, partner registrati/attivi, conversione, follow-up scaduti, auto dichiarate, obiettivo 20 Founding Partners.
- **Pipeline**: colonne per stato; ← → sposta il contatto. Su smartphone scorri in orizzontale.
- **Contatti**: cerca, filtra, crea. Nella scheda: registra telefonata/visita/email/WhatsApp con referente, auto disponibili, interesse e prossima azione; lo storico è automatico e non si può cancellare.
- **Candidature**: arrivano dai moduli del sito; «Accetta» porta il contatto a «In attesa di registrazione». Rispondi tu all'interessato (nessun invio automatico).
- **Founding Partners**: ammetti dalla scheda del contatto, collegando il profilo pubblico; il badge compare solo se il profilo è pubblicato. Nessun prezzo o sconto viene creato.
- **Iscritti Beta**: segna «Invitato» dopo aver scritto tu all'iscritto.

## 14. Centro marketing (`/admin/marketing`)
Campagne (con codice UTM), creatività e contenuti, calendario (mese/lista), generatore di brief (modelli a regole), landing con risultati, pubblico, risultati per campagna, esperimenti (vincitore solo con dati sufficienti), budget (approva solo il Super Admin). «Pubblicato» richiede data e link reali. Prompt Higgsfield: vanno usati nell'app Higgsfield.

## 15. Analytics (`/admin/analytics`)
Visite (ingressi), registrazioni, candidature, partner approvati, auto, officine, meccanici, richieste, conversioni, funnel, sorgenti e dispositivi. Nessun dato personale.

## 16. Officine e professionisti (`/admin/professionisti`)
Elenco per tipologia e stato; approva, rifiuta, sospendi o riattiva (motivazione obbligatoria per rifiuto e sospensione); vedi media recensioni e segnalazioni aperte.

## 17. Moderazione annunci: nuove funzioni
Filtri per marca, modello, prezzo, categoria e «adatte ai neopatentati»; «Modifica testo e prezzo» (motivazione inviata al venditore); «Elimina definitivamente» solo per annunci non pubblici, con motivazione registrata.

## Fasi 21–30: nuove sezioni del pannello
- **Offerte e coupon** (`/admin/offerte`): approva, rifiuta o sospendi; prima di approvare verifica che il prezzo originale sia credibile. Statistiche e controllo dei coupon.
- **Impostazioni** (`/admin/impostazioni`): approvazione offerte, annunci dei privati, regole della stima interna, regole delle revisioni (`inspection_rules`: aggiorna fonte e data se la norma cambia). Ogni modifica va nel registro attività.
- **Prenotazioni auto** (`/admin/prenotazioni`): consulta e annulla con motivo in caso di abusi.
- **Soccorso, trasporti, revisioni** (`/admin/servizi`): attiva un operatore solo dopo aver controllato visura e autorizzazioni (scrivi nel campo motivazione cosa hai verificato); verifica le concessioni dei centri revisione aprendo il documento; gestisci contestazioni e annullamenti.
- **Partner assicurativi** (`/admin/assicurazioni`): registra solo soggetti iscritti al RUI o all'Albo IVASS, annota data ed esito della consultazione e l'informativa privacy; abilita i referenti per email; registra le integrazioni senza mai inserire chiavi.
- **Valutazioni e permute** (`/admin/valutazioni`): statistiche e proposte anomale.
- **Business Center** (`/admin/business`): panoramica dei partner e limiti dei piani. Sono assegnabili solo i piani attivi (oggi Free).
- Le verifiche sugli annunci (documentazione, identità del venditore, dati tecnici) si registrano dalla **Moderazione**, con la descrizione dei documenti esaminati.

## Fasi 31–34: nuove sezioni del pannello
- **Rewards e inviti** (`/admin/rewards`): il programma è spento. Prima di premere «Attiva il programma» servono regolamento definitivo e parere su DPR 430/2001 e fisco. Qui si approvano i premi proposti dai partner, si controllano gli inviti segnalati come sospetti, si fanno rettifiche (sempre con motivazione, mai sul proprio saldo) e si revocano punti assegnati per errore.
- **Growth Center** (`/admin/growth`): indicatori con filtri ed esportazione CSV; *Landing page* senza codice con esperimento A/B; *Email promozionali*: si scrive il messaggio, lo si invia al fondatore, il fondatore approva, poi si preme «Invia ora» (con l'anteprima di quante persone hanno il consenso); *Automazioni*: spente, si accendono solo dal fondatore; *Pixel e integrazioni*: stato degli ID configurati.
- **SEO Manager** (`/admin/seo`): controlli di qualità con il link per correggere, articoli del blog (bozza, programmato, pubblicato, anteprima), categorie, titoli e descrizioni delle pagine principali, redirect, sitemap e robots, Search Console e GA4.
- **Email e sistema**: ora mostra anche gli errori dell'applicazione (senza dati personali).
- Partner: **Premi Rewards** (`/dashboard/rewards/partner`) per proporre premi e convalidare i codici dei clienti.

## Fase 35: lancio
- **Cruscotto di lancio** (`/admin/lancio`, permesso Analytics): indicatori del marketplace, dei partner, dei clienti, del marketing e della qualità, per 7, 30, 90 o 365 giorni. Solo dati reali: «—» quando un valore non è calcolabile (per esempio il costo di acquisizione senza spesa registrata). Richiede la migrazione 0030.
- **Assistenza** (`/admin/supporto`): nuove categorie **Reclamo** e **Supporto partner**, con avviso dedicato allo staff (0030). Gestire per primi i reclami.
- **Centro assistenza pubblico** (`/assistenza`): canali, domande frequenti e contatti ufficiali, che compaiono quando sono inseriti in `src/config/site.ts`.
- Routine quotidiana e procedure: [Manuale amministratore](manuali/MANUALE_AMMINISTRATORE.md); incidenti: [INCIDENTI_E_CONTINUITA](INCIDENTI_E_CONTINUITA.md).
