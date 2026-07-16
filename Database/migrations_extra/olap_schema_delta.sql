-- ============================================
-- OLAP SCHEMA DELTA
-- De: olap/2025_10_22_070007_add_grado_seccion_to_olap_tables
-- NOTA: schema_olap.sql YA incluye todo esto en CREATE fresco.
-- Este script solo sirve para upgrade de DBs OLAP antiguas.
-- Conectar a: academic_olap
-- ============================================

-- dim_grado
CREATE TABLE IF NOT EXISTS dim_grado (
    grado_key SERIAL PRIMARY KEY,
    grado_id BIGINT UNIQUE NOT NULL,
    nivel VARCHAR(255) NOT NULL,
    numero SMALLINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dim_grado_id ON dim_grado(grado_id);
CREATE INDEX IF NOT EXISTS idx_dim_grado_nivel ON dim_grado(nivel);

-- dim_seccion
CREATE TABLE IF NOT EXISTS dim_seccion (
    seccion_key SERIAL PRIMARY KEY,
    seccion_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(10) NOT NULL,
    grado_key INTEGER NOT NULL,
    grado_nombre VARCHAR(255),
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dim_seccion_id ON dim_seccion(seccion_id);
CREATE INDEX IF NOT EXISTS idx_dim_seccion_grado ON dim_seccion(grado_key);

-- dim_curso: grado_nombre / seccion_nombre
ALTER TABLE dim_curso
    ADD COLUMN IF NOT EXISTS grado_nombre VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seccion_nombre VARCHAR(255);

-- fact_rendimiento_estudiantil: grado_key / seccion_key / anio_academico
ALTER TABLE fact_rendimiento_estudiantil
    ADD COLUMN IF NOT EXISTS grado_key INTEGER,
    ADD COLUMN IF NOT EXISTS seccion_key INTEGER,
    ADD COLUMN IF NOT EXISTS anio_academico SMALLINT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fact_rendimiento_estudiantil_grado_key_fkey'
    ) THEN
        ALTER TABLE fact_rendimiento_estudiantil
            ADD CONSTRAINT fact_rendimiento_estudiantil_grado_key_fkey
            FOREIGN KEY (grado_key) REFERENCES dim_grado(grado_key);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fact_rendimiento_estudiantil_seccion_key_fkey'
    ) THEN
        ALTER TABLE fact_rendimiento_estudiantil
            ADD CONSTRAINT fact_rendimiento_estudiantil_seccion_key_fkey
            FOREIGN KEY (seccion_key) REFERENCES dim_seccion(seccion_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fact_grado ON fact_rendimiento_estudiantil(grado_key);
CREATE INDEX IF NOT EXISTS idx_fact_seccion ON fact_rendimiento_estudiantil(seccion_key);
CREATE INDEX IF NOT EXISTS idx_fact_anio ON fact_rendimiento_estudiantil(anio_academico);

-- Vistas (recrear por si se aplicó sobre schema sin ellas)
CREATE OR REPLACE VIEW rendimiento_por_grado AS
SELECT
    g.nombre AS grado,
    g.nivel,
    COUNT(DISTINCT f.estudiante_key) AS total_estudiantes,
    AVG(f.promedio_notas) AS promedio_general,
    AVG(f.porcentaje_asistencia) AS asistencia_promedio,
    SUM(f.total_faltas) AS total_faltas,
    f.anio_academico
FROM fact_rendimiento_estudiantil f
JOIN dim_grado g ON f.grado_key = g.grado_key
GROUP BY g.nombre, g.nivel, g.numero, f.anio_academico
ORDER BY g.nivel, g.numero;

CREATE OR REPLACE VIEW rendimiento_por_seccion AS
SELECT
    g.nombre AS grado,
    s.nombre AS seccion,
    COUNT(DISTINCT f.estudiante_key) AS total_estudiantes,
    AVG(f.promedio_notas) AS promedio_general,
    AVG(f.porcentaje_asistencia) AS asistencia_promedio,
    f.anio_academico
FROM fact_rendimiento_estudiantil f
JOIN dim_grado g ON f.grado_key = g.grado_key
JOIN dim_seccion s ON f.seccion_key = s.seccion_key
GROUP BY g.nombre, s.nombre, f.anio_academico
ORDER BY g.nombre, s.nombre;
