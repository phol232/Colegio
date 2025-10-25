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
            -- Función para registrar una nota de evaluación
            CREATE OR REPLACE FUNCTION registrar_nota_evaluacion(
                p_evaluacion_id BIGINT,
                p_estudiante_id BIGINT,
                p_puntaje DECIMAL(4,2)
            )
            RETURNS JSON AS $$
            DECLARE
                v_nota_id BIGINT;
                v_curso_id BIGINT;
                v_unidad SMALLINT;
                v_result JSON;
            BEGIN
                -- Validar puntaje
                IF p_puntaje < 0 OR p_puntaje > 20 THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'El puntaje debe estar entre 0 y 20'
                    );
                END IF;
                
                -- Obtener curso_id y unidad de la evaluación
                SELECT curso_id, unidad INTO v_curso_id, v_unidad
                FROM evaluaciones
                WHERE id = p_evaluacion_id;
                
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Evaluación no encontrada'
                    );
                END IF;
                
                -- Validar que el estudiante existe
                IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_estudiante_id AND role = 'estudiante') THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Estudiante no encontrado'
                    );
                END IF;
                
                -- Insertar o actualizar nota
                INSERT INTO notas_detalle (evaluacion_id, estudiante_id, puntaje, created_at, updated_at)
                VALUES (p_evaluacion_id, p_estudiante_id, p_puntaje, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (evaluacion_id, estudiante_id)
                DO UPDATE SET 
                    puntaje = EXCLUDED.puntaje,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id INTO v_nota_id;
                
                -- El trigger se encargará de recalcular el promedio
                
                RETURN json_build_object(
                    'success', true,
                    'message', 'Nota registrada exitosamente',
                    'data', json_build_object(
                        'id', v_nota_id,
                        'evaluacion_id', p_evaluacion_id,
                        'estudiante_id', p_estudiante_id,
                        'puntaje', p_puntaje
                    )
                );
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al registrar nota: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para registrar múltiples notas en una sola operación
            CREATE OR REPLACE FUNCTION registrar_notas_bulk(
                p_notas JSON
            )
            RETURNS JSON AS $$
            DECLARE
                v_nota JSON;
                v_result JSON;
                v_success_count INTEGER := 0;
                v_error_count INTEGER := 0;
                v_errors JSON[] := ARRAY[]::JSON[];
            BEGIN
                -- Iterar sobre cada nota
                FOR v_nota IN SELECT * FROM json_array_elements(p_notas)
                LOOP
                    BEGIN
                        PERFORM registrar_nota_evaluacion(
                            (v_nota->>'evaluacion_id')::BIGINT,
                            (v_nota->>'estudiante_id')::BIGINT,
                            (v_nota->>'puntaje')::DECIMAL(4,2)
                        );
                        v_success_count := v_success_count + 1;
                    EXCEPTION
                        WHEN OTHERS THEN
                            v_error_count := v_error_count + 1;
                            v_errors := array_append(v_errors, json_build_object(
                                'evaluacion_id', v_nota->>'evaluacion_id',
                                'estudiante_id', v_nota->>'estudiante_id',
                                'error', SQLERRM
                            ));
                    END;
                END LOOP;
                
                RETURN json_build_object(
                    'success', v_error_count = 0,
                    'message', 'Procesadas ' || v_success_count || ' notas exitosamente, ' || v_error_count || ' errores',
                    'success_count', v_success_count,
                    'error_count', v_error_count,
                    'errors', array_to_json(v_errors)
                );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para actualizar una nota
            CREATE OR REPLACE FUNCTION actualizar_nota_evaluacion(
                p_nota_id BIGINT,
                p_puntaje DECIMAL(4,2)
            )
            RETURNS JSON AS $$
            DECLARE
                v_result JSON;
            BEGIN
                -- Validar puntaje
                IF p_puntaje < 0 OR p_puntaje > 20 THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'El puntaje debe estar entre 0 y 20'
                    );
                END IF;
                
                -- Actualizar nota
                UPDATE notas_detalle
                SET puntaje = p_puntaje, updated_at = CURRENT_TIMESTAMP
                WHERE id = p_nota_id;
                
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Nota no encontrada'
                    );
                END IF;
                
                -- El trigger se encargará de recalcular el promedio
                
                -- Obtener datos actualizados
                SELECT json_build_object(
                    'success', true,
                    'message', 'Nota actualizada exitosamente',
                    'data', json_build_object(
                        'id', nd.id,
                        'evaluacion_id', nd.evaluacion_id,
                        'estudiante_id', nd.estudiante_id,
                        'puntaje', nd.puntaje,
                        'updated_at', nd.updated_at
                    )
                ) INTO v_result
                FROM notas_detalle nd
                WHERE nd.id = p_nota_id;
                
                RETURN v_result;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para eliminar una nota
            CREATE OR REPLACE FUNCTION eliminar_nota_evaluacion(
                p_nota_id BIGINT
            )
            RETURNS JSON AS $$
            BEGIN
                DELETE FROM notas_detalle WHERE id = p_nota_id;
                
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Nota no encontrada'
                    );
                END IF;
                
                -- El trigger se encargará de recalcular el promedio
                
                RETURN json_build_object(
                    'success', true,
                    'message', 'Nota eliminada exitosamente'
                );
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al eliminar nota: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para obtener notas de una evaluación
            CREATE OR REPLACE FUNCTION obtener_notas_evaluacion(
                p_evaluacion_id BIGINT
            )
            RETURNS JSON AS $$
            DECLARE
                v_result JSON;
            BEGIN
                SELECT json_build_object(
                    'success', true,
                    'data', COALESCE(json_agg(
                        json_build_object(
                            'id', nd.id,
                            'evaluacion_id', nd.evaluacion_id,
                            'estudiante_id', nd.estudiante_id,
                            'estudiante_nombre', u.name,
                            'estudiante_email', u.email,
                            'puntaje', nd.puntaje,
                            'created_at', nd.created_at,
                            'updated_at', nd.updated_at
                        ) ORDER BY u.name
                    ), '[]'::json)
                ) INTO v_result
                FROM notas_detalle nd
                JOIN usuarios u ON nd.estudiante_id = u.id
                WHERE nd.evaluacion_id = p_evaluacion_id;
                
                RETURN v_result;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para obtener todas las notas de un estudiante en un curso/unidad
            CREATE OR REPLACE FUNCTION obtener_notas_estudiante_curso_unidad(
                p_estudiante_id BIGINT,
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
                            'id', nd.id,
                            'evaluacion_id', e.id,
                            'evaluacion_nombre', e.nombre,
                            'evaluacion_tipo', e.tipo_evaluacion,
                            'evaluacion_peso', e.peso,
                            'puntaje', nd.puntaje,
                            'created_at', nd.created_at
                        ) ORDER BY e.orden
                    ), '[]'::json)
                ) INTO v_result
                FROM notas_detalle nd
                JOIN evaluaciones e ON nd.evaluacion_id = e.id
                WHERE nd.estudiante_id = p_estudiante_id
                    AND e.curso_id = p_curso_id
                    AND e.unidad = p_unidad;
                
                RETURN v_result;
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
            DROP FUNCTION IF EXISTS registrar_nota_evaluacion;
            DROP FUNCTION IF EXISTS registrar_notas_bulk;
            DROP FUNCTION IF EXISTS actualizar_nota_evaluacion;
            DROP FUNCTION IF EXISTS eliminar_nota_evaluacion;
            DROP FUNCTION IF EXISTS obtener_notas_evaluacion;
            DROP FUNCTION IF EXISTS obtener_notas_estudiante_curso_unidad;
        ");
    }
};
