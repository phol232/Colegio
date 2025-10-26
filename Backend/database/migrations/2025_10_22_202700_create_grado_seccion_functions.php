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
            ) AS secciones
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
    IF p_nivel NOT IN ('primaria', 'secundaria') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria o secundaria');
    END IF;

    IF p_nivel = 'primaria' AND (p_numero < 1 OR p_numero > 6) THEN
        RETURN json_build_object('success', false, 'message', 'El numero de grado para primaria debe estar entre 1 y 6');
    END IF;

    IF p_nivel = 'secundaria' AND (p_numero < 1 OR p_numero > 5) THEN
        RETURN json_build_object('success', false, 'message', 'El numero de grado para secundaria debe estar entre 1 y 5');
    END IF;

    IF EXISTS (SELECT 1 FROM grados WHERE nivel = p_nivel AND numero = p_numero) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un grado con ese nivel y numero');
    END IF;

    INSERT INTO grados (nivel, numero, nombre, created_at, updated_at)
    VALUES (p_nivel, p_numero, p_nombre, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_grado_id;

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
    v_nivel VARCHAR(255);
    v_numero SMALLINT;
BEGIN
    SELECT * INTO v_grado FROM grados WHERE id = p_grado_id;

    IF v_grado IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;

    v_nivel := COALESCE(p_nivel, v_grado.nivel);
    v_numero := COALESCE(p_numero, v_grado.numero);

    IF v_nivel NOT IN ('primaria', 'secundaria') THEN
        RETURN json_build_object('success', false, 'message', 'El nivel debe ser primaria o secundaria');
    END IF;

    IF v_nivel = 'primaria' AND (v_numero < 1 OR v_numero > 6) THEN
        RETURN json_build_object('success', false, 'message', 'El numero de grado para primaria debe estar entre 1 y 6');
    END IF;

    IF v_nivel = 'secundaria' AND (v_numero < 1 OR v_numero > 5) THEN
        RETURN json_build_object('success', false, 'message', 'El numero de grado para secundaria debe estar entre 1 y 5');
    END IF;

    IF EXISTS (
        SELECT 1 FROM grados
        WHERE nivel = v_nivel
        AND numero = v_numero
        AND id != p_grado_id
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe un grado con ese nivel y numero');
    END IF;

    UPDATE grados SET
        nivel = v_nivel,
        numero = v_numero,
        nombre = COALESCE(p_nombre, nombre),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_grado_id;

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

CREATE OR REPLACE FUNCTION eliminar_grado(p_grado_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_secciones BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM grados WHERE id = p_grado_id) THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM secciones WHERE grado_id = p_grado_id
    ) INTO v_tiene_secciones;

    IF v_tiene_secciones THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar el grado porque tiene secciones asociadas'
        );
    END IF;

    DELETE FROM grados WHERE id = p_grado_id;

    RETURN json_build_object('success', true, 'message', 'Grado eliminado exitosamente');
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION listar_secciones_grado(p_grado_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', COALESCE(json_agg(
            json_build_object(
                'id', s.id,
                'nombre', s.nombre,
                'capacidad', s.capacidad,
                'created_at', s.created_at,
                'updated_at', s.updated_at
            ) ORDER BY s.nombre
        ), '[]'::json)
    ) INTO v_result
    FROM secciones s
    WHERE s.grado_id = p_grado_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'message', 'Error: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

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
    IF NOT EXISTS (SELECT 1 FROM grados WHERE id = p_grado_id) THEN
        RETURN json_build_object('success', false, 'message', 'El grado no existe');
    END IF;

    IF EXISTS (
        SELECT 1 FROM secciones
        WHERE grado_id = p_grado_id
        AND nombre = p_nombre
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Ya existe una seccion con ese nombre en este grado');
    END IF;

    INSERT INTO secciones (grado_id, nombre, capacidad, created_at, updated_at)
    VALUES (p_grado_id, p_nombre, p_capacidad, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    RETURNING id INTO v_seccion_id;

    SELECT json_build_object(
        'success', true,
        'message', 'Seccion creada exitosamente',
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
    SELECT * INTO v_seccion FROM secciones WHERE id = p_seccion_id;

    IF v_seccion IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'La seccion no existe');
    END IF;

    IF p_nombre IS NOT NULL AND p_nombre != v_seccion.nombre THEN
        IF EXISTS (
            SELECT 1 FROM secciones
            WHERE grado_id = v_seccion.grado_id
            AND nombre = p_nombre
            AND id != p_seccion_id
        ) THEN
            RETURN json_build_object('success', false, 'message', 'Ya existe una seccion con ese nombre en este grado');
        END IF;
    END IF;

    IF p_capacidad IS NOT NULL AND (p_capacidad < 1 OR p_capacidad > 50) THEN
        RETURN json_build_object('success', false, 'message', 'La capacidad debe estar entre 1 y 50');
    END IF;

    UPDATE secciones SET
        nombre = COALESCE(p_nombre, nombre),
        capacidad = COALESCE(p_capacidad, capacidad),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_seccion_id;

    SELECT json_build_object(
        'success', true,
        'message', 'Seccion actualizada exitosamente',
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

CREATE OR REPLACE FUNCTION eliminar_seccion(p_seccion_id BIGINT)
RETURNS JSON AS $$
DECLARE
    v_tiene_cursos BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM secciones WHERE id = p_seccion_id) THEN
        RETURN json_build_object('success', false, 'message', 'La seccion no existe');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM cursos WHERE seccion_id = p_seccion_id
    ) INTO v_tiene_cursos;

    IF v_tiene_cursos THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No se puede eliminar la seccion porque tiene cursos asociados'
        );
    END IF;

    DELETE FROM secciones WHERE id = p_seccion_id;

    RETURN json_build_object('success', true, 'message', 'Seccion eliminada exitosamente');
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
DROP FUNCTION IF EXISTS listar_grados();
DROP FUNCTION IF EXISTS crear_grado(character varying, smallint, character varying);
DROP FUNCTION IF EXISTS actualizar_grado(bigint, character varying, smallint, character varying);
DROP FUNCTION IF EXISTS eliminar_grado(bigint);
DROP FUNCTION IF EXISTS listar_secciones_grado(bigint);
DROP FUNCTION IF EXISTS crear_seccion(bigint, character varying, integer);
DROP FUNCTION IF EXISTS actualizar_seccion(bigint, character varying, integer);
DROP FUNCTION IF EXISTS eliminar_seccion(bigint);
SQL);
    }
};

