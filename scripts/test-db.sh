#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Test del database: crea un PostgreSQL temporaneo, applica il "finto
# Supabase" minimo, tutte le migrazioni in ordine e i test RLS.
# Uso: npm run test:db   (richiede PostgreSQL 15+ installato localmente)
# ---------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"
PORT="${PG_TEST_PORT:-54329}"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then RUN_AS="runuser -u postgres --"; chown -R postgres "$WORK"; fi

cleanup() { $RUN_AS "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

$RUN_AS "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$RUN_AS "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null

PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -t)

echo "→ Shim Supabase (solo test)"
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql"

for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "→ Migrazione $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done

for f in "$ROOT"/supabase/tests/[1-9]*.sql; do
  echo "→ Test $(basename "$f")"
  "${PSQL[@]}" -f "$f" 2>&1 | sed -e 's/^psql:[^ ]* NOTICE:  /  /' | grep -v '^\s*$'
  [ "${PIPESTATUS[0]}" -eq 0 ] || exit 1
done
