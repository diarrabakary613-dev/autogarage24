# Checklist di lancio

Legenda: ✅ Completata · 🔧 Da completare · 🟠 Richiede approvazione del fondatore · ⚖️ Richiede verifica esterna (legale/tecnica)

> **Verdetto attuale (Fase 35, 20/11/2026): PRONTO CON LIMITAZIONI** — il codice è completo e verificato, il database di produzione è aggiornato fino alla 0029; **non** è pronto per l'apertura al pubblico finché mancano email, hosting configurato, test end-to-end reali e revisione legale. Dettagli: [LAUNCH_READINESS_REPORT](LAUNCH_READINESS_REPORT.md).

| Area | Voce | Stato |
|---|---|---|
| Dominio | Scelta del dominio definitivo | 🟠 |
| Dominio | DNS verso l'hosting (A/CNAME) | 🟠 non modificato |
| Dominio | HTTPS (certificato automatico Hostinger) | 🔧 dopo il collegamento del dominio |
| Hosting | Verifica che il piano "Unlimited" mostri l'opzione Web App Node.js | 🔧 / 🟠 |
| Hosting | Build e avvio di produzione | ✅ in locale (89 percorsi) · 🔧 sull'hosting |
| Hosting | Variabili d'ambiente di produzione | 🔧 |
| Database | Migrazioni 0001–0003, 0005, 0006 applicate | ✅ |
| Database | Migrazioni 0004, 0007–0018 applicate | ✅ 20/11/2026 (verifica per impronta: vedi AUDIT_FASE_34 §16) |
| Database | Advisors Supabase (sicurezza/prestazioni) senza criticità | ✅ 20/11/2026: nessun ERROR; avvisi WARN/INFO attesi e motivati (AUDIT_FASE_34 §16) |
| Database | Estensione pg_cron attiva (promemoria, annunci scaduti) | ✅ 20/11/2026: 11 job attivi |
| Database | Piano con backup adeguati (Free → Pro) | 🟠 costo |
| Email | Provider transazionale (Resend o altro) | 🟠 costo/approvazione |
| Email | SPF, DKIM, DMARC sul dominio | 🟠 modifica DNS |
| Email | SMTP personalizzato per le email di Auth | 🔧 |
| Email | Funzione `send-emails` distribuita e pianificata | 🔧 |
| Autenticazione | Registrazione, accesso, recupero password, conferma email | ✅ codice · 🔧 test con Supabase reale |
| Autenticazione | Site URL e Redirect URL in Supabase | 🔧 |
| Account amministratore | Primo amministratore con `npm run admin:bootstrap` | 🔧 da fare (migrazioni ora applicate) |
| Privacy | Esportazione dati, richiesta di cancellazione, consensi separati | ✅ codice |
| Privacy | Informativa privacy definitiva (titolare, finalità, basi giuridiche, tempi di conservazione, responsabili: Supabase, Hostinger, provider email, OpenStreetMap) | ⚖️ bozza presente |
| Privacy | Registro dei trattamenti, nomine dei responsabili (DPA) | ⚖️ |
| Cookie | Solo cookie tecnici (sessione Supabase); tile della mappa da OpenStreetMap | ✅ verificato nel codice |
| Cookie | Cookie policy definitiva; banner necessario solo se si aggiungono analytics/marketing | ⚖️ |
| Pagine legali | Termini di servizio, note legali con P.IVA e dati societari | ⚖️ bozze |
| Normativa | Regole neopatentati (L. 177/2024, regime 2011) | ✅ implementate · ⚖️ lettura legale consigliata |
| Normativa | Responsabilità della piattaforma per annunci/recensioni (intermediario), DSA per marketplace | ⚖️ |
| Sicurezza | RLS su tutte le tabelle, nessuna chiave privilegiata nel frontend, audit log | ✅ (202 controlli database) |
| Sicurezza | Rate limiting su richieste, messaggi, conversazioni, ticket | ✅ |
| Sicurezza | Test di penetrazione esterno | ⚖️ consigliato |
| Sicurezza | `npm audit` senza vulnerabilità note | ✅ al 19/11/2026 |
| SEO | Metadata, canonical, sitemap, robots, Open Graph, dati strutturati reali | ✅ |
| SEO | Google Search Console e invio sitemap | 🔧 dopo il dominio |
| Test | Unit test (100) e test database (202) | ✅ |
| Test | Test end-to-end con database reale e utenti di prova | 🔧 non eseguibile da questo ambiente |
| Test | Verifica su dispositivi reali (iPhone/Android) | 🔧 |
| Backup | Procedura documentata (DEPLOYMENT §5) | ✅ · 🔧 attivazione |
| Monitoraggio | Endpoint `/api/health` | ✅ · 🔧 collegamento a servizio uptime |
| Assistenza clienti | Ticket in `/dashboard/supporto`, gestione in `/admin/supporto` | ✅ codice |
| Assistenza clienti | Email/telefono pubblici in *Contenuti › Contatti* | 🟠 |
| Contenuti | Foto e video con diritti d'uso (MEDIA.md) | 🟠 |
| Pagamenti | Non attivi (per scelta) | ✅ nessuna attivazione |
| Beta | Criteri di passaggio (GO_TO_MARKET_MILANO §1) | 🔧 |
| Beta | Partner reali e Founding Partners | 🟠 contatti da avviare |
| Beta | Annunci reali con autorizzazione | 🔧 |
| Marketing | Asset visivi con diritti (Higgsfield o foto proprie) | 🟠 |
| Marketing | Approvazione budget pubblicitario | 🟠 |
| Legale | Punti di CONTROLLO_LEGALE_BETA.md (DSA, Omnibus, CRM, AI Act) | ⚖️ |
| Mappe | Fornitore di tile/geocodifica commerciale per la Beta pubblica | 🟠 costo |
| Fasi 21–30 | Migrazioni 0019–0023 applicate sul progetto reale | ✅ 20/11/2026 |
| Soccorso, trasporti, revisioni | Verifica dei primi operatori, trasportatori e centri reali (documenti e autorizzazioni) | 🔧 staff |
| Assicurazioni | Partner con iscrizione RUI/IVASS verificata e accordi GDPR | ⚖️ parere legale |
| Prenotazioni | Google Calendar (OAuth) | 🔧 facoltativo, non attivo |
| Trasporti / piani | Provider di pagamento e struttura legale | 🟠 non attivi per scelta |
| Business Center | Prova con un'azienda reale e un collaboratore invitato | 🔧 |
| Pulizia | Migrazione 0029 (privilegi minimi su viste e due funzioni, indice duplicato) applicata | ✅ 20/11/2026 |
| Fasi 31–34 | Migrazioni 0024–0028 applicate | ✅ 20/11/2026 (applicate direttamente al progetto reale, vuoto, su autorizzazione del fondatore) |
| Rewards | Parere su DPR 430/2001 e fisco, regolamento definitivo, accordi con i partner, poi attivazione | ⚖️ |
| Growth | Provider email collegato e prima campagna approvata dal fondatore | 🟠 |
| Growth | Automazioni: attivazione una alla volta dal fondatore | 🔧 |
| Pixel/GA4 | ID configurati solo dopo aggiornamento di cookie policy e privacy | ⚖️ |
| SEO | Verifica in Search Console e invio della sitemap | 🔧 |
| SEO | Primi articoli reali del blog | 🔧 |
| Audit | Test end-to-end autenticati su desktop e telefono; PageSpeed sul sito di prova | 🔧 |
| Backup | Prova di ripristino su un progetto di prova (BACKUP_RESTORE.md) | 🔧 |
| Monitoraggio | `/api/health` collegato a un servizio di uptime | 🔧 |
| Fase 35 | Migrazione 0030 (categorie Reclamo e Supporto partner, cruscotto di lancio) applicata | 🟠 in attesa di approvazione |
| Fase 35 | Progetto Supabase di staging separato | 🟠 |
| Fase 35 | `npm run predeploy` superato prima del deploy | ✅ in locale · 🔧 prima di ogni deploy |
| Fase 35 | `npm run smoke -- <url>` superato sul sito pubblicato | 🔧 dopo il deploy |
| Fase 35 | Centro assistenza `/assistenza` con contatti ufficiali | ✅ pagina · 🟠 contatti |
| Fase 35 | Manuali per amministratori, officine, concessionari, venditori e clienti (`docs/manuali/`) | ✅ |
| Fase 35 | Checklist legale e amministrativa (CHECKLIST_LEGALE_AMMINISTRATIVA.md) | ⚖️ |
| Fase 35 | Contatti di emergenza (INCIDENTI_E_CONTINUITA §5) | 🔧 da compilare |
