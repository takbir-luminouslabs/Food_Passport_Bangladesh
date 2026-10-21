#!/usr/bin/env bash
# Applies every migration + the seed to a throwaway Postgres container and runs the permission tests.
# Needs Docker. Usage: npm run db:test
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME="fp-db-test-$$"
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
docker run -d --rm --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
for _ in $(seq 1 60); do
  docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
sleep 1
SCENARIO="$(cat supabase/tests/scenario.json)"
psqlx() { docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -v "scenario=$SCENARIO" -q "$@"; }
psqlx < supabase/tests/stub.sql
for f in supabase/migrations/*.sql; do echo "migrate: $f"; psqlx < "$f"; done
echo "seed"; psqlx < supabase/seed.sql
for t in supabase/tests/*.test.sql; do echo "test: $t"; psqlx < "$t"; done
echo "all database tests passed"
