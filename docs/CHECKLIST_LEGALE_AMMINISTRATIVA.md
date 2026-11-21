# Checklist legale e amministrativa prima del lancio pubblico

> **Nessun documento legale è definitivo e nessuna conformità è dichiarata.** Le pagine Privacy, Cookie, Termini, Note legali e Regolamento Rewards sono **bozze tecniche** che descrivono come funziona il sistema. Vanno riviste e approvate da professionisti prima dell'apertura al pubblico.
> Legenda: ⚖️ avvocato (digitale, privacy, consumo) · 🧾 commercialista · 👤 fondatore · ✅ già predisposto nel sistema.

## 1. Dati identificativi dell'attività
| Verifica | Chi | Stato |
|---|---|---|
| Forma giuridica scelta (ditta individuale, SRL, SRLS…) e iscrizione al Registro delle imprese | 🧾 👤 | Da fare |
| Codice ATECO coerente con l'attività di piattaforma e intermediazione online | 🧾 | Da fare |
| Partita IVA, sede legale, PEC, numero REA, capitale sociale se società | 🧾 👤 | Da inserire in `/note-legali` e nel footer (oggi assenti, non inventati) |
| Email e telefono pubblici di contatto e assistenza | 👤 | Da inserire in `src/config/site.ts` (oggi vuoti: le pagine mostrano un avviso) |

## 2. Documenti per gli utenti
| Documento | Chi | Punti da coprire |
|---|---|---|
| Termini e condizioni | ⚖️ | Ruolo di intermediario (nessuna vendita o riparazione diretta), obblighi degli utenti e dei professionisti, regole di pubblicazione, moderazione e sospensione, limitazioni di responsabilità, legge e foro, modifiche dei termini |
| Informativa privacy | ⚖️ | Titolare, finalità e basi giuridiche (account, richieste, CRM, candidature, Beta, analytics, attribuzione, soccorso con posizione, assicurazioni con consenso), tempi di conservazione, destinatari, trasferimenti extra-UE, diritti |
| Cookie policy e consenso | ⚖️ | ✅ Oggi nessun cookie di profilazione; misurazione interna senza cookie. Il banner compare solo se si configurano GA4 o pixel: testo e categorie da approvare prima di inserire gli ID |
| Regole di pubblicazione | ⚖️ 👤 | ✅ Dichiarazioni obbligatorie del venditore già nel modulo; testo pubblico delle regole da approvare |
| Informazioni sulle recensioni (Direttiva Omnibus) | ⚖️ | ✅ Recensioni solo dopo esperienze verificate; serve il testo pubblico su come si verifica l'autenticità |
| Prezzi barrati nelle offerte (Omnibus) | ⚖️ | Regola del prezzo precedente più basso negli ultimi 30 giorni per le offerte dei partner |
| Regolamento Rewards | ⚖️ 🧾 | Programma **spento**. Serve il parere sulle manifestazioni a premio (DPR 430/2001) e sul trattamento fiscale prima di attivarlo |

## 3. Privacy e ruoli (GDPR)
| Verifica | Chi | Stato |
|---|---|---|
| Registro dei trattamenti | ⚖️ 👤 | Da fare |
| Nomine dei responsabili (DPA): Supabase, Hostinger, provider email, fornitore mappe, Google/Meta/TikTok se attivati | ⚖️ | Da firmare o accettare online |
| Ruolo dei partner (titolari autonomi dei dati dei clienti che li contattano?) e degli intermediari assicurativi | ⚖️ | Da definire nei contratti |
| DPIA per la posizione in tempo reale del soccorso stradale | ⚖️ | Da valutare (la posizione viene cancellata a fine intervento ✅) |
| Procedure per i diritti degli interessati | 👤 | ✅ Esportazione e cancellazione già nel sistema (`/admin/gdpr`) |
| Gestione dei data breach | ⚖️ 👤 | Procedura in [INCIDENTI_E_CONTINUITA](INCIDENTI_E_CONTINUITA.md); notifica al Garante entro 72 ore se necessaria |

## 4. Marketing e comunicazioni
| Verifica | Chi | Stato |
|---|---|---|
| Consenso marketing separato e revocabile | ⚖️ | ✅ Implementato, con storico dei consensi e link di disiscrizione |
| Base giuridica del CRM B2B (contatto di officine e concessionari) | ⚖️ | Da definire (legittimo interesse?), con informativa ai contatti |
| Telefonate commerciali e Registro pubblico delle opposizioni | ⚖️ | Verificare prima delle campagne telefoniche |
| Contenuti generati con IA (AI Act, art. 50) e diritti sulle immagini | ⚖️ | Origine e diritti di ogni immagine registrati nel Centro marketing ✅ |

## 5. Contratti con i partner
| Verifica | Chi |
|---|---|
| Condizioni per i professionisti: pubblicazione, obblighi di risposta, uso del marchio, gratuità durante il lancio, eventuali piani futuri | ⚖️ 👤 |
| Autorizzazione alla pubblicazione di annunci e foto raccolti dal team (modello di liberatoria) | ⚖️ |
| Accordi con i partner che offrono premi Rewards (quando attivato) | ⚖️ 🧾 |
| Intermediari assicurativi: iscrizione RUI/IVASS verificata, accordo sul trattamento dei dati, regole sulla distribuzione assicurativa (IDD) | ⚖️ |

## 6. Marketplace e intermediazione
| Verifica | Chi | Stato |
|---|---|---|
| Qualifica ai sensi del Digital Services Act (Reg. UE 2022/2065): punto di contatto, segnalazioni, motivazione delle decisioni, ricorsi, trasparenza | ⚖️ | ✅ Segnalazioni e moderazione motivata già presenti; testi e punto di contatto da completare |
| Tracciabilità dei venditori professionali (art. 30 DSA) | ⚖️ | Il sistema raccoglie ragione sociale e P.IVA in modo privato; valutare cosa mostrare |
| Codice del consumo: informazioni precontrattuali dei venditori professionali, garanzia legale sulle auto usate | ⚖️ | Responsabilità dei venditori, da richiamare nei termini |
| Responsabilità per annunci e recensioni | ⚖️ | Moderazione preventiva ✅; limiti di responsabilità nei termini |
| Gestione dei reclami | ⚖️ 👤 | ✅ Categoria «Reclamo» con avviso allo staff (Fase 35); tempi di risposta da fissare nei termini |

## 7. Fisco e amministrazione
| Verifica | Chi |
|---|---|
| Regime fiscale e IVA dei servizi gratuiti oggi e di eventuali piani a pagamento futuri | 🧾 |
| Eventuali commissioni sui servizi: oggi **nessuna** (né pagamenti né commissioni attivi) | 🧾 👤 |
| Obblighi DAC7 (comunicazione dei venditori delle piattaforme digitali) se in futuro si gestiranno pagamenti o corrispettivi | 🧾 |
| Fatturazione dei costi (hosting, Supabase, email, pubblicità) e conservazione | 🧾 |
| Trattamento fiscale dei premi Rewards | 🧾 |

## 8. Prima di aprire al pubblico: elenco minimo
1. [ ] Dati identificativi completi in `/note-legali` e nel footer.
2. [ ] Termini, Privacy e Cookie approvati da un avvocato e pubblicati dal pannello contenuti.
3. [ ] DPA con i fornitori accettati.
4. [ ] Registro dei trattamenti compilato.
5. [ ] Contatti pubblici di assistenza inseriti.
6. [ ] Regole di pubblicazione e testo sulle recensioni pubblicati.
7. [ ] Condizioni per i partner approvate.
8. [ ] Parere del commercialista su regime fiscale e IVA.
