# Backup e ripristino

Procedura per il database Supabase e per i file su Storage. **Nessuna di queste operazioni è stata eseguita sul progetto reale**: vanno fatte dal fondatore (o con la sua autorizzazione esplicita), prima su un progetto di prova.

## 1. Cosa va protetto

| Dato | Dove | Copia |
|---|---|---|
| Database (utenti, annunci, richieste, punti, consensi…) | Supabase PostgreSQL | Backup automatici di Supabase + `pg_dump` manuale prima di ogni migrazione |
| Account di accesso | Schema `auth` di Supabase | Incluso nei backup di Supabase; con `pg_dump` va esportato con lo schema `auth` |
| File (foto, documenti, video) | Supabase Storage | Non inclusi nei backup del database: copia separata (§4) |
| Codice e migrazioni | Repository Git | Ogni versione è nel repository |
| Variabili d'ambiente | Hostinger (hPanel) e `.env.local` | Copia cifrata in un gestore di password, mai nel repository |

## 2. Backup automatici

- **Piano Free di Supabase**: nessun backup scaricabile garantito. Prima del lancio pubblico valutare il piano Pro (backup giornalieri, 7 giorni; Point-in-Time Recovery come componente aggiuntivo). Costi da verificare su supabase.com/pricing: nessun servizio a pagamento viene attivato senza autorizzazione.
- Dove si vedono: Supabase → Database → Backups.

## 3. Backup manuale prima di ogni migrazione

Dal computer del fondatore, con la stringa di connessione del database (Supabase → Connect → Session pooler; contiene la password: non condividerla).

```bash
# Struttura e dati dello schema applicativo e degli account (formato compresso)
pg_dump "$DATABASE_URL" --format=custom --no-owner --no-privileges \
  --schema=public --schema=private --schema=auth --schema=storage \
  --file="backup-autogarage24-$(date +%Y%m%d-%H%M).dump"

# Verifica che il file sia leggibile (elenca il contenuto, non modifica nulla)
pg_restore --list backup-autogarage24-*.dump | head
```

Conservare il file cifrato (contiene dati personali), con accesso limitato, ed eliminarlo secondo i tempi di conservazione decisi con il legale.

## 4. File su Storage

I file non sono nel `pg_dump` (lì ci sono solo i riferimenti). Copia periodica con lo strumento S3 compatibile di Supabase (Storage → Settings → S3 Connection), ad esempio:

```bash
aws s3 sync s3://listing-images ./storage-backup/listing-images --endpoint-url "$SUPABASE_S3_ENDPOINT"
```

Le chiavi S3 sono segrete: mai nel repository, mai in variabili `NEXT_PUBLIC_`.

## 5. Ripristino

**Prova di ripristino (consigliata ogni trimestre, obbligatoria prima del lancio):**
1. Creare un nuovo progetto Supabase **di prova** (mai sovrascrivere la produzione per una prova).
2. Ripristinare: `pg_restore --no-owner --no-privileges --dbname="$DATABASE_URL_PROVA" backup.dump`
3. Verificare: accesso con un account di prova, numero di annunci e profili, `select count(*) from public.points_ledger`, pagina `/api/health`.
4. Annotare data, durata e problemi nel registro operativo.

**Ripristino reale della produzione** (solo in caso di incidente, con decisione del fondatore):
1. Mettere il sito in manutenzione (in hPanel), per evitare scritture durante il ripristino.
2. Preferire il ripristino dalla console Supabase (Backups o Point-in-Time) al `pg_restore` manuale.
3. Dopo il ripristino: verificare i controlli del §5.3, poi riaprire il sito.
4. Le operazioni fatte dopo il backup vanno ricostruite: comunicarlo agli utenti interessati se riguarda i loro dati (valutare l'obbligo di notifica di violazione, art. 33–34 GDPR, con il legale).

## 6. Migrazioni e ritorno indietro

- Le migrazioni sono solo in avanti e non vanno modificate dopo l'applicazione: una correzione è sempre una nuova migrazione.
- Prima di applicarle in produzione: backup (§3), applicazione su un progetto di prova, `npm run test:db` superato.
- In caso di errore dopo l'applicazione: si scrive una migrazione correttiva; il ripristino del backup è l'ultima risorsa, perché perde i dati scritti nel frattempo.
- Nessuna operazione distruttiva (DROP, DELETE di massa, TRUNCATE) sui dati di produzione senza backup verificato e autorizzazione del fondatore.
