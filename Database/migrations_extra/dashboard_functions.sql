-- ============================================
-- DASHBOARD FUNCTIONS
-- Extraído de 2025_01_30_000001 … 000005
-- + get_asistencias_estudiante_por_mes (nueva)
-- ============================================

-- Drop firmas viejas (2025_01_30_000003)
DROP FUNCTION IF EXISTS obtener_asistencias_estudiante(BIGINT, BIGINT, DATE, DATE);
DROP FUNCTION IF EXISTS obtener_notas_estudiante(BIGINT, BIGINT, INTEGER);

-- ========== Docente ==========

CREATE OR REPLACE FUNCTION get_estadisticas_curso(p_curso_id INTEGER)
RETURNS TABLE (
    curso_id INTEGER,
    total_estudiantes BIGINT,
    promedio_curso NUMERIC(5,2),
    asistencia_promedio NUMERIC(5,2),
    estudiantes_aprobados BIGINT,
    evaluaciones_creadas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH estudiantes_count AS (
        SELECT COUNT(*) as total
        FROM estudiantes_cursos ec
        WHERE ec.curso_id = p_curso_id
    ),
    evaluaciones_count AS (
        SELECT COUNT(*) as total
        FROM evaluaciones ev
        WHERE ev.curso_id = p_curso_id
    ),
    notas_stats AS (
        SELECT
            AVG(nd.puntaje) as promedio,
            COUNT(DISTINCT nd.estudiante_id) as total_con_notas
        FROM notas_detalle nd
        JOIN evaluaciones e ON nd.evaluacion_id = e.id
        WHERE e.curso_id = p_curso_id
    ),
    estudiantes_aprobados_count AS (
        SELECT COUNT(*) as total
        FROM (
            SELECT nd.estudiante_id, AVG(nd.puntaje) as promedio
            FROM notas_detalle nd
            JOIN evaluaciones e ON nd.evaluacion_id = e.id
            WHERE e.curso_id = p_curso_id
            GROUP BY nd.estudiante_id
            HAVING AVG(nd.puntaje) >= 11
        ) aprobados
    ),
    asistencia_stats AS (
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
            SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tardanzas
        FROM asistencias a
        WHERE a.curso_id = p_curso_id
    )
    SELECT
        p_curso_id,
        COALESCE(ec.total, 0),
        COALESCE(ROUND(ns.promedio, 2), 0),
        CASE
            WHEN COALESCE(ast.total, 0) > 0
            THEN ROUND(((COALESCE(ast.presentes, 0) + COALESCE(ast.tardanzas, 0))::NUMERIC / ast.total) * 100, 2)
            ELSE 0
        END,
        COALESCE(eac.total, 0),
        COALESCE(evc.total, 0)
    FROM estudiantes_count ec
    CROSS JOIN evaluaciones_count evc
    CROSS JOIN notas_stats ns
    CROSS JOIN estudiantes_aprobados_count eac
    CROSS JOIN asistencia_stats ast;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_dashboard_docente(p_docente_id INTEGER)
RETURNS TABLE (
    curso_id BIGINT,
    curso_nombre VARCHAR,
    curso_codigo VARCHAR,
    grado VARCHAR,
    seccion VARCHAR,
    total_estudiantes BIGINT,
    promedio_curso NUMERIC(5,2),
    asistencia_promedio NUMERIC(5,2),
    estudiantes_aprobados BIGINT,
    evaluaciones_creadas BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        cc.nombre,
        cc.codigo,
        g.nombre,
        s.nombre,
        est.total_estudiantes,
        est.promedio_curso,
        est.asistencia_promedio,
        est.estudiantes_aprobados,
        est.evaluaciones_creadas
    FROM cursos c
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    JOIN secciones s ON c.seccion_id = s.id
    JOIN grados g ON s.grado_id = g.id
    CROSS JOIN LATERAL get_estadisticas_curso(c.id::INTEGER) est
    WHERE c.docente_id = p_docente_id
    ORDER BY cc.nombre;
END;
$$ LANGUAGE plpgsql;

-- ========== Estudiante ==========

CREATE OR REPLACE FUNCTION get_notas_estudiante(p_estudiante_id INTEGER)
RETURNS TABLE (
    curso_id BIGINT,
    curso_nombre VARCHAR,
    promedio_numerico NUMERIC(5,2),
    promedio_literal TEXT,
    total_evaluaciones BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        cc.nombre,
        AVG(nd.puntaje)::NUMERIC(5,2) as promedio,
        CASE
            WHEN AVG(nd.puntaje) >= 18 THEN 'AD'
            WHEN AVG(nd.puntaje) >= 14 THEN 'A'
            WHEN AVG(nd.puntaje) >= 11 THEN 'B'
            ELSE 'C'
        END as literal,
        COUNT(DISTINCT e.id) as total_eval
    FROM estudiantes_cursos ec
    JOIN cursos c ON ec.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    JOIN evaluaciones e ON e.curso_id = c.id
    JOIN notas_detalle nd ON nd.evaluacion_id = e.id AND nd.estudiante_id = p_estudiante_id
    WHERE ec.estudiante_id = p_estudiante_id
    GROUP BY c.id, cc.nombre
    HAVING COUNT(nd.id) > 0
    ORDER BY cc.nombre;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_asistencias_estudiante(p_estudiante_id INTEGER)
RETURNS TABLE (
    curso_id BIGINT,
    curso_nombre VARCHAR,
    total_clases BIGINT,
    asistencias BIGINT,
    tardanzas BIGINT,
    faltas BIGINT,
    porcentaje_asistencia NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        cc.nombre,
        COUNT(*) as total,
        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tarde,
        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as ausente,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) +
                         SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END))::NUMERIC / COUNT(*)) * 100, 2)
            ELSE 0
        END as porcentaje
    FROM estudiantes_cursos ec
    JOIN cursos c ON ec.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    LEFT JOIN asistencias a ON a.curso_id = c.id AND a.estudiante_id = p_estudiante_id
    WHERE ec.estudiante_id = p_estudiante_id
    GROUP BY c.id, cc.nombre
    HAVING COUNT(a.id) > 0
    ORDER BY cc.nombre;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_dashboard_estudiante(p_estudiante_id INTEGER)
