<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Función para obtener asistencias filtradas por fecha
        DB::statement("
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
                LEFT JOIN asistencias a ON a.curso_id = c.id 
                    AND a.estudiante_id = p_estudiante_id
                    AND (p_fecha IS NULL OR a.fecha = p_fecha)
                WHERE ec.estudiante_id = p_estudiante_id
                GROUP BY c.id, cc.nombre
                HAVING COUNT(a.id) > 0
                ORDER BY cc.nombre;
            END;
            \$\$ LANGUAGE plpgsql;
        ");
    }

    public function down(): void
    {
        DB::statement('DROP FUNCTION IF EXISTS get_asistencias_estudiante_fecha(INTEGER, DATE)');
    }
};
