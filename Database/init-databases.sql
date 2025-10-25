-- Script de inicialización para crear las dos bases de datos
-- Este script se ejecuta automáticamente cuando el contenedor de PostgreSQL inicia por primera vez

-- Crear base de datos OLTP (Transaccional)
CREATE DATABASE academic_oltp
    WITH 
    OWNER = academic
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE academic_oltp IS 'Base de datos transaccional (OLTP) para operaciones diarias del sistema académico';

-- Crear base de datos OLAP (Analítica - Esquema Estrella)
CREATE DATABASE academic_olap
    WITH 
    OWNER = academic
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.utf8'
    LC_CTYPE = 'en_US.utf8'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE academic_olap IS 'Base de datos analítica (OLAP) con esquema estrella para reportes y análisis';

-- Otorgar todos los privilegios al usuario academic en ambas bases de datos
GRANT ALL PRIVILEGES ON DATABASE academic_oltp TO academic;
GRANT ALL PRIVILEGES ON DATABASE academic_olap TO academic;
