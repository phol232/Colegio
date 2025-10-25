<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Crea una vista que simula la tabla 'notas' antigua
     * para mantener compatibilidad con código legacy
     */
    public function up(): void
    {
        DB::unprepared("
            -- Vista de compatibilidad que simula la tabla 'notas' antigua
            CREATE OR REPLACE VIEW notas_legacy_view AS
            SELECT 
                pu.id,
                pu.estudiante_id,
                pu.curso_id,
                pu.unidad,
                pu.promedio_numerico as puntaje,
                pu.created_at,
                pu.updated_at
            FROM promedios_unidad pu
            ORDER BY pu.estudiante_id, pu.curso_id, pu.unidad;
            
            -- Función para registrar nota usando el sistema nuevo (compatibilidad)
            CREATE OR REPLACE FUNCTION registrar_nota_legacy(
                p_estudiante_id BIGINT,
                p_curso_id BIGINT,
                p_unidad SMALLINT,
                p_puntaje DECIMAL(4,2)
            )
            RETURNS JSON AS $$
            DECLARE
                v_evaluacion_id BIGINT;
                v_evaluacion_nombre VARCHAR(100);
                v_result JSON;
            BEGIN
                -- Validar puntaje
                IF p_puntaje < 0 OR p_puntaje > 20 THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'El puntaje debe estar entre 0 y 20'
                    );
                END IF;
                
                -- Validar unidad
                IF p_unidad < 1 OR p_unidad > 4 THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'La unidad debe estar entre 1 y 4'
                    );
                END IF;
                
                -- Buscar o crear evaluación 'Nota Unidad X' para este curso
                v_evaluacion_nombre := 'Nota Unidad ' || p_unidad;
                
                SELECT id INTO v_evaluacion_id
                FROM evaluaciones
                WHERE curso_id = p_curso_id 
                    AND unidad = p_unidad 
                    AND nombre = v_evaluacion_nombre;
                
                -- Si no existe la evaluación, crearla
                IF v_evaluacion_id IS NULL THEN
                    INSERT INTO evaluaciones (
                        curso_id, 
                        unidad, 
                        nombre, 
                        tipo_evaluacion, 
                        peso, 
                        orden,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        p_curso_id,
                        p_unidad,
                        v_evaluacion_nombre,
                        'Evaluación Única',
                        NULL,
                        1,
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    RETURNING id INTO v_evaluacion_id;
                END IF;
                
                -- Registrar la nota usando el sistema nuevo
                v_result := registrar_nota_evaluacion(v_evaluacion_id, p_estudiante_id, p_puntaje);
                
                RETURN v_result;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Función para actualizar nota usando el sistema nuevo (compatibilidad)
            CREATE OR REPLACE FUNCTION actualizar_nota_legacy(
                p_estudiante_id BIGINT,
                p_curso_id BIGINT,
                p_unidad SMALLINT,
                p_puntaje DECIMAL(4,2)
            )
            RETURNS JSON AS $$
            DECLARE
                v_evaluacion_id BIGINT;
                v_nota_detalle_id BIGINT;
                v_result JSON;
            BEGIN
                -- Buscar la evaluación 'Nota Unidad X'
                SELECT id INTO v_evaluacion_id
                FROM evaluaciones
                WHERE curso_id = p_curso_id 
                    AND unidad = p_unidad 
                    AND nombre = 'Nota Unidad ' || p_unidad;
                
                IF v_evaluacion_id IS NULL THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'No existe evaluación para esta unidad'
                    );
                END IF;
                
                -- Buscar la nota detalle
                SELECT id INTO v_nota_detalle_id
                FROM notas_detalle
                WHERE evaluacion_id = v_evaluacion_id 
                    AND estudiante_id = p_estudiante_id;
                
                IF v_nota_detalle_id IS NULL THEN
                    RETURN json_build_object(
                        'success', false,
                        'message', 'No existe nota para actualizar'
                    );
                END IF;
                
                -- Actualizar usando el sistema nuevo
                v_result := actualizar_nota_evaluacion(v_nota_detalle_id, p_puntaje);
                
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
            DROP VIEW IF EXISTS notas_legacy_view;
            DROP FUNCTION IF EXISTS registrar_nota_legacy;
            DROP FUNCTION IF EXISTS actualizar_nota_legacy;
        ");
    }
};
