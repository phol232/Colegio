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
            -- Función que se ejecuta en el trigger para actualizar promedios automáticamente
            CREATE OR REPLACE FUNCTION actualizar_promedio_automatico()
            RETURNS TRIGGER AS $$
            DECLARE
                v_estudiante_id BIGINT;
                v_curso_id BIGINT;
                v_unidad SMALLINT;
                v_promedio DECIMAL(4,2);
                v_literal VARCHAR(2);
                v_total_evaluaciones SMALLINT;
            BEGIN
                -- Obtener datos de la evaluación
                IF TG_OP = 'DELETE' THEN
                    v_estudiante_id := OLD.estudiante_id;
                    SELECT curso_id, unidad INTO v_curso_id, v_unidad
                    FROM evaluaciones WHERE id = OLD.evaluacion_id;
                ELSE
                    v_estudiante_id := NEW.estudiante_id;
                    SELECT curso_id, unidad INTO v_curso_id, v_unidad
                    FROM evaluaciones WHERE id = NEW.evaluacion_id;
                END IF;
                
                -- Calcular promedio
                v_promedio := calcular_promedio_unidad(v_estudiante_id, v_curso_id, v_unidad);
                
                -- Convertir a literal
                v_literal := convertir_a_literal(v_promedio);
                
                -- Contar evaluaciones con nota
                SELECT COUNT(*) INTO v_total_evaluaciones
                FROM notas_detalle nd
                JOIN evaluaciones e ON nd.evaluacion_id = e.id
                WHERE nd.estudiante_id = v_estudiante_id
                    AND e.curso_id = v_curso_id
                    AND e.unidad = v_unidad;
                
                -- Si no hay evaluaciones, eliminar el promedio
                IF v_total_evaluaciones = 0 THEN
                    DELETE FROM promedios_unidad
                    WHERE estudiante_id = v_estudiante_id
                        AND curso_id = v_curso_id
                        AND unidad = v_unidad;
                ELSE
                    -- Actualizar o insertar promedio
                    INSERT INTO promedios_unidad (estudiante_id, curso_id, unidad, promedio_numerico, promedio_literal, total_evaluaciones, created_at, updated_at)
                    VALUES (v_estudiante_id, v_curso_id, v_unidad, v_promedio, v_literal, v_total_evaluaciones, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT (estudiante_id, curso_id, unidad)
                    DO UPDATE SET
                        promedio_numerico = EXCLUDED.promedio_numerico,
                        promedio_literal = EXCLUDED.promedio_literal,
                        total_evaluaciones = EXCLUDED.total_evaluaciones,
                        updated_at = CURRENT_TIMESTAMP;
                END IF;
                
                IF TG_OP = 'DELETE' THEN
                    RETURN OLD;
                ELSE
                    RETURN NEW;
                END IF;
            END;
            $$ LANGUAGE plpgsql;
            
            -- Trigger para INSERT de notas
            CREATE TRIGGER trigger_actualizar_promedio_insert
            AFTER INSERT ON notas_detalle
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_promedio_automatico();
            
            -- Trigger para UPDATE de notas
            CREATE TRIGGER trigger_actualizar_promedio_update
            AFTER UPDATE ON notas_detalle
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_promedio_automatico();
            
            -- Trigger para DELETE de notas
            CREATE TRIGGER trigger_actualizar_promedio_delete
            AFTER DELETE ON notas_detalle
            FOR EACH ROW
            EXECUTE FUNCTION actualizar_promedio_automatico();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("
            DROP TRIGGER IF EXISTS trigger_actualizar_promedio_insert ON notas_detalle;
            DROP TRIGGER IF EXISTS trigger_actualizar_promedio_update ON notas_detalle;
            DROP TRIGGER IF EXISTS trigger_actualizar_promedio_delete ON notas_detalle;
            DROP FUNCTION IF EXISTS actualizar_promedio_automatico;
        ");
    }
};
