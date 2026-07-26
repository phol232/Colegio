-- Script de inicialización: base de datos transaccional
-- Se ejecuta automáticamente cuando el contenedor de PostgreSQL inicia por primera vez

CREATE DATABASE academic_oltp
    WITH
    OWNER = academic
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE academic_oltp IS 'Base de datos transaccional (OLTP) del sistema académico';

GRANT ALL PRIVILEGES ON DATABASE academic_oltp TO academic;
