-- ============================================
-- FUNCIONES DE GESTIÓN DE CATÁLOGO DE CURSOS
-- ============================================

-- Función: listar_catalogo_cursos
-- Lista todos los cursos del catálogo filtrados por nivel
CREATE OR REPLACE FUNCTION listar_catalogo_cursos(p_nivel VARCHAR DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', id,
                'nombre', nombre,
                'codigo', codigo,
                'nivel', nivel,
                'descripcion', descripcion,
                'created_at', created_at,
                'updated_at', updated_at
            ) ORDER BY nombre
        ), '[]'::json)
    ) INTO v_result
    FROM cursos_catalogo
    WHERE p_nivel IS NULL OR nivel = p_nivel OR nivel = 'ambos';
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: asignar_cursos_seccion
-- Asigna múltiples cursos del catálogo a una sección con un docente
-- SINCRONIZA los cursos: elimina los que no están en la lista y agrega los nuevos
CREATE OR REPLACE FUNCTION asignar_cursos_seccion(
    p_seccion_id BIGINT,
    p_docente_id BIGINT,
    p_cursos_catalogo_ids BIGINT[]
)
RETURNS JSON AS $$
DECLARE
    v_grado RECORD;
    v_nivel VARCHAR;
    v_curso_catalogo_id BIGINT;
    v_cursos_creados INTEGER := 0;
    v_cursos_eliminados INTEGER := 0;
    v_result JSON;
BEGIN
    -- Obtener información del grado y sección
    SELECT g.id, g.nivel INTO v_grado
    FROM secciones s
    JOIN grados g ON s.grado_id = g.id
    WHERE s.id = p_seccion_id;
    
    IF v_grado IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'La sección no existe');
    END IF;
    
    v_nivel := v_grado.nivel;
    
    -- Verificar que el docente existe
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_docente_id AND role = 'docente') THEN
        RETURN json_build_object('success', false, 'message', 'El docente no existe');
    END IF;
    
    -- REGLA PRIMARIA: Verificar que no haya otro docente asignado a esta sección
    IF v_nivel = 'primaria' THEN
        IF EXISTS (
            SELECT 1 FROM cursos 
            WHERE seccion_id = p_seccion_id 
            AND docente_id != p_docente_id
        ) THEN
            RETURN json_build_object(
                'success', false,
                'message', 'En primaria, todos los cursos de una sección deben tener el mismo docente'
            );
        END IF;
    END IF;
    
    -- ELIMINAR cursos que ya no están en la lista seleccionada
    DELETE FROM cursos 
    WHERE seccion_id = p_seccion_id 
    AND curso_catalogo_id NOT IN (SELECT unnest(p_cursos_catalogo_ids));
    
    GET DIAGNOSTICS v_cursos_eliminados = ROW_COUNT;
    
    -- AGREGAR cursos nuevos que no existen
    FOREACH v_curso_catalogo_id IN ARRAY p_cursos_catalogo_ids
    LOOP
        -- Verificar que el curso no esté ya asignado
        IF NOT EXISTS (
            SELECT 1 FROM cursos 
            WHERE curso_catalogo_id = v_curso_catalogo_id 
            AND seccion_id = p_seccion_id
        ) THEN
            -- Insertar el curso
            INSERT INTO cursos (
                curso_catalogo_id,
                docente_id,
                grado_id,
                seccion_id,
                created_at,
                updated_at
            )
            VALUES (
                v_curso_catalogo_id,
                p_docente_id,
                v_grado.id,
                p_seccion_id,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            v_cursos_creados := v_cursos_creados + 1;
        ELSE
            -- Actualizar el docente si cambió
            UPDATE cursos 
            SET docente_id = p_docente_id, updated_at = CURRENT_TIMESTAMP
            WHERE curso_catalogo_id = v_curso_catalogo_id 
            AND seccion_id = p_seccion_id
            AND docente_id != p_docente_id;
        END IF;
    END LOOP;
    
    RETURN json_build_object(
        'success', true,
        'message', format('Cursos sincronizados: %s agregados, %s eliminados', v_cursos_creados, v_cursos_eliminados),
        'cursos_creados', v_cursos_creados,
        'cursos_eliminados', v_cursos_eliminados
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: listar_cursos_seccion
-- Lista los cursos asignados a una sección específica
CREATE OR REPLACE FUNCTION listar_cursos_seccion(p_seccion_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', c.id,
                'curso_catalogo_id', c.curso_catalogo_id,
                'nombre', cc.nombre,
                'codigo', cc.codigo,
                'docente_id', c.docente_id,
                'docente', json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'email', u.email
                ),
                'created_at', c.created_at,
                'updated_at', c.updated_at
            ) ORDER BY cc.nombre
        ), '[]'::json)
    ) INTO v_result
    FROM cursos c
    JOIN cursos_catalogo cc ON c.curso_catalogo_id = cc.id
    LEFT JOIN usuarios u ON c.docente_id = u.id
    WHERE c.seccion_id = p_seccion_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: desasignar_curso_seccion
