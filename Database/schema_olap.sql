-- ============================================
-- ACADEMIC MANAGEMENT SYSTEM - OLAP DATABASE
-- Base de datos analítica con esquema estrella (academic_olap)
-- ============================================

-- ============================================
-- DIMENSIONES
-- ============================================

-- Dimensión: dim_estudiante
-- Información de estudiantes para análisis
CREATE TABLE dim_estudiante (
    estudiante_key SERIAL PRIMARY KEY,
    estudiante_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_est_id ON dim_estudiante(estudiante_id);

COMMENT ON TABLE dim_estudiante IS 'Dimensión de estudiantes para análisis';
COMMENT ON COLUMN dim_estudiante.estudiante_key IS 'Clave surrogada de la dimensión';
COMMENT ON COLUMN dim_estudiante.estudiante_id IS 'ID del estudiante en OLTP';

-- ============================================

-- Dimensión: dim_curso
-- Información de cursos para análisis
CREATE TABLE dim_curso (
    curso_key SERIAL PRIMARY KEY,
    curso_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    codigo VARCHAR(50) NOT NULL,
    docente_nombre VARCHAR(255),
    grado_nombre VARCHAR(255),
    seccion_nombre VARCHAR(255),
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_curso_id ON dim_curso(curso_id);

COMMENT ON TABLE dim_curso IS 'Dimensión de cursos para análisis';
COMMENT ON COLUMN dim_curso.curso_key IS 'Clave surrogada de la dimensión';
COMMENT ON COLUMN dim_curso.curso_id IS 'ID del curso en OLTP';

-- ============================================

-- Dimensión: dim_tiempo
-- Dimensión temporal para análisis por fecha
CREATE TABLE dim_tiempo (
    tiempo_key SERIAL PRIMARY KEY,
    fecha DATE UNIQUE NOT NULL,
    dia SMALLINT NOT NULL,
    mes SMALLINT NOT NULL,
    anio SMALLINT NOT NULL,
    trimestre SMALLINT NOT NULL,
    semestre SMALLINT NOT NULL,
    dia_semana SMALLINT NOT NULL,
    nombre_mes VARCHAR(20),
    nombre_dia VARCHAR(20)
);

CREATE INDEX idx_dim_tiempo_fecha ON dim_tiempo(fecha);
CREATE INDEX idx_dim_tiempo_anio_mes ON dim_tiempo(anio, mes);

COMMENT ON TABLE dim_tiempo IS 'Dimensión temporal para análisis';
COMMENT ON COLUMN dim_tiempo.tiempo_key IS 'Clave surrogada de la dimensión';
COMMENT ON COLUMN dim_tiempo.trimestre IS 'Trimestre del año (1-4)';
COMMENT ON COLUMN dim_tiempo.semestre IS 'Semestre del año (1-2)';
COMMENT ON COLUMN dim_tiempo.dia_semana IS 'Día de la semana (1=Lunes, 7=Domingo)';

-- ============================================

-- Dimensión: dim_docente
-- Información de docentes para análisis
CREATE TABLE dim_docente (
    docente_key SERIAL PRIMARY KEY,
    docente_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_docente_id ON dim_docente(docente_id);

COMMENT ON TABLE dim_docente IS 'Dimensión de docentes para análisis';
COMMENT ON COLUMN dim_docente.docente_key IS 'Clave surrogada de la dimensión';
COMMENT ON COLUMN dim_docente.docente_id IS 'ID del docente en OLTP';

-- ============================================

-- Dimensión: dim_grado
-- Información de grados académicos para análisis
CREATE TABLE dim_grado (
    grado_key SERIAL PRIMARY KEY,
    grado_id BIGINT UNIQUE NOT NULL,
    nivel VARCHAR(255) NOT NULL,
    numero SMALLINT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_grado_id ON dim_grado(grado_id);
CREATE INDEX idx_dim_grado_nivel ON dim_grado(nivel);

COMMENT ON TABLE dim_grado IS 'Dimensión de grados académicos para análisis';
COMMENT ON COLUMN dim_grado.grado_key IS 'Clave surrogada de la dimensión';
COMMENT ON COLUMN dim_grado.nivel IS 'Nivel educativo: primaria o secundaria';

-- ============================================

-- Dimensión: dim_seccion
-- Información de secciones para análisis
CREATE TABLE dim_seccion (
    seccion_key SERIAL PRIMARY KEY,
    seccion_id BIGINT UNIQUE NOT NULL,
    nombre VARCHAR(10) NOT NULL,
    grado_key INTEGER NOT NULL,
    grado_nombre VARCHAR(255),
    fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dim_seccion_id ON dim_seccion(seccion_id);
CREATE INDEX idx_dim_seccion_grado ON dim_seccion(grado_key);

COMMENT ON TABLE dim_seccion IS 'Dimensión de secciones para análisis';
COMMENT ON COLUMN dim_seccion.seccion_key IS 'Clave surrogada de la dimensión';
COMMENT ON COLUMN dim_seccion.nombre IS 'Nombre de la sección (A, B, C, D)';

-- ============================================
-- TABLA DE HECHOS
-- ============================================

-- Tabla de Hechos: fact_rendimiento_estudiantil
-- Métricas agregadas de rendimiento estudiantil
CREATE TABLE fact_rendimiento_estudiantil (
    id BIGSERIAL PRIMARY KEY,
    
    -- Claves foráneas a dimensiones
    estudiante_key INTEGER NOT NULL REFERENCES dim_estudiante(estudiante_key),
    curso_key INTEGER NOT NULL REFERENCES dim_curso(curso_key),
    tiempo_key INTEGER NOT NULL REFERENCES dim_tiempo(tiempo_key),
    docente_key INTEGER NOT NULL REFERENCES dim_docente(docente_key),
    grado_key INTEGER REFERENCES dim_grado(grado_key),
    seccion_key INTEGER REFERENCES dim_seccion(seccion_key),
    
    -- Contexto temporal
    anio_academico SMALLINT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    
    -- Métricas de asistencia
    total_asistencias INTEGER DEFAULT 0,
    total_faltas INTEGER DEFAULT 0,
    total_tardanzas INTEGER DEFAULT 0,
    porcentaje_asistencia DECIMAL(5,2) DEFAULT 0,
    total_clases INTEGER DEFAULT 0,
    
    -- Métricas de notas
    promedio_notas DECIMAL(4,2),
    nota_unidad_1 DECIMAL(4,2),
    nota_unidad_2 DECIMAL(4,2),
    nota_unidad_3 DECIMAL(4,2),
    nota_unidad_4 DECIMAL(4,2),
    
    -- Metadata
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint único: un estudiante solo puede tener un registro por curso por día
    UNIQUE(estudiante_key, curso_key, tiempo_key)
);

-- Índices para optimizar consultas analíticas
CREATE INDEX idx_fact_estudiante ON fact_rendimiento_estudiantil(estudiante_key);
CREATE INDEX idx_fact_curso ON fact_rendimiento_estudiantil(curso_key);
CREATE INDEX idx_fact_tiempo ON fact_rendimiento_estudiantil(tiempo_key);
CREATE INDEX idx_fact_grado ON fact_rendimiento_estudiantil(grado_key);
CREATE INDEX idx_fact_seccion ON fact_rendimiento_estudiantil(seccion_key);
CREATE INDEX idx_fact_anio ON fact_rendimiento_estudiantil(anio_academico);
CREATE INDEX idx_fact_compuesto ON fact_rendimiento_estudiantil(curso_key, tiempo_key);

COMMENT ON TABLE fact_rendimiento_estudiantil IS 'Tabla de hechos con métricas de rendimiento estudiantil';
COMMENT ON COLUMN fact_rendimiento_estudiantil.total_asistencias IS 'Total de asistencias del estudiante';
COMMENT ON COLUMN fact_rendimiento_estudiantil.total_faltas IS 'Total de faltas del estudiante';
COMMENT ON COLUMN fact_rendimiento_estudiantil.total_tardanzas IS 'Total de tardanzas del estudiante';
COMMENT ON COLUMN fact_rendimiento_estudiantil.porcentaje_asistencia IS 'Porcentaje de asistencia (0-100)';
COMMENT ON COLUMN fact_rendimiento_estudiantil.promedio_notas IS 'Promedio de notas del estudiante';

-- ============================================
-- TABLA DE CONTROL ETL
-- ============================================

-- Tabla: control_etl
-- Control de procesos ETL (OLTP → OLAP)
CREATE TABLE control_etl (
    id SERIAL PRIMARY KEY,
    proceso VARCHAR(100) NOT NULL,
    ultima_ejecucion TIMESTAMP,
    estado VARCHAR(50),
    registros_procesados INTEGER,
    errores TEXT
);

COMMENT ON TABLE control_etl IS 'Control de procesos ETL para sincronización OLTP → OLAP';
COMMENT ON COLUMN control_etl.proceso IS 'Nombre del proceso ETL';
COMMENT ON COLUMN control_etl.estado IS 'Estado del proceso: exitoso, fallido, en_proceso';

-- ============================================
-- VISTAS ANALÍTICAS ÚTILES
-- ============================================

-- Vista: rendimiento_por_grado
-- Análisis de rendimiento agregado por grado
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
GROUP BY g.nombre, g.nivel, f.anio_academico
ORDER BY g.nivel, g.numero;

COMMENT ON VIEW rendimiento_por_grado IS 'Vista analítica de rendimiento agregado por grado';

-- ============================================

-- Vista: rendimiento_por_seccion
-- Análisis de rendimiento agregado por sección
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

COMMENT ON VIEW rendimiento_por_seccion IS 'Vista analítica de rendimiento agregado por sección';

-- ============================================

-- Vista: rendimiento_por_curso
-- Análisis de rendimiento agregado por curso
CREATE OR REPLACE VIEW rendimiento_por_curso AS
SELECT 
    c.nombre AS curso,
    c.codigo,
    c.grado_nombre,
    c.seccion_nombre,
    d.nombre AS docente,
    COUNT(DISTINCT f.estudiante_key) AS total_estudiantes,
    AVG(f.promedio_notas) AS promedio_curso,
    AVG(f.porcentaje_asistencia) AS asistencia_promedio,
    f.anio_academico
FROM fact_rendimiento_estudiantil f
JOIN dim_curso c ON f.curso_key = c.curso_key
JOIN dim_docente d ON f.docente_key = d.docente_key
GROUP BY c.nombre, c.codigo, c.grado_nombre, c.seccion_nombre, d.nombre, f.anio_academico
ORDER BY c.nombre;

COMMENT ON VIEW rendimiento_por_curso IS 'Vista analítica de rendimiento agregado por curso';

-- ============================================

-- Vista: evolucion_temporal
-- Análisis de evolución temporal del rendimiento
CREATE OR REPLACE VIEW evolucion_temporal AS
SELECT 
    t.anio,
    t.mes,
    t.nombre_mes,
    COUNT(DISTINCT f.estudiante_key) AS total_estudiantes,
    AVG(f.promedio_notas) AS promedio_mensual,
    AVG(f.porcentaje_asistencia) AS asistencia_mensual
FROM fact_rendimiento_estudiantil f
JOIN dim_tiempo t ON f.tiempo_key = t.tiempo_key
GROUP BY t.anio, t.mes, t.nombre_mes
ORDER BY t.anio, t.mes;

COMMENT ON VIEW evolucion_temporal IS 'Vista analítica de evolución temporal del rendimiento';

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función: poblar_dim_tiempo
-- Pobla la dimensión tiempo con fechas de un rango
CREATE OR REPLACE FUNCTION poblar_dim_tiempo(fecha_inicio DATE, fecha_fin DATE)
RETURNS INTEGER AS $$
DECLARE
    fecha_actual DATE;
    registros_insertados INTEGER := 0;
BEGIN
    fecha_actual := fecha_inicio;
    
    WHILE fecha_actual <= fecha_fin LOOP
        INSERT INTO dim_tiempo (
            fecha, dia, mes, anio, trimestre, semestre, dia_semana,
            nombre_mes, nombre_dia
        ) VALUES (
            fecha_actual,
            EXTRACT(DAY FROM fecha_actual),
            EXTRACT(MONTH FROM fecha_actual),
            EXTRACT(YEAR FROM fecha_actual),
            CEIL(EXTRACT(MONTH FROM fecha_actual) / 3.0),
            CEIL(EXTRACT(MONTH FROM fecha_actual) / 6.0),
            EXTRACT(ISODOW FROM fecha_actual),
            TO_CHAR(fecha_actual, 'TMMonth'),
            TO_CHAR(fecha_actual, 'TMDay')
        )
        ON CONFLICT (fecha) DO NOTHING;
        
        registros_insertados := registros_insertados + 1;
        fecha_actual := fecha_actual + INTERVAL '1 day';
    END LOOP;
    
    RETURN registros_insertados;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION poblar_dim_tiempo IS 'Función para poblar la dimensión tiempo con un rango de fechas';

-- Poblar dimensión tiempo para el año actual y próximos 2 años
SELECT poblar_dim_tiempo(
    DATE_TRUNC('year', CURRENT_DATE)::DATE,
    (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '3 years')::DATE
);

-- ============================================
-- FIN DEL ESQUEMA OLAP
-- ============================================
