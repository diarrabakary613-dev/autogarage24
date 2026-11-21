#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Genera src/lib/supabase/database.types.ts dalle migrazioni, usando un
# PostgreSQL temporaneo locale (stesso formato dei tipi ufficiali Supabase).
# Con il progetto collegato si può usare in alternativa:
#   npx supabase gen types typescript --project-id <id>
# ---------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"; PORT=54331
RUN_AS=""; if [ "$(id -u)" = "0" ]; then RUN_AS="runuser -u postgres --"; chown -R postgres "$WORK"; fi
cleanup() { $RUN_AS "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
$RUN_AS "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$RUN_AS "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
PSQL=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -t -A)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f" >/dev/null; done
"${PSQL[@]}" -f "$ROOT/scripts/schema-introspect.sql" > "$WORK/schema.json"
python3 "$ROOT/scripts/gen-types.py" "$WORK/schema.json" > "$ROOT/src/lib/supabase/database.types.ts"
echo "✔ Tipi generati in src/lib/supabase/database.types.ts"
