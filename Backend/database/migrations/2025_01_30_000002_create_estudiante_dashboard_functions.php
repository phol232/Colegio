<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Función para obtener resumen de notas de un estudiante
        DB::statement("
            CREATE OR REPLACE FUNCTION get_notas_estudiante(p_estudiante_id INTEGER)
            RETURNS TABLE (
                curso_id BIGINT,
                curso_nombre VARCHAR,
                promedio_numerico NUMERIC(5,2),
                promedio_literal TEXT,
                total_evaluaciones BIGINT
            ) AS \$\$
            BEGIN
                RETURN QUERY
                SELECT 
                    c.id,
                    cc.nombre,
                    COALESCE(AVG(nd.puntaje), 0)::NUMERIC(5,2) as promedio,
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
                LEFT JOIN evaluaciones e ON e.curso_id = c.id
                LEFT JOIN notas_detalle nd ON nd.evaluacion_id = e.id AND nd.estudiante_id = p_estudiante_id
                WHERE ec.estudiante_id = p_estudiante_id
                GROUP BY c.id, cc.nombre
                ORDER BY cc.nombre;
            END;
            \$\$ LANGUAGE plpgsql;
        ");

        // Función para obtener resumen de asistencias de un estudiante
        DB::statement("
            CREATE OR REPLACE FUNCTION get_asistencias_estudiante(p_estudiante_id INTEGER)
            RETURNS TABLE (
                curso_id BIGINT,
                curso_nombre VARCHAR,
                total_clases BIGINT,
                asistencias BIGINT,
                tardanzas BIGINT,
                faltas BIGINT,
                porcentaje_asistencia NUMERIC(5,2)
            ) AS \$\$
            BEGIN
                RETURN QUERY
                SELECT 
                    c.id,
                    cc.nombre,
                    COUNT(*) as total,
                    SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END) as presentes,
                    SUM(CASE WHEN a.estado = 'tardanza' THEN 1 ELSE 0 END) as tarde,
                    SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END) as ausente,
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
            \$\$ LANGUAGE plpgsql;
        ");

        // Función para obtener dashboard completo del estudiante
        DB::statement("
            CREATE OR REPLACE FUNCTION get_dashboard_estudiante(p_estudiante_id INTEGER)
            RETURNS TABLE (
                promedio_general NUMERIC(5,2),
                asistencia_general NUMERIC(5,2),
                total_cursos BIGINT,
                cursos_aprobados BIGINT
            ) AS \$\$
            BEGIN
                RETURN QUERY
                WITH notas_stats AS (
                    SELECT 
                        COUNT(DISTINCT c.id) as total_cursos,
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
            \$\$ LANGUAGE plpgsql;
        ");
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS get_dashboard_estudiante(INTEGER)');
        DB::statement('DROP FUNCTION IF EXISTS get_asistencias_estudiante(INTEGER)');
        DB::statement('DROP FUNCTION IF EXISTS get_notas_estudiante(INTEGER)');
    }
};
