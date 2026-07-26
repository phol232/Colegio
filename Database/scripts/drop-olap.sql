-- Elimina la base OLAP (ya no se usa: el análisis lee de OLTP).
-- Fuente de verdad operativa: Backend TypeORM
--   migrations/oltp/1735689910000-DropOlapDatabase.ts
-- Se ejecuta al arrancar el API (migrationsRun). Este archivo queda como referencia
-- o para ejecutar a mano si hace falta:
--   psql -U academic -d postgres -f Database/scripts/drop-olap.sql

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'academic_olap' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS academic_olap;
