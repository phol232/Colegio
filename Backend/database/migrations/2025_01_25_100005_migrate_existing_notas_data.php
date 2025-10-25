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
            -- Script para migrar datos de la tabla 'notas' antigua al nuevo sistema
            DO $$
            DECLARE
                v_nota RECORD;
                v_evaluacion_id BIGINT;
                v_evaluacion_nombre VARCHAR(100);
            BEGIN
                -- Iterar sobre cada nota existente
                FOR v_nota IN 
                    SELECT DISTINCT curso_id, unidad 
                    FROM notas 
                    ORDER BY curso_id, unidad
                LOOP
                    -- Crear nombre de evaluación
                    v_evaluacion_nombre := 'Nota Unidad ' || v_nota.unidad;
                    
                    -- Verificar si ya existe la evaluación
                    SELECT id INTO v_evaluacion_id
                    FROM evaluaciones
                    WHERE curso_id = v_nota.curso_id 
                        AND unidad = v_nota.unidad 
                        AND nombre = v_evaluacion_nombre;
                    
                    -- Si no existe, crear la evaluación
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
                            v_nota.curso_id,
                            v_nota.unidad,
                            v_evaluacion_nombre,
                            'Evaluación Única',
                            NULL,  -- Sin peso, será promedio simple
                            1,
                            CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP
                        )
                        RETURNING id INTO v_evaluacion_id;
                        
                        RAISE NOTICE 'Creada evaluación % para curso % unidad %', 
                            v_evaluacion_id, v_nota.curso_id, v_nota.unidad;
                    END IF;
                    
                    -- Migrar las notas a notas_detalle
                    INSERT INTO notas_detalle (
                        evaluacion_id,
                        estudiante_id,
                        puntaje,
                        created_at,
                        updated_at
                    )
                    SELECT 
                        v_evaluacion_id,
                        n.estudiante_id,
                        n.puntaje,
                        n.created_at,
                        n.updated_at
                    FROM notas n
                    WHERE n.curso_id = v_nota.curso_id 
                        AND n.unidad = v_nota.unidad
                    ON CONFLICT (evaluacion_id, estudiante_id) DO NOTHING;
                    
                    RAISE NOTICE 'Migradas notas para curso % unidad %', 
                        v_nota.curso_id, v_nota.unidad;
                END LOOP;
                
                -- Los triggers se encargarán de calcular los promedios automáticamente
                
                RAISE NOTICE 'Migración completada exitosamente';
            END $$;
            
            -- Verificar integridad de datos migrados
            DO $$
            DECLARE
                v_notas_antiguas INTEGER;
                v_notas_nuevas INTEGER;
                v_evaluaciones_creadas INTEGER;
            BEGIN
                SELECT COUNT(*) INTO v_notas_antiguas FROM notas;
                SELECT COUNT(*) INTO v_notas_nuevas FROM notas_detalle;
                SELECT COUNT(*) INTO v_evaluaciones_creadas FROM evaluaciones;
                
                RAISE NOTICE '=== RESUMEN DE MIGRACIÓN ===';
                RAISE NOTICE 'Notas en tabla antigua: %', v_notas_antiguas;
                RAISE NOTICE 'Notas migradas: %', v_notas_nuevas;
                RAISE NOTICE 'Evaluaciones creadas: %', v_evaluaciones_creadas;
                
                IF v_notas_antiguas != v_notas_nuevas THEN
                    RAISE WARNING 'ADVERTENCIA: El número de notas no coincide!';
                ELSE
                    RAISE NOTICE 'Verificación exitosa: Todas las notas fueron migradas';
                END IF;
            END $$;
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No se puede revertir automáticamente la migración de datos
        // Se requiere intervención manual si es necesario
        DB::statement("
            -- Para revertir, se deberían eliminar las evaluaciones y notas migradas
            -- ADVERTENCIA: Esto eliminará datos. Usar con precaución.
            -- DELETE FROM notas_detalle WHERE evaluacion_id IN (
            --     SELECT id FROM evaluaciones WHERE nombre LIKE 'Nota Unidad %'
            -- );
            -- DELETE FROM evaluaciones WHERE nombre LIKE 'Nota Unidad %';
        ");
    }
};
