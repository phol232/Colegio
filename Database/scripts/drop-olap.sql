-- Referencia: la base academic_olap ya no se usa (el análisis lee de OLTP).
-- No se elimina automáticamente. Si quieres borrarla a mano:
--   psql -U academic -d postgres -f Database/scripts/drop-olap.sql

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'academic_olap' AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS academic_olap;
