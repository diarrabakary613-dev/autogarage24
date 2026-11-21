# Manuale amministratore — routine operativa del lancio

La guida completa di tutte le sezioni del pannello è in [ADMIN_GUIDE](../ADMIN_GUIDE.md). Qui c'è il **lavoro di tutti i giorni** durante il lancio.

## 1. Accesso e ruoli
- Il primo amministratore si crea una sola volta con `npm run admin:bootstrap` dal computer del fondatore (richiede la chiave segreta, che non va mai condivisa né caricata sull'hosting).
- Gli altri membri dello staff si nominano da **Utenti e ruoli** (`/admin/utenti`) con il ruolo minimo necessario: *moderatore* (annunci, recensioni, segnalazioni), *operatore assistenza* (ticket), *admin* (tutto tranne le decisioni riservate al fondatore).
- Riservato al **super amministratore (fondatore)**: approvare comunicazioni promozionali, attivare automazioni, approvare spese pubblicitarie.

## 2. Routine giornaliera (circa 20–30 minuti)
| Ordine | Dove | Cosa fare | Obiettivo |
|---|---|---|---|
| 1 | **Cruscotto di lancio** (`/admin/lancio`) | Guarda contatti, richieste senza risposta, reclami, errori | Quadro della giornata |
| 2 | **Verifiche** (`/admin/verifiche`) e **Professionisti** | Approva o rifiuta i profili inviati, con motivazione | Entro 24 ore lavorative |
| 3 | **Moderazione** (`/admin/moderazione`) | Approva gli annunci di auto e ricambi in revisione | Entro 24 ore lavorative |
| 4 | **Assistenza** (`/admin/supporto`) | Rispondi ai ticket; i **reclami** hanno precedenza | Prima risposta entro 1 giorno lavorativo |
| 5 | **Segnalazioni** (`/admin/segnalazioni`) | Esamina e decidi (archivia, sospendi il contenuto, avvisa l'utente) | Entro 48 ore |
| 6 | **Sistema** (`/admin/sistema`) | Controlla coda email, invii falliti, errori dell'app | Nessun errore ignorato |

## 3. Come approvare un profilo professionale
1. Controlla che nome, Partita IVA e indirizzo corrispondano a un'attività reale (visura, sito, Google Maps, visita).
2. Controlla che le foto siano reali e senza dati personali di terzi.
3. Controlla descrizione e servizi: niente promesse non verificabili.
4. Approva oppure rifiuta indicando cosa correggere (la motivazione arriva al professionista).
5. I badge di verifica si concedono solo dopo aver visto i documenti; annota la fonte della verifica.

## 4. Come approvare un annuncio d'auto
1. Foto reali dell'auto, senza targhe di altri veicoli né persone riconoscibili.
2. Prezzo plausibile, chilometri e anno coerenti.
3. Per le auto per neopatentati: potenza e tara presenti e coerenti con il modello. Se mancano, l'auto resta «da verificare».
4. Per gli annunci raccolti sul territorio: autorizzazione del venditore registrata nel Field Manager.
5. Approva o rifiuta con motivazione.

## 5. Settimanale
- **Cruscotto di lancio** con periodo 7 giorni: andamento di partner, auto e richieste.
- **Acquisizione** (`/admin/acquisizione`): follow-up scaduti e candidature da esaminare.
- **GDPR** (`/admin/gdpr`): richieste di cancellazione (entro 30 giorni).
- **Audit** (`/admin/audit`): controllo a campione delle azioni dello staff.

## 6. Cosa non fare
- Non creare annunci, profili o recensioni di prova sul sito reale.
- Non inviare comunicazioni promozionali senza approvazione del fondatore e senza consenso degli utenti.
- Non leggere conversazioni private se non per un motivo documentato (la lettura viene registrata).
- Non condividere account dello staff.

## 7. In caso di problemi
Segui la procedura in [INCIDENTI_E_CONTINUITA](../INCIDENTI_E_CONTINUITA.md).
