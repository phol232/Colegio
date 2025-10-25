-- ============================================
-- FUNCIONES DE GESTIÓN DE GRADOS Y SECCIONES
-- ============================================

-- Función: listar_grados
-- Lista todos los grados con sus secciones
CREATE OR REPLACE FUNCTION listar_grados()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH grados_con_secciones AS (
        SELECT 
            g.id,
            g.nivel,
            g.numero,
            g.nombre,
            g.created_at,
            g.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', s.id,
                        'nombre', s.nombre,
                        'capacidad', s.capacidad,
                        'created_at', s.created_at,
                        'updated_at', s.updated_at
                    ) ORDER BY s.nombre
                ) FILTER (WHERE s.id IS NOT NULL),
                '[]'::json
            ) as secciones
        FROM grados g
        LEFT JOIN secciones s ON s.grado_id = g.id
        GROUP BY g.id, g.nivel, g.numero, g.nombre, g.created_at, g.updated_at
    )
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', id,
                'nivel', nivel,
                'numero', numero,
                'nombre', nombre,
                'created_at', created_at,
                'updated_at', updated_at,
                'secciones', secciones
            ) ORDER BY nivel, numero
        ), '[]'::json)
    ) INTO v_result
    FROM grados_con_secciones;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: crear_grado
-- Crea un nuevo grado
CREATE OR REPLACE FUNCTION crear_grado(
    p_nivel VARCHAR(255),
    p_numero SMALLINT,
    p_nombre VARCHAR(255)
)
RETURNS JSON AS $$
DECLARE
    v_grado_id BIGINT;
    v_result JSON;
