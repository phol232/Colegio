-- =====================================================
-- FUNCIONES DE ASISTENCIA
-- Sistema de Gestión Académica
-- =====================================================

-- Función para registrar asistencia masiva
CREATE OR REPLACE FUNCTION registrar_asistencia_masiva(
    p_curso_id BIGINT,
    p_fecha DATE,
    p_registros JSONB
)
RETURNS JSON AS $$
DECLARE
    v_registro JSONB;
    v_asistencia_id BIGINT;
    v_count INTEGER := 0;
    v_result JSON;
BEGIN
    -- Validar que la fecha no sea futura
    IF p_fecha > CURRENT_DATE THEN
        RETURN json_build_object(
            'success', false,
            'message', 'La fecha no puede ser futura'
        );
    END IF;
    
    -- Validar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Curso no encontrado'
        );
    END IF;
    
    -- Procesar cada registro
    FOR v_registro IN SELECT * FROM jsonb_array_elements(p_registros)
    LOOP
        -- Insertar o actualizar asistencia
        INSERT INTO asistencias (estudiante_id, curso_id, fecha, estado, created_at, updated_at)
        VALUES (
            (v_registro->>'estudiante_id')::BIGINT,
            p_curso_id,
            p_fecha,
            v_registro->>'estado',
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT (estudiante_id, curso_id, fecha)
        DO UPDATE SET 
            estado = EXCLUDED.estado,
            updated_at = CURRENT_TIMESTAMP;
        
        v_count := v_count + 1;
    END LOOP;
    
    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'message', 'Asistencia registrada exitosamente',
        'data', json_build_object(
            'registros_procesados', v_count,
            'curso_id', p_curso_id,
            'fecha', p_fecha
        )
    ) INTO v_result;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error al registrar asistencia: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Función para obtener resumen de asistencia de un estudiante en un curso
CREATE OR REPLACE FUNCTION obtener_resumen_asistencia(
    p_estudiante_id BIGINT,
    p_curso_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_total_clases INTEGER;
    v_presentes INTEGER;
    v_ausentes INTEGER;
    v_tardanzas INTEGER;
    v_porcentaje DECIMAL(5,2);
    v_result JSON;
BEGIN
    -- Contar asistencias
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE estado = 'presente'),
        COUNT(*) FILTER (WHERE estado = 'ausente'),
        COUNT(*) FILTER (WHERE estado = 'tardanza')
    INTO v_total_clases, v_presentes, v_ausentes, v_tardanzas
    FROM asistencias
    WHERE estudiante_id = p_estudiante_id AND curso_id = p_curso_id;
    
    -- Calcular porcentaje
    IF v_total_clases > 0 THEN
        v_porcentaje := (v_presentes::DECIMAL / v_total_clases) * 100;
    ELSE
        v_porcentaje := 0;
    END IF;
    
    -- Retornar resultado
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'total_clases', v_total_clases,
            'presentes', v_presentes,
            'ausentes', v_ausentes,
            'tardanzas', v_tardanzas,
            'porcentaje', ROUND(v_porcentaje, 2)
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener asistencias de un curso en una fecha
CREATE OR REPLACE FUNCTION obtener_asistencias_curso(
    p_curso_id BIGINT,
    p_fecha DATE
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', a.id,
                'estudiante_id', a.estudiante_id,
                'estudiante_nombre', u.name,
                'estudiante_email', u.email,
                'estado', a.estado,
                'fecha', a.fecha,
                'created_at', a.created_at,
                'updated_at', a.updated_at
            ) ORDER BY u.name
        ), '[]'::json)
    ) INTO v_result
    FROM asistencias a
    JOIN usuarios u ON a.estudiante_id = u.id
    WHERE a.curso_id = p_curso_id AND a.fecha = p_fecha;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener asistencias de un estudiante con filtros
CREATE OR REPLACE FUNCTION obtener_asistencias_estudiante(
    p_estudiante_id BIGINT,
    p_curso_id BIGINT DEFAULT NULL,
    p_fecha_inicio DATE DEFAULT NULL,
    p_fecha_fin DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', a.id,
                'curso_id', a.curso_id,
                'curso_nombre', c.nombre,
                'curso_codigo', c.codigo,
                'estado', a.estado,
                'fecha', a.fecha,
                'created_at', a.created_at
            )
        ), '[]'::json)
    ) INTO v_result
    FROM asistencias a
    JOIN cursos c ON a.curso_id = c.id
    WHERE a.estudiante_id = p_estudiante_id
        AND (p_curso_id IS NULL OR a.curso_id = p_curso_id)
        AND (p_fecha_inicio IS NULL OR a.fecha >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR a.fecha <= p_fecha_fin)
    ORDER BY a.fecha DESC;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar una asistencia individual
CREATE OR REPLACE FUNCTION actualizar_asistencia(
    p_asistencia_id BIGINT,
    p_estado VARCHAR(20)
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Validar estado
    IF p_estado NOT IN ('presente', 'ausente', 'tardanza') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Estado inválido. Debe ser: presente, ausente o tardanza'
        );
    END IF;
    
    -- Actualizar asistencia
    UPDATE asistencias
    SET estado = p_estado, updated_at = CURRENT_TIMESTAMP
    WHERE id = p_asistencia_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Asistencia no encontrada'
        );
    END IF;
    
    -- Obtener datos actualizados
    SELECT json_build_object(
        'success', true,
        'message', 'Asistencia actualizada exitosamente',
        'data', json_build_object(
            'id', a.id,
            'estudiante_id', a.estudiante_id,
            'curso_id', a.curso_id,
            'fecha', a.fecha,
            'estado', a.estado,
            'updated_at', a.updated_at
        )
    ) INTO v_result
    FROM asistencias a
    WHERE a.id = p_asistencia_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Registrar asistencia masiva
-- SELECT registrar_asistencia_masiva(
--     1,
--     '2025-10-22',
--     '[
--         {"estudiante_id": 1, "estado": "presente"},
--         {"estudiante_id": 2, "estado": "ausente"},
--         {"estudiante_id": 3, "estado": "tardanza"}
--     ]'::jsonb
-- );

-- Obtener resumen de asistencia
-- SELECT obtener_resumen_asistencia(1, 1);

-- Obtener asistencias de un curso en una fecha
-- SELECT obtener_asistencias_curso(1, '2025-10-22');

-- Obtener asistencias de un estudiante
-- SELECT obtener_asistencias_estudiante(1, NULL, '2025-10-01', '2025-10-31');

-- Actualizar asistencia
-- SELECT actualizar_asistencia(1, 'presente');
