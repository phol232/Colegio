-- ============================================
-- APPLY-ALL — Esquema OLTP (sin funciones PL/pgSQL de negocio)
-- La lógica de negocio vive en TypeORM / TypeScript.
-- El análisis lee directamente de OLTP (sin base OLAP).
-- ============================================

\echo '=== [OLTP] 1/3 schema_oltp.sql ==='
\i schema_oltp.sql

\echo '=== [OLTP] 2/3 migrations_extra/oltp_schema_delta.sql ==='
\i migrations_extra/oltp_schema_delta.sql

\echo '=== [OLTP] 3/3 migrations_extra/configuracion_sistema.sql ==='
\i migrations_extra/configuracion_sistema.sql

\echo '=== OLTP base listo ==='
\echo 'Migraciones TypeORM al arrancar el API (pnpm start:prod):'
\echo '  matricula_anual → sync_estudiantes_cursos → analytics_indexes'
