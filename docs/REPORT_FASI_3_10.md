# Report finale — Fasi 3–10

Data: 19/11/2026. Ambiente: sviluppo locale. **Il sito non è pubblicato.** Nessun pagamento attivato, nessun servizio acquistato, nessuna modifica a dominio o DNS.

## 1. Sintesi
Tutte le funzionalità delle Fasi 3–10 sono scritte, compilate e testate in locale (100 test del codice, 202 test di sicurezza del database, build di 89 percorsi, controllo link, verifica in browser). **Non sono state verificate sul database Supabase reale**, perché 11 migrazioni devono ancora essere applicate e la richiesta di conferma del connettore non ha ricevuto risposta.

**Verdetto: non pronto per il lancio pubblico.** Pronto per un ambiente di prova dopo l'applicazione delle migrazioni.

## 2. Per fase
| Fase | Funzionalità principali | Tabelle / migrazione | Testato |
|---|---|---|---|
| 3 Marketplace auto | Ricerca a 15 filtri, ordinamento, schede con galleria, procedura di pubblicazione in 6 passaggi con foto, preferiti, confronto, richieste e appuntamenti, dashboard venditore, moderazione, scadenza automatica | vehicles, vehicle_listings, vehicle_images, storico stati (0009, 0016) | Unit + DB + browser; flusso reale ❌ |
| 4 Neopatentati | Regole 2011/2024 versionate con fonti, calcolatore, filtro di ricerca, verifica in scheda, profilo neopatentato, backoffice regole con test d'impatto e ricalcolo | legal_rules, legal_rule_versions, vehicle_compatibility_checks, driver_profiles (0010) | Unit (motore TS) + DB (motore SQL) |
| 5 Officine | Ricerca per città/CAP/servizio/marca/raggio, mappa, profilo pubblico, servizi, foto, preventivi, recensioni autentiche, registrazione in bozza, verifica documentale e badge | business_categories, professional_services, business_photos (0008, 0016) | Unit + DB |
| 6 Meccanici | Modalità di intervento, zone servite, indirizzo privato, collegamento con officine, certificazioni verificate | professional_affiliations, professional_certifications (0008) | DB |
| 7 Ricambi | Catalogo, ricerca per codice OEM e per auto del garage, compatibilità trasparente, dashboard venditore | part_* (0013, 0016) | Unit + DB |
| 8 Manutenzione | Garage virtuale, storico con provenienza, interventi confermati dal proprietario, documenti privati, promemoria, km, costi, assistenza con segnali di pericolo | user_vehicles, maintenance_*, work_reports, vehicle_expenses (0014) | Unit + DB; cron ❌ |
| 9 Messaggi e notifiche | Chat in tempo reale con allegati e stato di lettura, blocco utenti, notifiche, preferenze, attività, ticket, coda email | conversations, messages, notifications, email_outbox… (0011) | DB; realtime reale ❌; email ❌ |
| 10 Pannello e lancio | Statistiche, utenti e ruoli, moderazione, verifiche, segnalazioni, recensioni, supporto, Field Manager, CMS con storico, categorie, piani (non attivi), GDPR, sistema, registro attività | content_reports, support_tickets, site_content, field_*, seller_authorizations, vehicle_inspections… (0007, 0015) | DB (permessi per ruolo) |

File principali: vedi [ARCHITECTURE](ARCHITECTURE.md). Tabelle e funzioni: [DATABASE](DATABASE.md). Sicurezza: [SECURITY](SECURITY.md). Test: [TEST_REPORT](TEST_REPORT.md).

## 3. Audit finale (15 punti)
| # | Punto | Esito |
|---|---|---|
| 1 | Nessun dato inventato (annunci, recensioni, professionisti, statistiche) | ✅ stati vuoti dove mancano dati |
| 2 | Nessun pulsante decorativo o link morto | ✅ 46 link controllati, 0 errori |
| 3 | Autenticazione reale (Supabase Auth), nessuna simulazione | ✅ codice · 🔧 test con email reali |
| 4 | Pagamenti | ✅ non attivati |
| 5 | Chiavi privilegiate fuori dal frontend | ✅ verificato nel sorgente |
| 6 | RLS su tutte le tabelle, permessi per colonna sui dati sensibili | ✅ 202 controlli |
| 7 | Ruoli e permessi del pannello | ✅ |
| 8 | Registro delle azioni amministrative | ✅ |
| 9 | GDPR: esportazione, cancellazione, consensi separati | ✅ codice · ⚖️ informativa |
| 10 | Normativa neopatentati con fonti e date | ✅ · ⚖️ revisione legale consigliata |
| 11 | Accessibilità di base (contrasto AA, tastiera, riduzione animazioni) | ✅ controlli manuali; audit completo 🔧 |
| 12 | Responsive (desktop, tablet, smartphone) | ✅ 9 pagine verificate |
| 13 | SEO tecnico (metadata, sitemap, canonical, dati strutturati) | ✅ · nota: pagine inesistenti con codice 200 + noindex |
| 14 | Prestazioni (cache, immagini compresse, mappa caricata solo se serve) | ✅ · misura su hosting reale 🔧 |
| 15 | Diritti su loghi, foto e video | 🟠 solo materiale con licenza verificata (MEDIA.md) |

## 4. Configurazioni mancanti
1. Migrazioni 0004 e 0007–0016 sul progetto Supabase (**richiede la tua conferma**).
2. Variabili `.env` di produzione e Site/Redirect URL in Supabase Auth.
3. Hosting Node.js (verifica in hPanel del piano Unlimited).
4. Provider email + record DNS SPF/DKIM/DMARC.
5. Estensione pg_cron.
6. Primo amministratore (`npm run admin:bootstrap`).

## 5. Problemi noti
- Nessun test end-to-end con database reale (impossibile da questo ambiente).
- Nessuna geocodifica automatica: le coordinate dei professionisti vanno inserite manualmente (o con un servizio di geocodifica da scegliere).
- Tile della mappa da OpenStreetMap: per traffico elevato la policy d'uso richiede un fornitore di tile dedicato.
- Pagine con indirizzo inesistente: contenuto "non trovato" con noindex ma codice HTTP 200.
- Pagine legali in bozza.

## 6. Costi esterni potenziali (nessuno attivato)
| Servizio | Quando serve | Costo |
|---|---|---|
| Supabase Pro | backup e nessuna pausa in produzione | a pagamento (verifica il prezzo) |
| Provider email (Resend o altro) | email transazionali | gratuito fino a un limite, poi a pagamento |
| Hosting | già incluso nel piano Unlimited, se compatibile | — |
| Fornitore tile mappe | traffico elevato | variabile |
| Consulenza legale | privacy, termini, neopatentati, DSA | da preventivare |

## 7. Richiede il legale o il fondatore
- Informativa privacy, cookie policy, termini di servizio, note legali con dati societari.
- Lettura delle regole neopatentati implementate (NEOPATENTATI_LEGISLAZIONE.md).
- Ruolo della piattaforma come intermediario (annunci, recensioni), obblighi DSA.
- Contatti pubblici di assistenza, scelta del dominio, approvazione delle spese.