BEGIN
    -- Validar nivel
    IF p_nivel NOT IN ('primaria', 'secundaria') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria o secundaria');
    END IF;
    
    -- Validar número según nivel
    IF p_nivel = 'primaria' AND (p_numero < 1 OR p_numero > 6) THEN
        RETURN json_build_object('success', false, 'message', 'El número de grado para primaria debe estar entre 1 y 6');
    END IF;
    
    IF p_nivel = 'secundaria' AND (p_numero < 1 OR p_numero > 5) THEN
        RETURN json_build_object('success', false, 'message', 'El número de grado para secundaria debe estar entre 1 y 5');
    END IF;
    
    -- Verificar que no exista el grado
    IF EXISTS (SELECT 1 FROM grados WHERE nivel = p_nivel AND numero = p_numero) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un grado con ese nivel y número');
    END IF;
    
    -- Crear el grado
    INSERT INTO grados (nivel, numero, nombre, created_at, updated_at)
    VALUES (p_nivel, p_numero, p_nombre, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_grado_id;
    
    -- Obtener el grado creado
    SELECT json_build_object(
        'success', true,
        'message', 'Grado creado exitosamente',
        'data', json_build_object(
            'id', id,
            'nivel', nivel,
            'numero', numero,
            'nombre', nombre,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM grados
    WHERE id = v_grado_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: actualizar_grado
-- Actualiza un grado existente
CREATE OR REPLACE FUNCTION actualizar_grado(
    p_grado_id BIGINT,
    p_nivel VARCHAR(255) DEFAULT NULL,
    p_numero SMALLINT DEFAULT NULL,
    p_nombre VARCHAR(255) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_grado RECORD;
    v_result JSON;
BEGIN
    -- Verificar que el grado existe
    SELECT * INTO v_grado FROM grados WHERE id = p_grado_id;
    
    IF v_grado IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;
    
    -- Validar nivel si se está actualizando
    IF p_nivel IS NOT NULL AND p_nivel NOT IN ('primaria', 'secundaria') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria o secundaria');
    END IF;
    
    -- Validar número según nivel si se están actualizando
    IF p_nivel IS NOT NULL AND p_numero IS NOT NULL THEN
        IF p_nivel = 'primaria' AND (p_numero < 1 OR p_numero > 6) THEN
            RETURN json_build_object('success', false, 'message', 'El número de grado para primaria debe estar entre 1 y 6');
        END IF;
        
        IF p_nivel = 'secundaria' AND (p_numero < 1 OR p_numero > 5) THEN
            RETURN json_build_object('success', false, 'message', 'El número de grado para secundaria debe estar entre 1 y 5');
        END IF;
    END IF;
    
    -- Verificar unicidad si se está actualizando nivel o número
    IF (p_nivel IS NOT NULL OR p_numero IS NOT NULL) THEN
        IF EXISTS (
            SELECT 1 FROM grados 
            WHERE nivel = COALESCE(p_nivel, v_grado.nivel) 
            AND numero = COALESCE(p_numero, v_grado.numero)
            AND id != p_grado_id
        ) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un grado con ese nivel y número');
        END IF;
    END IF;
    
    -- Actualizar el grado
    UPDATE grados SET
        nivel = COALESCE(p_nivel, nivel),
        numero = COALESCE(p_numero, numero),
        nombre = COALESCE(p_nombre, nombre),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_grado_id;
    
    -- Obtener el grado actualizado
    SELECT json_build_object(
        'success', true,
        'message', 'Grado actualizado exitosamente',
        'data', json_build_object(
            'id', id,
            'nivel', nivel,
            'numero', numero,
            'nombre', nombre,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM grados
    WHERE id = p_grado_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: eliminar_grado
-- Elimina un grado si no tiene secciones asociadas
CREATE OR REPLACE FUNCTION eliminar_grado(p_grado_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_secciones BOOLEAN;
BEGIN
    -- Verificar que el grado existe
    IF NOT EXISTS (SELECT 1 FROM grados WHERE id = p_grado_id) THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;
    
    -- Verificar si tiene secciones
    SELECT EXISTS (
        SELECT 1 FROM secciones WHERE grado_id = p_grado_id
    ) INTO v_tiene_secciones;
    
    IF v_tiene_secciones THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el grado porque tiene secciones asociadas'
        );
    END IF;
    
    -- Eliminar el grado
    DELETE FROM grados WHERE id = p_grado_id;
    
    RETURN json_build_object('success', true, 'message', 'Grado eliminado exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIONES DE SECCIONES
-- ============================================

-- Función: listar_secciones_grado
-- Lista las secciones de un grado específico
CREATE OR REPLACE FUNCTION listar_secciones_grado(p_grado_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    -- Verificar que el grado existe
    IF NOT EXISTS (SELECT 1 FROM grados WHERE id = p_grado_id) THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;
    
    WITH secciones_con_cursos AS (
        SELECT 
            s.id,
            s.nombre,
            s.capacidad,
            s.grado_id,
            s.created_at,
            s.updated_at,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', c.id,
                        'nombre', c.nombre,
                        'codigo', c.codigo
                    ) ORDER BY c.nombre
                ) FILTER (WHERE c.id IS NOT NULL),
                '[]'::json
            ) as cursos
        FROM secciones s
        LEFT JOIN cursos c ON c.seccion_id = s.id
        WHERE s.grado_id = p_grado_id
        GROUP BY s.id, s.nombre, s.capacidad, s.grado_id, s.created_at, s.updated_at
    )
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', id,
                'nombre', nombre,
                'capacidad', capacidad,
                'grado_id', grado_id,
                'created_at', created_at,
                'updated_at', updated_at,
                'cursos', cursos
            ) ORDER BY nombre
        ), '[]'::json)
    ) INTO v_result
    FROM secciones_con_cursos;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: crear_seccion
-- Crea una nueva sección para un grado
CREATE OR REPLACE FUNCTION crear_seccion(
    p_grado_id BIGINT,
    p_nombre VARCHAR(10),
    p_capacidad INTEGER DEFAULT 30
)
RETURNS JSON AS $$
DECLARE
    v_seccion_id BIGINT;
    v_result JSON;
BEGIN
    -- Verificar que el grado existe
    IF NOT EXISTS (SELECT 1 FROM grados WHERE id = p_grado_id) THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;
    
    -- Verificar que no exista la sección en ese grado
    IF EXISTS (SELECT 1 FROM secciones WHERE grado_id = p_grado_id AND nombre = p_nombre) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe una sección con ese nombre en este grado');
    END IF;
    
    -- Validar capacidad
    IF p_capacidad < 1 OR p_capacidad > 50 THEN
        RETURN json_build_object('success', false, 'message', 'La capacidad debe estar entre 1 y 50');
    END IF;
    
    -- Crear la sección
    INSERT INTO secciones (grado_id, nombre, capacidad, created_at, updated_at)
    VALUES (p_grado_id, p_nombre, p_capacidad, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_seccion_id;
    
    -- Obtener la sección creada
    SELECT json_build_object(
        'success', true,
        'message', 'Sección creada exitosamente',
        'data', json_build_object(
            'id', id,
            'grado_id', grado_id,
            'nombre', nombre,
            'capacidad', capacidad,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM secciones
    WHERE id = v_seccion_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: actualizar_seccion
-- Actualiza una sección existente
CREATE OR REPLACE FUNCTION actualizar_seccion(
    p_seccion_id BIGINT,
    p_nombre VARCHAR(10) DEFAULT NULL,
    p_capacidad INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_seccion RECORD;
    v_result JSON;
BEGIN
    -- Verificar que la sección existe
    SELECT * INTO v_seccion FROM secciones WHERE id = p_seccion_id;
    
    IF v_seccion IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'La sección no existe');
    END IF;
    
    -- Verificar unicidad del nombre si se está actualizando
    IF p_nombre IS NOT NULL AND p_nombre != v_seccion.nombre THEN
        IF EXISTS (
            SELECT 1 FROM secciones 
            WHERE grado_id = v_seccion.grado_id 
            AND nombre = p_nombre 
            AND id != p_seccion_id
        ) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe una sección con ese nombre en este grado');
        END IF;
    END IF;
    
    -- Validar capacidad si se está actualizando
    IF p_capacidad IS NOT NULL AND (p_capacidad < 1 OR p_capacidad > 50) THEN
        RETURN json_build_object('success', false, 'message', 'La capacidad debe estar entre 1 y 50');
    END IF;
    
    -- Actualizar la sección
    UPDATE secciones SET
        nombre = COALESCE(p_nombre, nombre),
        capacidad = COALESCE(p_capacidad, capacidad),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_seccion_id;
    
    -- Obtener la sección actualizada
    SELECT json_build_object(
        'success', true,
        'message', 'Sección actualizada exitosamente',
        'data', json_build_object(
            'id', id,
            'grado_id', grado_id,
            'nombre', nombre,
            'capacidad', capacidad,
            'created_at', created_at,
            'updated_at', updated_at
        )
    ) INTO v_result
    FROM secciones
    WHERE id = p_seccion_id;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Función: eliminar_seccion
-- Elimina una sección si no tiene cursos asociados
CREATE OR REPLACE FUNCTION eliminar_seccion(p_seccion_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_cursos BOOLEAN;
BEGIN
    -- Verificar que la sección existe
    IF NOT EXISTS (SELECT 1 FROM secciones WHERE id = p_seccion_id) THEN
        RETURN json_build_object('success', false, 'message', 'La sección no existe');
    END IF;
    
    -- Verificar si tiene cursos
    SELECT EXISTS (
        SELECT 1 FROM cursos WHERE seccion_id = p_seccion_id
    ) INTO v_tiene_cursos;
    
    IF v_tiene_cursos THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar la sección porque tiene cursos asociados'
        );
    END IF;
    
    -- Eliminar la sección
    DELETE FROM secciones WHERE id = p_seccion_id;
    
    RETURN json_build_object('success', true, 'message', 'Sección eliminada exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EJEMPLOS DE USO
-- ============================================

-- Listar todos los grados con secciones
-- SELECT listar_grados();

-- Crear un grado
-- SELECT crear_grado('primaria', 1, '1ro Primaria');

-- Actualizar un grado
-- SELECT actualizar_grado(1, NULL, NULL, '1er Grado Primaria');

-- Eliminar un grado
-- SELECT eliminar_grado(1);

-- Listar secciones de un grado
-- SELECT listar_secciones_grado(1);

-- Crear una sección
-- SELECT crear_seccion(1, 'A', 30);

-- Actualizar una sección
-- SELECT actualizar_seccion(1, 'B', 35);

-- Eliminar una sección
-- SELECT eliminar_seccion(1);
