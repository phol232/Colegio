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

echo "==> Aplicando deltas OLTP base (idempotentes)..."
psql -h "$PGHOST" -U "$PGUSER" -d academic_oltp -f /database/migrations_extra/oltp_schema_delta.sql
psql -h "$PGHOST" -U "$PGUSER" -d academic_oltp -f /database/migrations_extra/configuracion_sistema.sql

echo "==> Verificando esquema base OLAP..."
if psql -h "$PGHOST" -U "$PGUSER" -d academic_olap -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='dim_estudiante' LIMIT 1" \
  | grep -q 1; then
  echo "==> Tablas OLAP base ya existen."
else
  echo "==> Aplicando schema_olap.sql..."
  psql -h "$PGHOST" -U "$PGUSER" -d academic_olap -f /database/schema_olap.sql
fi

echo "==> Aplicando deltas OLAP (idempotentes)..."
psql -h "$PGHOST" -U "$PGUSER" -d academic_olap -f /database/migrations_extra/olap_schema_delta.sql

echo "==> Inicialización de bases completada."
echo "    Migraciones de matrícula (matricula_anual → sync_estudiantes_cursos)"
echo "    las aplica el backend TypeORM al arrancar (migrationsRun)."
