#!/usr/bin/env bash
# ---------------------------------------------------------------------
# Test di concorrenza dei riscatti Rewards (Fase 34): due sessioni reali in parallelo.
#  1) due utenti si contendono l'ultimo pezzo di un premio → un solo riscatto;
#  2) lo stesso utente spende lo stesso saldo su due premi insieme → un solo riscatto, saldo mai negativo.
# Uso: npm run test:concurrency   (PostgreSQL locale, nessun dato reale)
# ---------------------------------------------------------------------
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PG_BIN="${PG_BIN:-$(dirname "$(command -v pg_ctl 2>/dev/null || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")}"
WORK="$(mktemp -d)"; PORT="${PG_TEST_PORT:-54333}"
RUN_AS=""; if [ "$(id -u)" = "0" ]; then RUN_AS="runuser -u postgres --"; chown -R postgres "$WORK"; fi
cleanup() { $RUN_AS "$PG_BIN/pg_ctl" -D "$WORK/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT
$RUN_AS "$PG_BIN/initdb" -D "$WORK/data" -U postgres -A trust >/dev/null
$RUN_AS "$PG_BIN/pg_ctl" -D "$WORK/data" -o "-p $PORT -k $WORK -c listen_addresses=''" -l "$WORK/log" -w start >/dev/null
P=(psql -h "$WORK" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -t -A)
"${P[@]}" -f "$ROOT/supabase/tests/00_supabase_shim.sql" >/dev/null
for f in "$ROOT"/supabase/migrations/*.sql; do "${P[@]}" -f "$f" >/dev/null 2>&1; done
"${P[@]}" >/dev/null <<'SQL'
insert into auth.users (id, email, raw_user_meta_data) values
 ('20000000-0000-0000-0000-000000000001','u1@test.local','{"full_name":"Uno","accepted_terms":"true"}'),
 ('20000000-0000-0000-0000-000000000002','u2@test.local','{"full_name":"Due","accepted_terms":"true"}'),
 ('20000000-0000-0000-0000-000000000003','off@test.local','{"full_name":"Off","accepted_terms":"true","requested_role":"officina","business_name":"Officina Test"}');
update public.platform_settings set value = 'true' where key = 'rewards_enabled';
set session_replication_role = replica;
insert into public.points_ledger (user_id, amount, kind, reason) values
 ('20000000-0000-0000-0000-000000000001', 300, 'rettifica', 'test concorrenza'), ('20000000-0000-0000-0000-000000000002', 150, 'rettifica', 'test concorrenza');
set session_replication_role = origin;
select set_config('ag24.trusted', 'on', false);
insert into public.reward_items (id, profile_id, title, description, category, points_cost, benefit_type, benefit_value, conditions, quantity_total, quantity_left, per_user_limit, valid_until, status)
select '30000000-0000-0000-0000-000000000001', id, 'Ultimo premio disponibile', 'Un solo pezzo disponibile per verificare la concorrenza.', 'altro', 100, 'importo', 10, 'Condizioni del test.', 1, 1, 1, current_date + 30, 'pubblicato'
from public.professional_profiles where user_id = '20000000-0000-0000-0000-000000000003';
insert into public.reward_items (id, profile_id, title, description, category, points_cost, benefit_type, benefit_value, conditions, per_user_limit, valid_until, status)
select ('30000000-0000-0000-0000-00000000000' || n)::uuid, id, 'Premio da 150 n' || n, 'Premio per verificare la doppia spesa dello stesso saldo.', 'altro', 150, 'importo', 10, 'Condizioni del test.', 1, current_date + 30, 'pubblicato'
from public.professional_profiles, generate_series(2, 3) n where user_id = '20000000-0000-0000-0000-000000000003';
SQL
redeem() {
  "${P[@]}" -c "begin; set local role authenticated; select set_config('request.jwt.claim.sub','$1',true);
    select set_config('request.jwt.claims','{\"sub\":\"$1\",\"role\":\"authenticated\"}',true); select pg_sleep(0.2);
    select code from public.redeem_reward('$2','$3'); commit;" 2>&1 | tee -a "$WORK/redeem.log" | grep -cE "^RW-" || true
}
fail=0
a=$(redeem 20000000-0000-0000-0000-000000000001 30000000-0000-0000-0000-000000000001 chiave-k1 & redeem 20000000-0000-0000-0000-000000000002 30000000-0000-0000-0000-000000000001 chiave-k2 & wait)
n=$(echo "$a" | paste -sd+ | bc); [ "$n" = "1" ] && echo "  OK — ultimo pezzo: un solo riscatto su due richieste simultanee" || { echo "  FALLITO — riscatti: $n"; fail=1; }
b=$(redeem 20000000-0000-0000-0000-000000000002 30000000-0000-0000-0000-000000000002 chiave-k3 & redeem 20000000-0000-0000-0000-000000000002 30000000-0000-0000-0000-000000000003 chiave-k4 & wait)
n=$(echo "$b" | paste -sd+ | bc); [ "$n" = "1" ] && echo "  OK — stesso saldo su due premi: un solo riscatto" || { echo "  FALLITO — riscatti: $n"; fail=1; }
neg=$("${P[@]}" -c "select count(*) from (select user_id, sum(amount) s from public.points_ledger group by 1 having sum(amount) < 0) x")
[ "$neg" = "0" ] && echo "  OK — nessun saldo negativo" || { echo "  FALLITO — saldi negativi: $neg"; fail=1; }
q=$("${P[@]}" -c "select quantity_left from public.reward_items where id = '30000000-0000-0000-0000-000000000001'")
[ "$q" = "0" ] && echo "  OK — quantità mai sotto zero" || { echo "  FALLITO — quantità: $q"; fail=1; }
[ $fail = 0 ] || cat "$WORK/redeem.log"; [ $fail = 0 ] && echo "=== TEST DI CONCORRENZA SUPERATI ===" || exit 1
