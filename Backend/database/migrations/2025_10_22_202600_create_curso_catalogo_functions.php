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
        DB::unprepared(<<<'SQL'
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
BEGIN
    SELECT g.id, g.nivel INTO v_grado
    FROM secciones s
    JOIN grados g ON s.grado_id = g.id
    WHERE s.id = p_seccion_id;

    IF v_grado IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'La seccion no existe');
    END IF;

    v_nivel := v_grado.nivel;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_docente_id AND role = 'docente') THEN
        RETURN json_build_object('success', false, 'message', 'El docente no existe');
    END IF;

    IF v_nivel = 'primaria' THEN
        IF EXISTS (
            SELECT 1 FROM cursos
            WHERE seccion_id = p_seccion_id
            AND docente_id != p_docente_id
        ) THEN
            RETURN json_build_object(
                'success', false,
                'message', 'En primaria, todos los cursos de una seccion deben tener el mismo docente'
            );
        END IF;
    END IF;

    DELETE FROM cursos
    WHERE seccion_id = p_seccion_id
    AND curso_catalogo_id NOT IN (SELECT unnest(p_cursos_catalogo_ids));

    GET DIAGNOSTICS v_cursos_eliminados = ROW_COUNT;

    FOREACH v_curso_catalogo_id IN ARRAY p_cursos_catalogo_ids
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM cursos
            WHERE curso_catalogo_id = v_curso_catalogo_id
            AND seccion_id = p_seccion_id
        ) THEN
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

CREATE OR REPLACE FUNCTION desasignar_curso_seccion(p_curso_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_estudiantes BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cursos WHERE id = p_curso_id) THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM estudiantes_cursos WHERE curso_id = p_curso_id
    ) INTO v_tiene_estudiantes;

    IF v_tiene_estudiantes THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el curso porque tiene estudiantes matriculados'
        );
    END IF;

    DELETE FROM cursos WHERE id = p_curso_id;

    RETURN json_build_object('success', true, 'message', 'Curso desasignado exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_docente_curso(
    p_curso_id BIGINT,
    p_docente_id BIGINT
)
RETURNS JSON AS $$
DECLARE
    v_curso RECORD;
    v_nivel VARCHAR;
BEGIN
    SELECT c.*, g.nivel INTO v_curso
    FROM cursos c
    JOIN grados g ON c.grado_id = g.id
    WHERE c.id = p_curso_id;

    IF v_curso IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;

    v_nivel := v_curso.nivel;

    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_docente_id AND role = 'docente') THEN
        RETURN json_build_object('success', false, 'message', 'El docente no existe');
    END IF;

    IF v_nivel = 'primaria' THEN
        IF EXISTS (
            SELECT 1 FROM cursos
            WHERE seccion_id = v_curso.seccion_id
            AND docente_id != p_docente_id
            AND id != p_curso_id
        ) THEN
            RETURN json_build_object(
                'success', false,
                'message', 'En primaria, todos los cursos de una seccion deben tener el mismo docente'
            );
        END IF;
    END IF;

    UPDATE cursos
    SET docente_id = p_docente_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_curso_id;

    RETURN json_build_object('success', true, 'message', 'Docente actualizado exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

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
    IF p_nivel NOT IN ('primaria', 'secundaria', 'ambos') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria, secundaria o ambos');
    END IF;

    IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE codigo = p_codigo) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese codigo');
    END IF;

    IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE nombre = p_nombre) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese nombre');
    END IF;

    INSERT INTO cursos_catalogo (nombre, codigo, nivel, descripcion, created_at, updated_at)
    VALUES (p_nombre, p_codigo, p_nivel, p_descripcion, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_curso_id;

    SELECT json_build_object(
        'success', true,
        'message', 'Curso creado exitosamente en el catalogo',
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
    SELECT * INTO v_curso FROM cursos_catalogo WHERE id = p_curso_id;

    IF v_curso IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;

    IF p_nivel IS NOT NULL AND p_nivel NOT IN ('primaria', 'secundaria', 'ambos') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria, secundaria o ambos');
    END IF;

    IF p_codigo IS NOT NULL AND p_codigo != v_curso.codigo THEN
        IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE codigo = p_codigo AND id != p_curso_id) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese codigo');
        END IF;
    END IF;

    IF p_nombre IS NOT NULL AND p_nombre != v_curso.nombre THEN
        IF EXISTS (SELECT 1 FROM cursos_catalogo WHERE nombre = p_nombre AND id != p_curso_id) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe un curso con ese nombre');
        END IF;
    END IF;

    UPDATE cursos_catalogo SET
        nombre = COALESCE(p_nombre, nombre),
        codigo = COALESCE(p_codigo, codigo),
        nivel = COALESCE(p_nivel, nivel),
        descripcion = COALESCE(p_descripcion, descripcion),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_curso_id;

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

CREATE OR REPLACE FUNCTION eliminar_curso_catalogo(p_curso_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_asignaciones BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM cursos_catalogo WHERE id = p_curso_id) THEN
        RETURN json_build_object('success', false, 'message', 'El curso no existe');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM cursos WHERE curso_catalogo_id = p_curso_id
    ) INTO v_tiene_asignaciones;

    IF v_tiene_asignaciones THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el curso porque esta asignado a secciones'
        );
    END IF;

    DELETE FROM cursos_catalogo WHERE id = p_curso_id;

    RETURN json_build_object('success', true, 'message', 'Curso eliminado exitosamente del catalogo');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;
SQL);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared(<<<'SQL'
DROP FUNCTION IF EXISTS listar_catalogo_cursos(character varying);
DROP FUNCTION IF EXISTS asignar_cursos_seccion(bigint, bigint, bigint[]);
DROP FUNCTION IF EXISTS listar_cursos_seccion(bigint);
DROP FUNCTION IF EXISTS desasignar_curso_seccion(bigint);
DROP FUNCTION IF EXISTS actualizar_docente_curso(bigint, bigint);
DROP FUNCTION IF EXISTS crear_curso_catalogo(character varying, character varying, character varying, text);
DROP FUNCTION IF EXISTS actualizar_curso_catalogo(bigint, character varying, character varying, character varying, text);
DROP FUNCTION IF EXISTS eliminar_curso_catalogo(bigint);
SQL);
    }
};
