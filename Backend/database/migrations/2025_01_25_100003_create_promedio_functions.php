<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::unprepared("
            -- Función para convertir promedio numérico a literal (primaria)
            CREATE OR REPLACE FUNCTION convertir_a_literal(
                p_promedio_numerico DECIMAL(4,2)
            )
            RETURNS VARCHAR(2) AS $$
            BEGIN
                IF p_promedio_numerico >= 17 THEN
                    RETURN 'AD';  -- Logro destacado
                ELSIF p_promedio_numerico >= 14 THEN
                    RETURN 'A';   -- Logro esperado
                ELSIF p_promedio_numerico >= 11 THEN
                    RETURN 'B';   -- En proceso
                ELSE
                    RETURN 'C';   -- En inicio
                END IF;
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
            
            -- Función para calcular promedio simple (sin pesos)
            CREATE OR REPLACE FUNCTION calcular_promedio_simple(
                p_estudiante_id BIGINT,
                p_curso_id BIGINT,
                p_unidad SMALLINT
            )
            RETURNS DECIMAL(4,2) AS $$
            DECLARE
                v_promedio DECIMAL(4,2);
            BEGIN
                SELECT ROUND(AVG(nd.puntaje), 2)
                INTO v_promedio
                FROM notas_detalle nd
                JOIN evaluaciones e ON nd.evaluacion_id = e.id
                WHERE nd.estudiante_id = p_estudiante_id
                    AND e.curso_id = p_curso_id
                    AND e.unidad = p_unidad;
                
                RETURN COALESCE(v_promedio, 0);
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para calcular promedio ponderado (con pesos)
            CREATE OR REPLACE FUNCTION calcular_promedio_ponderado(
                p_estudiante_id BIGINT,
                p_curso_id BIGINT,
                p_unidad SMALLINT
            )
            RETURNS DECIMAL(4,2) AS $$
            DECLARE
                v_promedio DECIMAL(4,2);
            BEGIN
                SELECT ROUND(SUM(nd.puntaje * e.peso / 100), 2)
                INTO v_promedio
                FROM notas_detalle nd
                JOIN evaluaciones e ON nd.evaluacion_id = e.id
                WHERE nd.estudiante_id = p_estudiante_id
                    AND e.curso_id = p_curso_id
                    AND e.unidad = p_unidad
                    AND e.peso IS NOT NULL;
                
                RETURN COALESCE(v_promedio, 0);
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función principal para calcular promedio de unidad
            CREATE OR REPLACE FUNCTION calcular_promedio_unidad(
                p_estudiante_id BIGINT,
                p_curso_id BIGINT,
                p_unidad SMALLINT
            )
            RETURNS DECIMAL(4,2) AS $$
            DECLARE
                v_promedio DECIMAL(4,2);
                v_tiene_pesos BOOLEAN;
                v_suma_pesos DECIMAL(5,2);
            BEGIN
                -- Verificar si las evaluaciones tienen pesos asignados
                SELECT 
                    COUNT(*) FILTER (WHERE peso IS NOT NULL) > 0,
                    SUM(peso)
                INTO v_tiene_pesos, v_suma_pesos
                FROM evaluaciones
                WHERE curso_id = p_curso_id AND unidad = p_unidad;
                
                -- Si todas las evaluaciones tienen peso y suman 100%, usar promedio ponderado
                IF v_tiene_pesos AND v_suma_pesos = 100 THEN
                    v_promedio := calcular_promedio_ponderado(p_estudiante_id, p_curso_id, p_unidad);
                ELSE
                    -- Caso contrario, usar promedio simple
                    v_promedio := calcular_promedio_simple(p_estudiante_id, p_curso_id, p_unidad);
                END IF;
                
                RETURN v_promedio;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para obtener promedio de un estudiante en un curso/unidad
            CREATE OR REPLACE FUNCTION obtener_promedio_estudiante(
                p_estudiante_id BIGINT,
                p_curso_id BIGINT,
                p_unidad SMALLINT
            )
            RETURNS JSON AS $$
            DECLARE
                v_result JSON;
                v_promedio DECIMAL(4,2);
                v_literal VARCHAR(2);
                v_total_evaluaciones INTEGER;
            BEGIN
                -- Calcular promedio
                v_promedio := calcular_promedio_unidad(p_estudiante_id, p_curso_id, p_unidad);
                
                -- Convertir a literal
                v_literal := convertir_a_literal(v_promedio);
                
                -- Contar evaluaciones con nota
                SELECT COUNT(*) INTO v_total_evaluaciones
                FROM notas_detalle nd
                JOIN evaluaciones e ON nd.evaluacion_id = e.id
                WHERE nd.estudiante_id = p_estudiante_id
                    AND e.curso_id = p_curso_id
                    AND e.unidad = p_unidad;
                
                SELECT json_build_object(
                    'success', true,
                    'data', json_build_object(
                        'estudiante_id', p_estudiante_id,
                        'curso_id', p_curso_id,
                        'unidad', p_unidad,
                        'promedio_numerico', v_promedio,
                        'promedio_literal', v_literal,
                        'total_evaluaciones', v_total_evaluaciones
                    )
                ) INTO v_result;
                
                RETURN v_result;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para obtener promedios de todos los estudiantes de un curso/unidad
            CREATE OR REPLACE FUNCTION obtener_promedios_curso_unidad(
                p_curso_id BIGINT,
                p_unidad SMALLINT
            )
            RETURNS JSON AS $$
            DECLARE
                v_result JSON;
            BEGIN
                SELECT json_build_object(
                    'success', true,
                    'data', COALESCE(json_agg(
                        json_build_object(
                            'estudiante_id', pu.estudiante_id,
                            'estudiante_nombre', u.name,
                            'estudiante_email', u.email,
                            'promedio_numerico', pu.promedio_numerico,
                            'promedio_literal', pu.promedio_literal,
                            'total_evaluaciones', pu.total_evaluaciones,
                            'updated_at', pu.updated_at
                        ) ORDER BY u.name
                    ), '[]'::json)
                ) INTO v_result
                FROM promedios_unidad pu
                JOIN usuarios u ON pu.estudiante_id = u.id
                WHERE pu.curso_id = p_curso_id AND pu.unidad = p_unidad;
                
                RETURN v_result;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para recalcular todos los promedios de un curso/unidad
            CREATE OR REPLACE FUNCTION recalcular_promedios_curso_unidad(
                p_curso_id BIGINT,
                p_unidad SMALLINT
            )
            RETURNS JSON AS $$
            DECLARE
                v_estudiante RECORD;
                v_promedio DECIMAL(4,2);
                v_literal VARCHAR(2);
                v_total_evaluaciones INTEGER;
                v_count INTEGER := 0;
            BEGIN
                -- Obtener todos los estudiantes con notas en este curso/unidad
                FOR v_estudiante IN
                    SELECT DISTINCT nd.estudiante_id
                    FROM notas_detalle nd
                    JOIN evaluaciones e ON nd.evaluacion_id = e.id
                    WHERE e.curso_id = p_curso_id AND e.unidad = p_unidad
                LOOP
                    -- Calcular promedio
                    v_promedio := calcular_promedio_unidad(v_estudiante.estudiante_id, p_curso_id, p_unidad);
                    v_literal := convertir_a_literal(v_promedio);
                    
                    -- Contar evaluaciones
                    SELECT COUNT(*) INTO v_total_evaluaciones
                    FROM notas_detalle nd
                    JOIN evaluaciones e ON nd.evaluacion_id = e.id
                    WHERE nd.estudiante_id = v_estudiante.estudiante_id
                        AND e.curso_id = p_curso_id
                        AND e.unidad = p_unidad;
                    
                    -- Actualizar o insertar promedio
                    INSERT INTO promedios_unidad (estudiante_id, curso_id, unidad, promedio_numerico, promedio_literal, total_evaluaciones, updated_at)
                    VALUES (v_estudiante.estudiante_id, p_curso_id, p_unidad, v_promedio, v_literal, v_total_evaluaciones, CURRENT_TIMESTAMP)
                    ON CONFLICT (estudiante_id, curso_id, unidad)
                    DO UPDATE SET
                        promedio_numerico = EXCLUDED.promedio_numerico,
                        promedio_literal = EXCLUDED.promedio_literal,
                        total_evaluaciones = EXCLUDED.total_evaluaciones,
                        updated_at = CURRENT_TIMESTAMP;
                    
                    v_count := v_count + 1;
                END LOOP;
                
                RETURN json_build_object(
                    'success', true,
                    'message', 'Recalculados ' || v_count || ' promedios',
                    'count', v_count
                );
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al recalcular promedios: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("
            DROP FUNCTION IF EXISTS convertir_a_literal;
            DROP FUNCTION IF EXISTS calcular_promedio_simple;
            DROP FUNCTION IF EXISTS calcular_promedio_ponderado;
            DROP FUNCTION IF EXISTS calcular_promedio_unidad;
            DROP FUNCTION IF EXISTS obtener_promedio_estudiante;
            DROP FUNCTION IF EXISTS obtener_promedios_curso_unidad;
            DROP FUNCTION IF EXISTS recalcular_promedios_curso_unidad;
        ");
    }
};
