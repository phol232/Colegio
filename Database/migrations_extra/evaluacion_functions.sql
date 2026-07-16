-- ============================================
-- FUNCIONES DE EVALUACIONES / NOTAS DETALLE / PROMEDIOS
-- Extraído de migraciones 2025_01_25_100001 … 100006
-- ============================================

-- ========== 100001: evaluacion functions ==========

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
    IF p_unidad < 1 OR p_unidad > 4 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'La unidad debe estar entre 1 y 4'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Curso no encontrado'
        );
    END IF;

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
    SELECT curso_id, unidad, peso INTO v_curso_id, v_unidad, v_peso_actual
    FROM evaluaciones
    WHERE id = p_evaluacion_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Evaluación no encontrada'
        );
    END IF;

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

    UPDATE evaluaciones
    SET
        nombre = COALESCE(p_nombre, nombre),
        tipo_evaluacion = COALESCE(p_tipo_evaluacion, tipo_evaluacion),
        peso = COALESCE(p_peso, peso),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_evaluacion_id;

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

CREATE OR REPLACE FUNCTION eliminar_evaluacion(
    p_evaluacion_id BIGINT,
    p_forzar BOOLEAN DEFAULT FALSE
)
RETURNS JSON AS $$
DECLARE
    v_total_notas INTEGER;
BEGIN
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

-- ========== 100002: notas_detalle functions ==========

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
    IF p_puntaje < 0 OR p_puntaje > 20 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'El puntaje debe estar entre 0 y 20'
        );
    END IF;

    SELECT curso_id, unidad INTO v_curso_id, v_unidad
    FROM evaluaciones
    WHERE id = p_evaluacion_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Evaluación no encontrada'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_estudiante_id AND role = 'estudiante') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Estudiante no encontrado'
        );
    END IF;

    INSERT INTO notas_detalle (evaluacion_id, estudiante_id, puntaje, created_at, updated_at)
    VALUES (p_evaluacion_id, p_estudiante_id, p_puntaje, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (evaluacion_id, estudiante_id)
    DO UPDATE SET
        puntaje = EXCLUDED.puntaje,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_nota_id;

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

CREATE OR REPLACE FUNCTION actualizar_nota_evaluacion(
    p_nota_id BIGINT,
    p_puntaje DECIMAL(4,2)
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    IF p_puntaje < 0 OR p_puntaje > 20 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'El puntaje debe estar entre 0 y 20'
        );
    END IF;

    UPDATE notas_detalle
    SET puntaje = p_puntaje, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_nota_id;

    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Nota no encontrada'
        );
    END IF;

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

-- ========== 100003: promedio functions ==========

CREATE OR REPLACE FUNCTION convertir_a_literal(
    p_promedio_numerico DECIMAL(4,2)
)
RETURNS VARCHAR(2) AS $$
BEGIN
    IF p_promedio_numerico >= 17 THEN
        RETURN 'AD';
    ELSIF p_promedio_numerico >= 14 THEN
        RETURN 'A';
    ELSIF p_promedio_numerico >= 11 THEN
        RETURN 'B';
    ELSE
        RETURN 'C';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
    SELECT
        COUNT(*) FILTER (WHERE peso IS NOT NULL) > 0,
        SUM(peso)
    INTO v_tiene_pesos, v_suma_pesos
    FROM evaluaciones
    WHERE curso_id = p_curso_id AND unidad = p_unidad;

    IF v_tiene_pesos AND v_suma_pesos = 100 THEN
        v_promedio := calcular_promedio_ponderado(p_estudiante_id, p_curso_id, p_unidad);
    ELSE
        v_promedio := calcular_promedio_simple(p_estudiante_id, p_curso_id, p_unidad);
    END IF;

    RETURN v_promedio;
END;
$$ LANGUAGE plpgsql;

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
    v_promedio := calcular_promedio_unidad(p_estudiante_id, p_curso_id, p_unidad);
    v_literal := convertir_a_literal(v_promedio);

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
    FOR v_estudiante IN
        SELECT DISTINCT nd.estudiante_id
        FROM notas_detalle nd
        JOIN evaluaciones e ON nd.evaluacion_id = e.id
        WHERE e.curso_id = p_curso_id AND e.unidad = p_unidad
    LOOP
        v_promedio := calcular_promedio_unidad(v_estudiante.estudiante_id, p_curso_id, p_unidad);
        v_literal := convertir_a_literal(v_promedio);

        SELECT COUNT(*) INTO v_total_evaluaciones
        FROM notas_detalle nd
        JOIN evaluaciones e ON nd.evaluacion_id = e.id
        WHERE nd.estudiante_id = v_estudiante.estudiante_id
            AND e.curso_id = p_curso_id
            AND e.unidad = p_unidad;

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

