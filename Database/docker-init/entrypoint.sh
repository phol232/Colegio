#!/bin/sh
set -e

PGHOST="${PGHOST:-postgres}"
PGUSER="${PGUSER:-academic}"
export PGPASSWORD="${DB_PASSWORD:?DB_PASSWORD is required}"

echo "==> Verificando esquema base OLTP..."
if psql -h "$PGHOST" -U "$PGUSER" -d academic_oltp -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='usuarios' LIMIT 1" \
  | grep -q 1; then
  echo "==> Tablas OLTP base ya existen."
else
  echo "==> Aplicando schema_oltp.sql..."
  psql -h "$PGHOST" -U "$PGUSER" -d academic_oltp -f /database/schema_oltp.sql
fi

echo "==> Aplicando deltas OLTP (idempotentes)..."
psql -h "$PGHOST" -U "$PGUSER" -d academic_oltp -f /database/migrations_extra/oltp_schema_delta.sql
psql -h "$PGHOST" -U "$PGUSER" -d academic_oltp -f /database/migrations_extra/configuracion_sistema.sql

echo "==> Inicialización de base completada."
echo "    Migraciones TypeORM al arrancar el API (migrationsRun):"
echo "    matricula_anual → sync_estudiantes_cursos → analytics_indexes → drop-olap"
