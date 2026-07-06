#!/bin/bash
set -euo pipefail

echo "==> Starting Hospitality OS dev environment..."

echo "==> Starting Docker services..."
docker compose -f deploy/docker-compose.yml up -d

echo "==> Waiting for PostgreSQL..."
until docker compose -f deploy/docker-compose.yml exec -T postgres pg_isready -U dev -d hospitality 2>/dev/null; do
  sleep 1
done
echo "PostgreSQL is ready."

echo "==> Running migrations..."
for f in internal/infrastructure/postgres/migrations/*.sql; do
  echo "  Applying $f..."
  PGPASSWORD=dev psql -h localhost -U dev -d hospitality -f "$f" 2>/dev/null || true
done

echo "==> Starting API..."
go run ./cmd/api
