#!/usr/bin/env bash
# Rejoue toutes les migrations sur une base PostgreSQL vierge puis exécute
# les tests SQL de sécurité (supabase/tests/*.sql).
#
# Usage : PGHOST=... PGPORT=... PGUSER=postgres scripts/db-test/run.sh
# Variables : DB_TEST_NAME (défaut expansion_os_test)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB="${DB_TEST_NAME:-expansion_os_test}"
PSQL=(psql -X -q -v ON_ERROR_STOP=1 -d "$DB")

echo "▶ Base de test : $DB"
psql -X -q -d postgres -c "DROP DATABASE IF EXISTS \"$DB\";" -c "CREATE DATABASE \"$DB\";"
"${PSQL[@]}" -f "$ROOT/scripts/db-test/supabase-stub.sql"

# Les extensions propres à Supabase sont simulées par le stub.
filter() {
  sed -E \
    -e '/^[[:space:]]*CREATE EXTENSION IF NOT EXISTS[[:space:]]+"?(pg_net|pg_cron|supabase_vault|pgmq|pg_graphql|pgsodium)"?/Id' \
    -e 's/^([[:space:]]*)CREATE EXTENSION "?(pg_net|pg_cron|supabase_vault|pgmq)"?[^;]*;/\1NULL;/I' \
    "$1"
}

apply() {
  local file="$1"
  if ! filter "$file" | "${PSQL[@]}" -f - >/dev/null 2>"$ROOT/.db-test-err"; then
    echo "✖ Échec de la migration : ${file#$ROOT/}"
    cat "$ROOT/.db-test-err"
    rm -f "$ROOT/.db-test-err"
    exit 1
  fi
}

echo "▶ Migrations Supabase (historiques)"
for f in "$ROOT"/supabase/migrations/*.sql; do apply "$f"; done

echo "▶ Migrations Drizzle (journal)"
for tag in $(node -e "for (const e of require('$ROOT/drizzle/migrations/meta/_journal.json').entries) console.log(e.tag)"); do
  apply "$ROOT/drizzle/migrations/$tag.sql"
done
rm -f "$ROOT/.db-test-err"
echo "✔ Toutes les migrations se rejouent de zéro"

echo "▶ Tests SQL"
status=0
for t in "$ROOT"/supabase/tests/*.sql; do
  if "${PSQL[@]}" -f "$t"; then
    echo "  ✔ ${t#$ROOT/}"
  else
    echo "  ✖ ${t#$ROOT/}"
    status=1
  fi
done
exit $status
