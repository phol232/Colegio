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
            -- Función para crear una evaluación
            CREATE OR REPLACE FUNCTION crear_evaluacion(
                p_curso_id BIGINT,
                p_unidad SMALLINT,
                p_nombre VARCHAR(100),
                p_tipo_evaluacion VARCHAR(50),
                p_peso DECIMAL(5,2) DEFAULT NULL
            )
            RETURNS JSON AS $$
            DECLARE
                v_evaluacion_id BIGINT;
                v_total_peso DECIMAL(5,2);
                v_result JSON;
            BEGIN
                -- Validar unidad
                IF p_unidad < 1 OR p_unidad > 4 THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'La unidad debe estar entre 1 y 4'
                    );
                END IF;
                
                -- Validar que el curso existe
                IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Curso no encontrado'
                    );
                END IF;
                
                -- Si se especifica peso, validar que la suma no exceda 100%
                IF p_peso IS NOT NULL THEN
                    IF p_peso <= 0 OR p_peso > 100 THEN
                        RETURN json_build_object(
                            'success', false,
                            'message', 'El peso debe estar entre 0 y 100'
                        );
                    END IF;
                    
                    SELECT COALESCE(SUM(peso), 0) INTO v_total_peso
                    FROM evaluaciones
                    WHERE curso_id = p_curso_id AND unidad = p_unidad AND peso IS NOT NULL;
                    
                    IF v_total_peso + p_peso > 100 THEN
                        RETURN json_build_object(
                            'success', false,
                            'message', 'La suma de pesos excede el 100%. Peso disponible: ' || (100 - v_total_peso)::TEXT
                        );
                    END IF;
                END IF;
                
                -- Insertar evaluación
                INSERT INTO evaluaciones (curso_id, unidad, nombre, tipo_evaluacion, peso, orden, created_at, updated_at)
                VALUES (
                    p_curso_id,
                    p_unidad,
                    p_nombre,
                    p_tipo_evaluacion,
                    p_peso,
                    (SELECT COALESCE(MAX(orden), 0) + 1 FROM evaluaciones WHERE curso_id = p_curso_id AND unidad = p_unidad),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                RETURNING id INTO v_evaluacion_id;
                
                -- Retornar resultado
                SELECT json_build_object(
                    'success', true,
                    'message', 'Evaluación creada exitosamente',
                    'data', json_build_object(
                        'id', e.id,
                        'curso_id', e.curso_id,
                        'unidad', e.unidad,
                        'nombre', e.nombre,
                        'tipo_evaluacion', e.tipo_evaluacion,
                        'peso', e.peso,
                        'orden', e.orden,
                        'created_at', e.created_at
                    )
                ) INTO v_result
                FROM evaluaciones e
                WHERE e.id = v_evaluacion_id;
                
                RETURN v_result;
            EXCEPTION
                WHEN unique_violation THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Ya existe una evaluación con ese nombre en esta unidad'
                    );
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al crear evaluación: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para actualizar una evaluación
            CREATE OR REPLACE FUNCTION actualizar_evaluacion(
                p_evaluacion_id BIGINT,
                p_nombre VARCHAR(100) DEFAULT NULL,
                p_tipo_evaluacion VARCHAR(50) DEFAULT NULL,
                p_peso DECIMAL(5,2) DEFAULT NULL
            )
            RETURNS JSON AS $$
            DECLARE
                v_curso_id BIGINT;
                v_unidad SMALLINT;
                v_peso_actual DECIMAL(5,2);
                v_total_peso DECIMAL(5,2);
                v_result JSON;
            BEGIN
                -- Obtener datos actuales de la evaluación
                SELECT curso_id, unidad, peso INTO v_curso_id, v_unidad, v_peso_actual
                FROM evaluaciones
                WHERE id = p_evaluacion_id;
                
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Evaluación no encontrada'
                    );
                END IF;
                
                -- Si se actualiza el peso, validar suma
                IF p_peso IS NOT NULL AND p_peso != v_peso_actual THEN
                    IF p_peso <= 0 OR p_peso > 100 THEN
                        RETURN json_build_object(
                            'success', false,
                            'message', 'El peso debe estar entre 0 y 100'
                        );
                    END IF;
                    
                    SELECT COALESCE(SUM(peso), 0) INTO v_total_peso
                    FROM evaluaciones
                    WHERE curso_id = v_curso_id 
                        AND unidad = v_unidad 
                        AND id != p_evaluacion_id
                        AND peso IS NOT NULL;
                    
                    IF v_total_peso + p_peso > 100 THEN
                        RETURN json_build_object(
                            'success', false,
                            'message', 'La suma de pesos excede el 100%'
                        );
                    END IF;
                END IF;
                
                -- Actualizar evaluación
                UPDATE evaluaciones
                SET 
                    nombre = COALESCE(p_nombre, nombre),
                    tipo_evaluacion = COALESCE(p_tipo_evaluacion, tipo_evaluacion),
                    peso = COALESCE(p_peso, peso),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = p_evaluacion_id;
                
                -- Retornar resultado
                SELECT json_build_object(
                    'success', true,
                    'message', 'Evaluación actualizada exitosamente',
                    'data', row_to_json(e.*)
                ) INTO v_result
                FROM evaluaciones e
                WHERE e.id = p_evaluacion_id;
                
                RETURN v_result;
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al actualizar evaluación: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para eliminar una evaluación
            CREATE OR REPLACE FUNCTION eliminar_evaluacion(
                p_evaluacion_id BIGINT,
                p_forzar BOOLEAN DEFAULT FALSE
            )
            RETURNS JSON AS $$
            DECLARE
                v_total_notas INTEGER;
            BEGIN
                -- Verificar si tiene notas registradas
                SELECT COUNT(*) INTO v_total_notas
                FROM notas_detalle
                WHERE evaluacion_id = p_evaluacion_id;
                
                IF v_total_notas > 0 AND NOT p_forzar THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'La evaluación tiene ' || v_total_notas || ' notas registradas. Use forzar=true para eliminar',
                        'requires_confirmation', true,
                        'total_notas', v_total_notas
                    );
                END IF;
                
                -- Eliminar evaluación (cascade eliminará las notas)
                DELETE FROM evaluaciones WHERE id = p_evaluacion_id;
                
                IF NOT FOUND THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Evaluación no encontrada'
                    );
                END IF;
                
                RETURN json_build_object(
                    'success', true,
                    'message', 'Evaluación eliminada exitosamente'
                );
            EXCEPTION
                WHEN OTHERS THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'Error al eliminar evaluación: ' || SQLERRM
                    );
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para obtener evaluaciones de un curso y unidad
            CREATE OR REPLACE FUNCTION obtener_evaluaciones_curso_unidad(
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
                            'id', e.id,
                            'curso_id', e.curso_id,
                            'unidad', e.unidad,
                            'nombre', e.nombre,
                            'tipo_evaluacion', e.tipo_evaluacion,
                            'peso', e.peso,
                            'orden', e.orden,
                            'total_notas', (SELECT COUNT(*) FROM notas_detalle WHERE evaluacion_id = e.id),
                            'created_at', e.created_at,
                            'updated_at', e.updated_at
                        ) ORDER BY e.orden
                    ), '[]'::json)
                ) INTO v_result
                FROM evaluaciones e
                WHERE e.curso_id = p_curso_id AND e.unidad = p_unidad;
                
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
            DROP FUNCTION IF EXISTS crear_evaluacion;
            DROP FUNCTION IF EXISTS actualizar_evaluacion;
            DROP FUNCTION IF EXISTS eliminar_evaluacion;
            DROP FUNCTION IF EXISTS obtener_evaluaciones_curso_unidad;
        ");
    }
};
