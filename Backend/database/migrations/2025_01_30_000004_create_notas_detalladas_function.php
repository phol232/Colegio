<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Función para obtener notas detalladas con evaluaciones
        DB::statement("
            CREATE OR REPLACE FUNCTION get_notas_detalladas_estudiante(p_estudiante_id INTEGER)
            RETURNS TABLE (
                curso_id BIGINT,
                curso_nombre VARCHAR,
                curso_codigo VARCHAR,
                promedio_numerico NUMERIC(5,2),
                promedio_literal TEXT,
                evaluaciones JSON
            ) AS \$\$
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
            \$\$ LANGUAGE plpgsql;
        ");
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS get_notas_detalladas_estudiante(INTEGER)');
    }
};
