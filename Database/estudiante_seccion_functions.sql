-- ============================================
-- FUNCIONES DE ASIGNACIÓN DE ESTUDIANTES A SECCIONES
-- ============================================

-- Función: listar_estudiantes_seccion
-- Lista los estudiantes asignados a una sección específica
CREATE OR REPLACE FUNCTION listar_estudiantes_seccion(p_seccion_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'dni', u.dni
            ) ORDER BY u.name
        ), '[]'::json)
    ) INTO v_result
    FROM usuarios u
    WHERE u.id IN (
        SELECT DISTINCT ec.estudiante_id
        FROM estudiantes_cursos ec
        JOIN cursos c ON ec.curso_id = c.id
        WHERE c.seccion_id = p_seccion_id
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: asignar_estudiantes_seccion
-- Asigna múltiples estudiantes a todos los cursos de una sección
CREATE OR REPLACE FUNCTION asignar_estudiantes_seccion(
    p_seccion_id BIGINT,
    p_estudiantes_ids BIGINT[]
)
RETURNS JSON AS $$
DECLARE
    v_grado_id BIGINT;
    v_estudiante_id BIGINT;
    v_curso RECORD;
    v_asignaciones INTEGER := 0;
    v_eliminaciones INTEGER := 0;
BEGIN
    -- Verificar que la sección existe y obtener el grado
    SELECT grado_id INTO v_grado_id
    FROM secciones
    WHERE id = p_seccion_id;
    
    IF v_grado_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'La sección no existe');
    END IF;
    
    -- ELIMINAR estudiantes que ya no están en la lista
    DELETE FROM estudiantes_cursos
    WHERE curso_id IN (
        SELECT id FROM cursos WHERE seccion_id = p_seccion_id
    )
    AND estudiante_id NOT IN (SELECT unnest(p_estudiantes_ids));
    
    GET DIAGNOSTICS v_eliminaciones = ROW_COUNT;
    
    -- ASIGNAR cada estudiante a TODOS los cursos de la sección
    FOREACH v_estudiante_id IN ARRAY p_estudiantes_ids
    LOOP
        -- Verificar que el usuario es estudiante
        IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = v_estudiante_id AND role = 'estudiante') THEN
            CONTINUE;
        END IF;
        
        -- Asignar a cada curso de la sección
        FOR v_curso IN 
            SELECT id FROM cursos WHERE seccion_id = p_seccion_id
        LOOP
            -- Insertar si no existe
            INSERT INTO estudiantes_cursos (
                estudiante_id,
                curso_id,
                fecha_matricula,
                anio_academico,
                created_at
            )
            VALUES (
                v_estudiante_id,
                v_curso.id,
                CURRENT_DATE,
                EXTRACT(YEAR FROM CURRENT_DATE),
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (estudiante_id, curso_id) DO NOTHING;
            
            IF FOUND THEN
                v_asignaciones := v_asignaciones + 1;
            END IF;
        END LOOP;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Estudiantes sincronizados: %s asignaciones nuevas, %s eliminadas', v_asignaciones, v_eliminaciones),
        'asignaciones', v_asignaciones,
        'eliminaciones', v_eliminaciones
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: listar_estudiantes_disponibles
-- Lista estudiantes que NO están asignados a ninguna sección
CREATE OR REPLACE FUNCTION listar_estudiantes_disponibles()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'dni', u.dni
            ) ORDER BY u.name
        ), '[]'::json)
    ) INTO v_result
    FROM usuarios u
    WHERE u.role = 'estudiante'
    AND u.id NOT IN (
        SELECT DISTINCT estudiante_id FROM estudiantes_cursos
    );
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: listar_todos_estudiantes
-- Lista todos los estudiantes del sistema
CREATE OR REPLACE FUNCTION listar_todos_estudiantes()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', u.id,
                'name', u.name,
                'email', u.email,
                'dni', u.dni,
                'asignado', EXISTS(
                    SELECT 1 FROM estudiantes_cursos ec WHERE ec.estudiante_id = u.id
                )
            ) ORDER BY u.name
        ), '[]'::json)
    ) INTO v_result
    FROM usuarios u
    WHERE u.role = 'estudiante';
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Listar estudiantes de una sección
-- SELECT listar_estudiantes_seccion(1);

-- Asignar estudiantes a una sección
-- SELECT asignar_estudiantes_seccion(1, ARRAY[1,2,3,4,5]);

-- Listar estudiantes disponibles (sin asignar)
-- SELECT listar_estudiantes_disponibles();

-- Listar todos los estudiantes
-- SELECT listar_todos_estudiantes();
