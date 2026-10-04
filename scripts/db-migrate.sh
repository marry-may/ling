#!/usr/bin/env bash
# Applies the migrations in supabase/migrations that the database has not recorded yet.
#
#   npm run db:migrate                         apply pending migrations
#   npm run db:migrate -- --mark-applied V...  record versions as applied without running them
#
# Needs SUPABASE_DB_URL in .env.local. It must never be a VITE_ variable: those are bundled into the app.
# Applied versions are kept in supabase_migrations.schema_migrations, the table the Supabase CLI uses too.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_URL=$(grep -E '^SUPABASE_DB_URL=' .env.local 2>/dev/null | head -n 1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' || true)
if [ -z "$DB_URL" ]; then
  echo "SUPABASE_DB_URL is missing in .env.local" >&2
  exit 1
fi

run_sql() {
  # Hide "already exists, skipping" notices from the idempotent setup statements.
  PGOPTIONS="-c client_min_messages=warning" psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q "$@"
}

run_sql -c "create schema if not exists supabase_migrations;
  create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);"

if [ "${1:-}" = "--mark-applied" ]; then
  shift
  for version in "$@"; do
    run_sql -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', 'applied manually') on conflict do nothing;"
    echo "Marked $version as applied"
  done
  exit 0
fi

pending=0
for file in supabase/migrations/*.sql; do
  name=$(basename "$file" .sql)
  version=${name%%_*}
  if [ "$(run_sql -tA -c "select 1 from supabase_migrations.schema_migrations where version = '$version';")" = "1" ]; then
    continue
  fi
  echo "Applying $name"
  # One transaction per file: a failing migration leaves the database unchanged.
  run_sql --single-transaction -f "$file" -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '${name#*_}');"
  pending=$((pending + 1))
done
echo "Done: $pending migration(s) applied."
