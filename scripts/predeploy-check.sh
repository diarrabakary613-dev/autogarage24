#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Controllo prima della pubblicazione (staging o produzione).
# Uso: npm run predeploy            (dalla cartella del progetto)
# Esegue: installazione pulita, audit dipendenze, tipi, lint, test,
# test del database, build e controllo delle variabili d'ambiente.
# Non pubblica nulla e non tocca il database remoto.
# ---------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1m→ %s\033[0m\n' "$1"; }

step "Versione di Node (richiesta ≥ 20)"
node -e 'const v=+process.versions.node.split(".")[0]; if (v<20) { console.error("Node "+process.versions.node+" troppo vecchio"); process.exit(1) } console.log("Node "+process.versions.node)'

step "Variabili d'ambiente necessarie alla build"
missing=0
for v in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY NEXT_PUBLIC_SITE_URL; do
  if [ -z "${!v:-}" ] && ! grep -qs "^$v=." .env.local .env.production 2>/dev/null; then echo "  MANCANTE: $v"; missing=1; else echo "  ok: $v"; fi
done
if grep -qsE '^NEXT_PUBLIC_.*(SECRET|SERVICE_ROLE)' .env.local .env.production 2>/dev/null; then echo "  ERRORE: una chiave segreta ha il prefisso NEXT_PUBLIC_"; exit 1; fi
[ "$missing" = 0 ] || { echo "Imposta le variabili mancanti (vedi .env.example e docs/ENVIRONMENT.md)."; exit 1; }

step "Installazione pulita delle dipendenze (npm ci)"
npm ci --no-audit --no-fund

step "Vulnerabilità note nelle dipendenze di produzione"
npm audit --omit=dev --audit-level=high

step "Tipi, lint e test"
npm run typecheck
npm run lint
npm test

step "Test del database (migrazioni + RLS) su PostgreSQL temporaneo"
if command -v pg_ctl >/dev/null 2>&1 || ls /usr/lib/postgresql/*/bin/pg_ctl >/dev/null 2>&1; then
  npm run test:db
else
  echo "  PostgreSQL non installato su questa macchina: test del database SALTATO (eseguilo in CI o su un'altra macchina)."
fi

step "Build di produzione"
npm run build

step "Migrazioni presenti nel repository (devono essere TUTTE applicate al progetto Supabase di destinazione)"
ls supabase/migrations | sed 's/^/  /'

printf '\n\033[1mCONTROLLO SUPERATO.\033[0m Prossimi passi: applica le migrazioni mancanti, pubblica, poi esegui\n  npm run smoke -- https://<indirizzo-pubblicato>\n'