-- ========== 100004: promedio triggers ==========

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
    IF TG_OP = 'DELETE' THEN
        v_estudiante_id := OLD.estudiante_id;
        SELECT curso_id, unidad INTO v_curso_id, v_unidad
        FROM evaluaciones WHERE id = OLD.evaluacion_id;
    ELSE
        v_estudiante_id := NEW.estudiante_id;
        SELECT curso_id, unidad INTO v_curso_id, v_unidad
        FROM evaluaciones WHERE id = NEW.evaluacion_id;
    END IF;

    v_promedio := calcular_promedio_unidad(v_estudiante_id, v_curso_id, v_unidad);
    v_literal := convertir_a_literal(v_promedio);

    SELECT COUNT(*) INTO v_total_evaluaciones
    FROM notas_detalle nd
    JOIN evaluaciones e ON nd.evaluacion_id = e.id
    WHERE nd.estudiante_id = v_estudiante_id
        AND e.curso_id = v_curso_id
        AND e.unidad = v_unidad;

    IF v_total_evaluaciones = 0 THEN
        DELETE FROM promedios_unidad
        WHERE estudiante_id = v_estudiante_id
            AND curso_id = v_curso_id
            AND unidad = v_unidad;
    ELSE
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

DROP TRIGGER IF EXISTS trigger_actualizar_promedio_insert ON notas_detalle;
CREATE TRIGGER trigger_actualizar_promedio_insert
AFTER INSERT ON notas_detalle
FOR EACH ROW
EXECUTE FUNCTION actualizar_promedio_automatico();

DROP TRIGGER IF EXISTS trigger_actualizar_promedio_update ON notas_detalle;
CREATE TRIGGER trigger_actualizar_promedio_update
AFTER UPDATE ON notas_detalle
FOR EACH ROW
EXECUTE FUNCTION actualizar_promedio_automatico();

DROP TRIGGER IF EXISTS trigger_actualizar_promedio_delete ON notas_detalle;
CREATE TRIGGER trigger_actualizar_promedio_delete
AFTER DELETE ON notas_detalle
FOR EACH ROW
EXECUTE FUNCTION actualizar_promedio_automatico();

-- ========== 100006: compatibility legacy ==========

CREATE OR REPLACE VIEW notas_legacy_view AS
SELECT
    pu.id,
    pu.estudiante_id,
    pu.curso_id,
    pu.unidad,
    pu.promedio_numerico AS puntaje,
    pu.created_at,
    pu.updated_at
FROM promedios_unidad pu
ORDER BY pu.estudiante_id, pu.curso_id, pu.unidad;

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
    IF p_puntaje < 0 OR p_puntaje > 20 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'El puntaje debe estar entre 0 y 20'
        );
    END IF;

    IF p_unidad < 1 OR p_unidad > 4 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'La unidad debe estar entre 1 y 4'
        );
    END IF;

    v_evaluacion_nombre := 'Nota Unidad ' || p_unidad;

    SELECT id INTO v_evaluacion_id
    FROM evaluaciones
    WHERE curso_id = p_curso_id
        AND unidad = p_unidad
        AND nombre = v_evaluacion_nombre;

    IF v_evaluacion_id IS NULL THEN
        INSERT INTO evaluaciones (
            curso_id, unidad, mes, nombre, tipo_evaluacion, peso, orden, created_at, updated_at
        )
        VALUES (
            p_curso_id,
            p_unidad,
            CASE p_unidad WHEN 1 THEN 3 WHEN 2 THEN 6 WHEN 3 THEN 9 WHEN 4 THEN 12 ELSE 3 END,
            v_evaluacion_nombre,
            'Evaluación Única',
            NULL,
            1,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO v_evaluacion_id;
    END IF;

    v_result := registrar_nota_evaluacion(v_evaluacion_id, p_estudiante_id, p_puntaje);
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

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

    v_result := actualizar_nota_evaluacion(v_nota_detalle_id, p_puntaje);
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;
