<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Función para obtener estadísticas de un curso específico
        DB::statement("
            CREATE OR REPLACE FUNCTION get_estadisticas_curso(p_curso_id INTEGER)
            RETURNS TABLE (
                curso_id INTEGER,
                total_estudiantes BIGINT,
                promedio_curso NUMERIC(5,2),
                asistencia_promedio NUMERIC(5,2),
                estudiantes_aprobados BIGINT,
                evaluaciones_creadas BIGINT
            ) AS \$\$
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
            \$\$ LANGUAGE plpgsql;
        ");

        // Función para obtener todas las estadísticas de los cursos de un docente
        DB::statement("
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
            ) AS \$\$
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
            \$\$ LANGUAGE plpgsql;
        ");
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS get_dashboard_docente(INTEGER)');
        DB::statement('DROP FUNCTION IF EXISTS get_estadisticas_curso(INTEGER)');
    }
};