RETURNS TABLE (
    promedio_general NUMERIC(5,2),
    asistencia_general NUMERIC(5,2),
    total_cursos BIGINT,
    cursos_aprobados BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH notas_stats AS (
        SELECT
            COUNT(DISTINCT CASE WHEN promedio > 0 THEN c.id END) as total_cursos,
            AVG(promedio) FILTER (WHERE promedio > 0) as promedio_gral,
            COUNT(DISTINCT CASE WHEN promedio >= 11 THEN c.id END) as aprobados
        FROM estudiantes_cursos ec
        JOIN cursos c ON ec.curso_id = c.id
        LEFT JOIN (
            SELECT e.curso_id, AVG(nd.puntaje) as promedio
            FROM evaluaciones e
            JOIN notas_detalle nd ON nd.evaluacion_id = e.id
            WHERE nd.estudiante_id = p_estudiante_id
            GROUP BY e.curso_id
        ) promedios ON promedios.curso_id = c.id
        WHERE ec.estudiante_id = p_estudiante_id
    ),
    asistencia_stats AS (
        SELECT
            AVG(porcentaje) as asistencia_gral
        FROM (
            SELECT
                CASE
                    WHEN COUNT(*) > 0
                    THEN ((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) +
                           SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END))::NUMERIC / COUNT(*)) * 100
                    ELSE 0
                END as porcentaje
            FROM estudiantes_cursos ec
            JOIN cursos c ON ec.curso_id = c.id
            LEFT JOIN asistencias a ON a.curso_id = c.id AND a.estudiante_id = p_estudiante_id
            WHERE ec.estudiante_id = p_estudiante_id
            GROUP BY c.id
            HAVING COUNT(a.id) > 0
        ) porcentajes
    )
    SELECT
        COALESCE(ns.promedio_gral, 0)::NUMERIC(5,2),
        COALESCE(ast.asistencia_gral, 0)::NUMERIC(5,2),
        COALESCE(ns.total_cursos, 0),
        COALESCE(ns.aprobados, 0)
    FROM notas_stats ns
    CROSS JOIN asistencia_stats ast;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_notas_detalladas_estudiante(p_estudiante_id INTEGER)
