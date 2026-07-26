# Database — Academic Management System

Esquema SQL de la base transaccional `academic_oltp`. El análisis se calcula
directamente sobre OLTP (ya no hay base `academic_olap`).

Para eliminar una base OLAP antigua:

```bash
psql -U academic -d postgres -f Database/scripts/drop-olap.sql
```

## Archivos principales

| Archivo | Rol |
|---------|-----|
| `schema_oltp.sql` | Esquema base OLTP |
| `migrations_extra/oltp_schema_delta.sql` | Deltas idempotentes (catálogo, evaluaciones, promedios…) |
| `migrations_extra/configuracion_sistema.sql` | Config del sistema |
| `migrations_extra/analytics_indexes.sql` | Referencia; lo aplica TypeORM `AnalyticsIndexes` |
| `init-databases.sql` | `CREATE DATABASE academic_oltp` (primer arranque Docker) |
| `docker-init/entrypoint.sh` | Aplica schema + deltas en `db-init` |
| `scripts/apply-sql.mjs` | Aplicador Node (`pnpm apply:oltp`) |
| `scripts/drop-olap.sql` | Referencia; lo aplica TypeORM `DropOlapDatabase` (o a mano vía :5432) |
| `pgbouncer.ini` | Pool hacia `academic_oltp` |

## Aplicar esquema

```bash
# Via Docker (automático en compose)
docker compose up db-init

# Manual
cd Database/scripts && pnpm install && pnpm apply:oltp
# o desde Backend:
NODE_PATH=./node_modules node ../Database/scripts/apply-sql.mjs --oltp
```

Las migraciones TypeORM (matrícula, índices de análisis, drop-olap) las aplica el API al arrancar (`migrationsRun`).

## Funciones PL/pgSQL legacy

Los `.sql` de funciones (`auth_functions.sql`, etc.) son referencia histórica;
la lógica de negocio vive en TypeORM. Ver `historical/README.md`.