-- Elimina la asignación de un curso de una sección
CREATE OR REPLACE FUNCTION desasignar_curso_seccion(p_curso_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_estudiantes BOOLEAN;
BEGIN
    -- Verificar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;
    
    -- Verificar si tiene estudiantes matriculados
    SELECT EXISTS (
        SELECT 1 FROM estudiantes_cursos WHERE curso_id = p_curso_id
    ) INTO v_tiene_estudiantes;
    
    IF v_tiene_estudiantes THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el curso porque tiene estudiantes matriculados'
        );
    END IF;
    
    -- Eliminar el curso
    DELETE FROM cursos WHERE id = p_curso_id;
    
    RETURN json_build_object('success', true, 'message', 'Curso desasignado exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: actualizar_docente_curso
-- Actualiza el docente de un curso específico
CREATE OR REPLACE FUNCTION actualizar_docente_curso(
    p_curso_id BIGINT,
    p_docente_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_curso RECORD;
    v_nivel VARCHAR;
    v_result JSON;
BEGIN
    -- Obtener información del curso
    SELECT c.*, g.nivel INTO v_curso
    FROM cursos c
    JOIN grados g ON c.grado_id = g.id
    WHERE c.id = p_curso_id;
    
    IF v_curso IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;
    
    v_nivel := v_curso.nivel;
    
    -- Verificar que el docente existe
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_docente_id AND role = 'docente') THEN
        RETURN json_build_object('success', false, 'message', 'El docente no existe');
    END IF;
    
    -- REGLA PRIMARIA: En primaria, cambiar el docente de un curso cambia el docente de todos los cursos de la sección
    IF v_nivel = 'primaria' THEN
        UPDATE cursos 
        SET docente_id = p_docente_id, updated_at = CURRENT_TIMESTAMP
        WHERE seccion_id = v_curso.seccion_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Docente actualizado para todos los cursos de la sección (primaria)'
        );
    ELSE
        -- SECUNDARIA: Solo actualizar el curso específico
        UPDATE cursos 
        SET docente_id = p_docente_id, updated_at = CURRENT_TIMESTAMP
        WHERE id = p_curso_id;
        
        RETURN json_build_object(
            'success', true,
            'message', 'Docente actualizado exitosamente'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Listar catálogo de cursos para primaria
-- SELECT listar_catalogo_cursos('primaria');

-- Listar catálogo de cursos para secundaria
-- SELECT listar_catalogo_cursos('secundaria');

-- Asignar cursos a una sección
-- SELECT asignar_cursos_seccion(1, 3, ARRAY[1,2,3,4,5]);

-- Listar cursos de una sección
-- SELECT listar_cursos_seccion(1);

-- Desasignar un curso
-- SELECT desasignar_curso_seccion(1);

-- Actualizar docente de un curso
-- SELECT actualizar_docente_curso(1, 4);


-- ============================================
-- FUNCIONES DE GESTIÓN DEL CATÁLOGO
-- ============================================

-- Función: crear_curso_catalogo
-- Crea un nuevo curso en el catálogo
CREATE OR REPLACE FUNCTION crear_curso_catalogo(
    p_nombre VARCHAR(100),
    p_codigo VARCHAR(20),
    p_nivel VARCHAR DEFAULT 'ambos',
    p_descripcion TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_curso_id BIGINT;
    v_result JSON;
BEGIN
    -- Validar nivel
    IF p_nivel NOT IN ('primaria', 'secundaria', 'ambos') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria, secundaria o ambos');
    END IF;
    
    -- Verificar que no exista el código
    IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE codigo = p_codigo) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese código');
    END IF;
    
    -- Verificar que no exista el nombre
    IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE nombre = p_nombre) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese nombre');
    END IF;
    
    -- Crear el curso
    INSERT INTO cursos_catalogo (nombre, codigo, nivel, descripcion, created_at, updated_at)
    VALUES (p_nombre, p_codigo, p_nivel, p_descripcion, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_curso_id;
    
    -- Obtener el curso creado
    SELECT json_build_object(
        'success', true,
        'message', 'Curso agregado al catálogo exitosamente',
        'data', json_build_object(
            'id', id,
            'nombre', nombre,
            'codigo', codigo,
            'nivel', nivel,
            'descripcion', descripcion,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM cursos_catalogo
    WHERE id = v_curso_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: actualizar_curso_catalogo
-- Actualiza un curso del catálogo
CREATE OR REPLACE FUNCTION actualizar_curso_catalogo(
    p_curso_id BIGINT,
    p_nombre VARCHAR(100) DEFAULT NULL,
    p_codigo VARCHAR(20) DEFAULT NULL,
    p_nivel VARCHAR DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_curso RECORD;
    v_result JSON;
BEGIN
    -- Verificar que el curso existe
    SELECT * INTO v_curso FROM cursos_catalogo WHERE id = p_curso_id;
    
    IF v_curso IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe en el catálogo');
    END IF;
    
    -- Validar nivel si se está actualizando
    IF p_nivel IS NOT NULL AND p_nivel NOT IN ('primaria', 'secundaria', 'ambos') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria, secundaria o ambos');
    END IF;
    
    -- Verificar unicidad del código si se está actualizando
    IF p_codigo IS NOT NULL AND p_codigo != v_curso.codigo THEN
        IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE codigo = p_codigo AND id != p_curso_id) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese código');
        END IF;
    END IF;
    
    -- Verificar unicidad del nombre si se está actualizando
    IF p_nombre IS NOT NULL AND p_nombre != v_curso.nombre THEN
        IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE nombre = p_nombre AND id != p_curso_id) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese nombre');
        END IF;
    END IF;
    
    -- Actualizar el curso
    UPDATE cursos_catalogo SET
        nombre = COALESCE(p_nombre, nombre),
        codigo = COALESCE(p_codigo, codigo),
        nivel = COALESCE(p_nivel, nivel),
        descripcion = COALESCE(p_descripcion, descripcion),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_curso_id;
    
    -- Obtener el curso actualizado
    SELECT json_build_object(
        'success', true,
        'message', 'Curso actualizado exitosamente',
        'data', json_build_object(
            'id', id,
            'nombre', nombre,
            'codigo', codigo,
            'nivel', nivel,
            'descripcion', descripcion,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM cursos_catalogo
    WHERE id = p_curso_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: eliminar_curso_catalogo
-- Elimina un curso del catálogo si no está asignado
CREATE OR REPLACE FUNCTION eliminar_curso_catalogo(p_curso_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_esta_asignado BOOLEAN;
BEGIN
    -- Verificar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM cursos_catalogo WHERE id = p_curso_id) THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe en el catálogo');
    END IF;
    
    -- Verificar si está asignado a alguna sección
    SELECT EXISTS (
        SELECT 1 FROM cursos WHERE curso_catalogo_id = p_curso_id
    ) INTO v_esta_asignado;
    
    IF v_esta_asignado THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el curso porque está asignado a una o más secciones'
        );
    END IF;
    
    -- Eliminar el curso
    DELETE FROM cursos_catalogo WHERE id = p_curso_id;
    
    RETURN json_build_object('success', true, 'message', 'Curso eliminado del catálogo exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO - GESTIÓN DEL CATÁLOGO
-- ============================================

-- Crear un curso en el catálogo
-- SELECT crear_curso_catalogo('Física', 'FIS', 'secundaria', 'Curso de física para secundaria');

-- Actualizar un curso del catálogo
-- SELECT actualizar_curso_catalogo(18, 'Física Avanzada', NULL, NULL, 'Curso avanzado de física');

-- Eliminar un curso del catálogo
-- SELECT eliminar_curso_catalogo(18);


-- ============================================
-- FUNCIONES CRUD PARA CATÁLOGO DE CURSOS
-- ============================================

-- Función: crear_curso_catalogo
-- Crea un nuevo curso en el catálogo
CREATE OR REPLACE FUNCTION crear_curso_catalogo(
    p_nombre VARCHAR(100),
    p_codigo VARCHAR(20),
    p_nivel VARCHAR(20),
    p_descripcion TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_curso_id BIGINT;
    v_result JSON;
BEGIN
    -- Validar nivel
    IF p_nivel NOT IN ('primaria', 'secundaria', 'ambos') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria, secundaria o ambos');
    END IF;
    
    -- Verificar que no exista el código
    IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE codigo = p_codigo) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese código');
    END IF;
    
    -- Verificar que no exista el nombre
    IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE nombre = p_nombre) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese nombre');
    END IF;
    
    -- Crear el curso
    INSERT INTO cursos_catalogo (nombre, codigo, nivel, descripcion, created_at, updated_at)
    VALUES (p_nombre, p_codigo, p_nivel, p_descripcion, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_curso_id;
    
    -- Obtener el curso creado
    SELECT json_build_object(
        'success', true,
        'message', 'Curso creado exitosamente en el catálogo',
        'data', json_build_object(
            'id', id,
            'nombre', nombre,
            'codigo', codigo,
            'nivel', nivel,
            'descripcion', descripcion,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM cursos_catalogo
    WHERE id = v_curso_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: actualizar_curso_catalogo
-- Actualiza un curso del catálogo
CREATE OR REPLACE FUNCTION actualizar_curso_catalogo(
    p_curso_id BIGINT,
    p_nombre VARCHAR(100) DEFAULT NULL,
    p_codigo VARCHAR(20) DEFAULT NULL,
    p_nivel VARCHAR(20) DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_curso RECORD;
    v_result JSON;
BEGIN
    -- Verificar que el curso existe
    SELECT * INTO v_curso FROM cursos_catalogo WHERE id = p_curso_id;
    
    IF v_curso IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;
    
    -- Validar nivel si se está actualizando
    IF p_nivel IS NOT NULL AND p_nivel NOT IN ('primaria', 'secundaria', 'ambos') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria, secundaria o ambos');
    END IF;
    
    -- Verificar unicidad del código si se está actualizando
    IF p_codigo IS NOT NULL AND p_codigo != v_curso.codigo THEN
        IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE codigo = p_codigo AND id != p_curso_id) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese código');
        END IF;
    END IF;
    
    -- Verificar unicidad del nombre si se está actualizando
    IF p_nombre IS NOT NULL AND p_nombre != v_curso.nombre THEN
        IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE nombre = p_nombre AND id != p_curso_id) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese nombre');
        END IF;
    END IF;
    
    -- Actualizar el curso
    UPDATE cursos_catalogo SET
        nombre = COALESCE(p_nombre, nombre),
        codigo = COALESCE(p_codigo, codigo),
        nivel = COALESCE(p_nivel, nivel),
        descripcion = COALESCE(p_descripcion, descripcion),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_curso_id;
    
    -- Obtener el curso actualizado
    SELECT json_build_object(
        'success', true,
        'message', 'Curso actualizado exitosamente',
        'data', json_build_object(
            'id', id,
            'nombre', nombre,
            'codigo', codigo,
            'nivel', nivel,
            'descripcion', descripcion,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM cursos_catalogo
    WHERE id = p_curso_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: eliminar_curso_catalogo
-- Elimina un curso del catálogo si no está asignado
CREATE OR REPLACE FUNCTION eliminar_curso_catalogo(p_curso_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_asignaciones BOOLEAN;
BEGIN
    -- Verificar que el curso existe
    IF NOT EXISTS (SELECT 1 FROM cursos_catalogo WHERE id = p_curso_id) THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;
    
    -- Verificar si tiene asignaciones
    SELECT EXISTS (
        SELECT 1 FROM cursos WHERE curso_catalogo_id = p_curso_id
    ) INTO v_tiene_asignaciones;
    
    IF v_tiene_asignaciones THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el curso porque está asignado a secciones'
        );
    END IF;
    
    -- Eliminar el curso
    DELETE FROM cursos_catalogo WHERE id = p_curso_id;
    
    RETURN json_build_object('success', true, 'message', 'Curso eliminado exitosamente del catálogo');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO CRUD
-- ============================================

-- Crear un curso en el catálogo
-- SELECT crear_curso_catalogo('Física', 'FIS', 'secundaria', 'Curso de física para secundaria');

-- Actualizar un curso del catálogo
-- SELECT actualizar_curso_catalogo(18, 'Física Avanzada', NULL, NULL, 'Curso avanzado de física');

-- Eliminar un curso del catálogo
-- SELECT eliminar_curso_catalogo(18);
