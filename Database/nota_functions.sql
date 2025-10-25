-- =====================================================
-- FUNCIONES DE NOTAS
-- Sistema de Gestión Académica
-- =====================================================

-- Función para registrar una nota
CREATE OR REPLACE FUNCTION registrar_nota(
    p_estudiante_id BIGINT,
    p_curso_id BIGINT,
    p_unidad SMALLINT,
    p_puntaje DECIMAL(4,2)
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_nota_id BIGINT;
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
    
    -- Validar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Curso no encontrado'
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
    INSERT INTO notas (estudiante_id, curso_id, unidad, puntaje, created_at, updated_at)
    VALUES (
        p_estudiante_id,
        p_curso_id,
        p_unidad,
        p_puntaje,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (estudiante_id, curso_id, unidad)
    DO UPDATE SET 
        puntaje = EXCLUDED.puntaje,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_nota_id;
    
    -- Obtener datos de la nota registrada
    SELECT json_build_object(
        'success', true,
        'message', 'Nota registrada exitosamente',
        'data', json_build_object(
            'id', n.id,
            'estudiante_id', n.estudiante_id,
            'estudiante_nombre', u.name,
            'curso_id', n.curso_id,
            'curso_nombre', cc.nombre,
            'unidad', n.unidad,
            'puntaje', n.puntaje,
            'created_at', n.created_at,
            'updated_at', n.updated_at
        )
    ) INTO v_result
    FROM notas n
    JOIN usuarios u ON n.estudiante_id = u.id
    JOIN cursos c ON n.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    WHERE n.id = v_nota_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error al registrar nota: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar una nota
CREATE OR REPLACE FUNCTION actualizar_nota(
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
    UPDATE notas
    SET puntaje = p_puntaje, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_nota_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Nota no encontrada'
        );
    END IF;
    
    -- Obtener datos actualizados
    SELECT json_build_object(
        'success', true,
        'message', 'Nota actualizada exitosamente',
        'data', json_build_object(
            'id', n.id,
            'estudiante_id', n.estudiante_id,
            'curso_id', n.curso_id,
            'unidad', n.unidad,
            'puntaje', n.puntaje,
            'updated_at', n.updated_at
        )
    ) INTO v_result
    FROM notas n
    WHERE n.id = p_nota_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener notas de un estudiante con filtros
CREATE OR REPLACE FUNCTION obtener_notas_estudiante(
    p_estudiante_id BIGINT,
    p_curso_id BIGINT DEFAULT NULL,
    p_unidad SMALLINT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', n.id,
                'curso_id', n.curso_id,
                'curso_nombre', cc.nombre,
                'curso_codigo', cc.codigo,
                'unidad', n.unidad,
                'puntaje', n.puntaje,
                'created_at', n.created_at
            )
        ), '[]'::json)
    ) INTO v_result
    FROM notas n
    JOIN cursos c ON n.curso_id = c.id
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    WHERE n.estudiante_id = p_estudiante_id
        AND (p_curso_id IS NULL OR n.curso_id = p_curso_id)
        AND (p_unidad IS NULL OR n.unidad = p_unidad)
    ORDER BY n.created_at DESC;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener notas de un curso por unidad
CREATE OR REPLACE FUNCTION obtener_notas_curso(
    p_curso_id BIGINT,
    p_unidad SMALLINT
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(nota_data), '[]'::json)
    ) INTO v_result
    FROM (
        SELECT json_build_object(
            'id', n.id,
            'estudiante_id', n.estudiante_id,
            'estudiante_nombre', u.name,
            'estudiante_email', u.email,
            'puntaje', n.puntaje,
            'created_at', n.created_at,
            'updated_at', n.updated_at
        ) as nota_data
        FROM notas n
        JOIN usuarios u ON n.estudiante_id = u.id
        WHERE n.curso_id = p_curso_id AND n.unidad = p_unidad
        ORDER BY u.name
    ) subquery;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de notas de un estudiante en un curso
CREATE OR REPLACE FUNCTION obtener_resumen_notas(
    p_estudiante_id BIGINT,
    p_curso_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_promedio DECIMAL(4,2);
    v_unidad_1 DECIMAL(4,2);
    v_unidad_2 DECIMAL(4,2);
    v_unidad_3 DECIMAL(4,2);
    v_unidad_4 DECIMAL(4,2);
    v_total_notas INTEGER;
    v_result JSON;
BEGIN
    -- Obtener notas por unidad
    SELECT 
        MAX(CASE WHEN unidad = 1 THEN puntaje END),
        MAX(CASE WHEN unidad = 2 THEN puntaje END),
        MAX(CASE WHEN unidad = 3 THEN puntaje END),
        MAX(CASE WHEN unidad = 4 THEN puntaje END),
        COUNT(*)
    INTO v_unidad_1, v_unidad_2, v_unidad_3, v_unidad_4, v_total_notas
    FROM notas
    WHERE estudiante_id = p_estudiante_id AND curso_id = p_curso_id;
    
    -- Calcular promedio
    SELECT AVG(puntaje)
    INTO v_promedio
    FROM notas
    WHERE estudiante_id = p_estudiante_id AND curso_id = p_curso_id;
    
    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'promedio_general', COALESCE(ROUND(v_promedio, 2), 0),
            'unidad_1', v_unidad_1,
            'unidad_2', v_unidad_2,
            'unidad_3', v_unidad_3,
            'unidad_4', v_unidad_4,
            'total_notas', v_total_notas
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Registrar una nota
-- SELECT registrar_nota(1, 1, 1, 18.5);

-- Actualizar una nota
-- SELECT actualizar_nota(1, 19.0);

-- Obtener notas de un estudiante
-- SELECT obtener_notas_estudiante(1, NULL, NULL);

-- Obtener notas de un curso por unidad
-- SELECT obtener_notas_curso(1, 1);

-- Obtener resumen de notas
-- SELECT obtener_resumen_notas(1, 1);
