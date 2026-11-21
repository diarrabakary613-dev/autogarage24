# Configurazione dell'ambiente

Questa guida spiega, passo per passo, come collegare il sito al database Supabase.

## 1. Creare il progetto Supabase

1. Accedi a <https://supabase.com/dashboard> (organizzazione esistente: "diarrabakary613-dev's Org").
2. **New project** → nome `autogarage24`, regione **Central EU (Frankfurt)** (dati in Europa, adatto al GDPR).
3. Scegli una password del database robusta e conservala in un gestore di password.
4. Il piano **Free** è sufficiente per lo sviluppo. Per la produzione valuteremo il piano Pro (circa 25 $/mese) per backup giornalieri e nessuna sospensione per inattività: lo decideremo insieme prima del lancio.

> In alternativa, Claude può creare il progetto per te tramite il connettore Supabase, dopo la tua autorizzazione.

## 2. Applicare le migrazioni del database

Le migrazioni sono in `supabase/migrations/` e vanno applicate **in ordine di nome**:

```
20261119000100_foundation_types.sql
20261119000200_profiles_roles.sql
20261119000300_professionals_verification.sql
20261119000400_audit_auth_admin.sql
20261119000500_storage.sql
```

Metodi possibili:
- **Supabase CLI** (consigliato): `npx supabase link --project-ref <id>` poi `npx supabase db push`
- **Connettore Supabase di Claude**: Claude le applica e verifica gli avvisi di sicurezza
- **Dashboard → SQL Editor**: incolla ed esegui ogni file nell'ordine indicato

⚠️ Il file `supabase/tests/00_supabase_shim.sql` serve **solo ai test locali**: non va mai eseguito su Supabase.

## 3. Variabili d'ambiente

Copia `.env.example` in `.env.local` e compila:

| Variabile | Dove trovarla | Pubblica? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → Project URL | Sì |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → Publishable key (`sb_publishable_…`) | Sì (protetta dalle regole RLS) |
| `NEXT_PUBLIC_SITE_URL` | Indirizzo del sito (`http://localhost:3000` in sviluppo) | Sì |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → Secret key (`sb_secret_…`) | **NO — segreta** |

La chiave segreta serve solo allo script del primo amministratore. Non va mai inserita nel codice, nel browser o in variabili `NEXT_PUBLIC_`.

### Variabili facoltative (Fasi 32–33)

| Variabile | A cosa serve | Pubblica? |
|---|---|---|
| `NEXT_PUBLIC_GA4_ID` | Google Analytics 4 (`G-…`), caricato solo dopo il consenso | Sì |
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | Tag di conversione Google Ads (`AW-…`), solo dopo il consenso | Sì |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta Pixel, solo dopo il consenso | Sì |
| `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | TikTok Pixel, solo dopo il consenso | Sì |
| `NEXT_PUBLIC_GSC_VERIFICATION` | Codice del meta tag di verifica di Google Search Console | Sì |
| `NEXT_PUBLIC_BING_VERIFICATION` | Codice del meta tag di verifica di Bing Webmaster Tools | Sì |

Se nessun ID di terze parti è impostato non compare il banner cookie e non viene caricato alcuno script esterno. Gli ID vengono letti al momento della build: dopo averli cambiati serve una nuova build. La Content Security Policy aggiunge automaticamente le origini necessarie solo per gli strumenti configurati. Prima di attivarli: aggiornare cookie policy e informativa privacy. Impostare un ID non verifica l'account: va controllato nella piattaforma.

## 4. Impostazioni di autenticazione (Dashboard → Authentication)

1. **URL Configuration**
   - Site URL: `http://localhost:3000` (in produzione: il dominio definitivo)
   - Redirect URLs: aggiungi `http://localhost:3000/auth/confirm` e, in produzione, `https://<dominio>/auth/confirm`
2. **Sign In / Providers → Email**: lascia attiva la conferma email ("Confirm email").
3. **Password**: lunghezza minima 10 e, se disponibile, "Prevent use of leaked passwords".
4. **Email templates** (facoltativo): i template predefiniti funzionano. Per tradurli in italiano, aggiornali dalla dashboard.
5. **SMTP**: il servizio email incluso in Supabase ha limiti molto bassi (poche email all'ora), adatti solo ai test. Prima del lancio va configurato un SMTP proprio (es. la casella Hostinger che hai già, oppure un servizio dedicato).

## 5. Nominare il primo amministratore

1. Avvia il sito e registrati normalmente con la tua email; conferma l'email.
2. Dalla cartella del progetto: `npm run admin:bootstrap -- tua@email.it`
3. Esci e rientra: nell'header comparirà **Amministrazione**.

Il comando funziona una sola volta. Gli amministratori successivi saranno nominati dal pannello (Fase 9).
