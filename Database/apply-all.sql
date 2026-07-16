-- ============================================
-- APPLY-ALL — Esquema OLTP (sin funciones PL/pgSQL de negocio)
-- La lógica de negocio vive en TypeORM / TypeScript.
-- Base nueva: solo tablas, constraints e índices (sin triggers).
-- Funciones históricas: Database/historical/README.md
-- ============================================

\echo '=== [OLTP] 1/3 schema_oltp.sql ==='
\i schema_oltp.sql

\echo '=== [OLTP] 2/3 migrations_extra/oltp_schema_delta.sql ==='
\i migrations_extra/oltp_schema_delta.sql

\echo '=== [OLTP] 3/3 migrations_extra/configuracion_sistema.sql ==='
\i migrations_extra/configuracion_sistema.sql

\echo '=== OLTP listo (solo esquema + constraints) ==='
\echo ''
\echo 'Aplicar OLAP manualmente:'
\echo '  psql -U academic -d academic_olap -f schema_olap.sql'
\echo '  psql -U academic -d academic_olap -f migrations_extra/olap_schema_delta.sql'