RETURNS TABLE (
    curso_id BIGINT,
    curso_nombre VARCHAR,
    curso_codigo VARCHAR,
    promedio_numerico NUMERIC(5,2),
    promedio_literal TEXT,
    evaluaciones JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        cc.nombre,
        cc.codigo,
        COALESCE(AVG(nd.puntaje), 0)::NUMERIC(5,2) as promedio,
        CASE
            WHEN AVG(nd.puntaje) >= 18 THEN 'AD'
            WHEN AVG(nd.puntaje) >= 14 THEN 'A'
            WHEN AVG(nd.puntaje) >= 11 THEN 'B'
            ELSE 'C'
        END as literal,
        COALESCE(
            json_agg(
                json_build_object(
                    'id', e.id,
                    'nombre', e.nombre,
                    'tipo_evaluacion', e.tipo_evaluacion,
                    'mes', e.mes,
                    'puntaje', nd.puntaje,
                    'peso', e.peso
                ) ORDER BY e.mes, e.orden
            ) FILTER (WHERE e.id IS NOT NULL),
            '[]'::json
        ) as evaluaciones
    FROM estudiantes_cursos ec
    JOIN cursos c ON ec.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    LEFT JOIN evaluaciones e ON e.curso_id = c.id
    LEFT JOIN notas_detalle nd ON nd.evaluacion_id = e.id AND nd.estudiante_id = p_estudiante_id
    WHERE ec.estudiante_id = p_estudiante_id
    GROUP BY c.id, cc.nombre, cc.codigo
    ORDER BY cc.nombre;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_asistencias_estudiante_fecha(
    p_estudiante_id INTEGER,
    p_fecha DATE DEFAULT NULL
)
RETURNS TABLE (
    curso_id BIGINT,
    curso_nombre VARCHAR,
    total_clases BIGINT,
    asistencias BIGINT,
    tardanzas BIGINT,
    faltas BIGINT,
    porcentaje_asistencia NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        cc.nombre,
        COUNT(*) as total,
        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tarde,
        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as ausente,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) +
                         SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END))::NUMERIC / COUNT(*)) * 100, 2)
            ELSE 0
        END as porcentaje
    FROM estudiantes_cursos ec
    JOIN cursos c ON ec.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    LEFT JOIN asistencias a ON a.curso_id = c.id
        AND a.estudiante_id = p_estudiante_id
        AND (p_fecha IS NULL OR a.fecha = p_fecha)
    WHERE ec.estudiante_id = p_estudiante_id
    GROUP BY c.id, cc.nombre
    HAVING COUNT(a.id) > 0
    ORDER BY cc.nombre;
END;
$$ LANGUAGE plpgsql;

-- ========== NUEVA: asistencias por mes ==========

CREATE OR REPLACE FUNCTION get_asistencias_estudiante_por_mes(
    p_estudiante_id INTEGER,
    p_mes INTEGER
)
RETURNS TABLE (
    curso_id BIGINT,
    curso_nombre VARCHAR,
    total_clases BIGINT,
    asistencias BIGINT,
    tardanzas BIGINT,
    faltas BIGINT,
    porcentaje_asistencia NUMERIC(5,2)
) AS $$
BEGIN
    IF p_mes < 1 OR p_mes > 12 THEN
        RAISE EXCEPTION 'El mes debe estar entre 1 y 12';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        cc.nombre,
        COUNT(*) as total,
        SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tarde,
        SUM(CASE WHEN a.estado = 'ausente' THEN 1 ELSE 0 END) as ausente,
        CASE
            WHEN COUNT(*) > 0
            THEN ROUND(((SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) +
                         SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END))::NUMERIC / COUNT(*)) * 100, 2)
            ELSE 0
        END as porcentaje
    FROM estudiantes_cursos ec
    JOIN cursos c ON ec.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    LEFT JOIN asistencias a ON a.curso_id = c.id
        AND a.estudiante_id = p_estudiante_id
        AND EXTRACT(MONTH FROM a.fecha) = p_mes
    WHERE ec.estudiante_id = p_estudiante_id
    GROUP BY c.id, cc.nombre
    HAVING COUNT(a.id) > 0
    ORDER BY cc.nombre;
END;
$$ LANGUAGE plpgsql;
