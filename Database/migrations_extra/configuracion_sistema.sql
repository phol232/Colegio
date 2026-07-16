-- ============================================
-- CONFIGURACIÓN DEL SISTEMA
-- Tabla + funciones get/actualizar
-- ============================================

CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id BIGSERIAL PRIMARY KEY,
    nombre_institucion VARCHAR(255) NOT NULL DEFAULT 'Colegio Frederick',
    anio_academico SMALLINT NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    periodo_evaluacion VARCHAR(50) NOT NULL DEFAULT 'trimestral',
    modo_mantenimiento BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO configuracion_sistema (
    nombre_institucion,
    anio_academico,
    periodo_evaluacion,
    modo_mantenimiento,
    created_at,
    updated_at
)
SELECT
    'Colegio Frederick',
    EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT,
    'trimestral',
    FALSE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM configuracion_sistema LIMIT 1);

CREATE OR REPLACE FUNCTION get_configuracion_sistema()
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'success', true,
        'data', json_build_object(
            'id', c.id,
            'nombre_institucion', c.nombre_institucion,
            'anio_academico', c.anio_academico,
            'periodo_evaluacion', c.periodo_evaluacion,
            'modo_mantenimiento', c.modo_mantenimiento,
            'created_at', c.created_at,
            'updated_at', c.updated_at
        )
    ) INTO v_result
    FROM configuracion_sistema c
    ORDER BY c.id
    LIMIT 1;

    IF v_result IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'No hay configuración del sistema'
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION actualizar_configuracion_sistema(
    p_nombre_institucion VARCHAR(255) DEFAULT NULL,
    p_anio_academico SMALLINT DEFAULT NULL,
    p_periodo_evaluacion VARCHAR(50) DEFAULT NULL,
    p_modo_mantenimiento BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_id BIGINT;
    v_result JSON;
BEGIN
    SELECT id INTO v_id FROM configuracion_sistema ORDER BY id LIMIT 1;

    IF v_id IS NULL THEN
        INSERT INTO configuracion_sistema (
            nombre_institucion,
            anio_academico,
            periodo_evaluacion,
            modo_mantenimiento
        ) VALUES (
            COALESCE(p_nombre_institucion, 'Colegio Frederick'),
            COALESCE(p_anio_academico, EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT),
            COALESCE(p_periodo_evaluacion, 'trimestral'),
            COALESCE(p_modo_mantenimiento, FALSE)
        )
        RETURNING id INTO v_id;
    ELSE
        UPDATE configuracion_sistema
        SET
            nombre_institucion = COALESCE(p_nombre_institucion, nombre_institucion),
            anio_academico = COALESCE(p_anio_academico, anio_academico),
            periodo_evaluacion = COALESCE(p_periodo_evaluacion, periodo_evaluacion),
            modo_mantenimiento = COALESCE(p_modo_mantenimiento, modo_mantenimiento),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_id;
    END IF;

    SELECT json_build_object(
        'success', true,
        'message', 'Configuración actualizada exitosamente',
        'data', json_build_object(
            'id', c.id,
            'nombre_institucion', c.nombre_institucion,
            'anio_academico', c.anio_academico,
            'periodo_evaluacion', c.periodo_evaluacion,
            'modo_mantenimiento', c.modo_mantenimiento,
            'updated_at', c.updated_at
        )
    ) INTO v_result
    FROM configuracion_sistema c
    WHERE c.id = v_id;

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error al actualizar configuración: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
