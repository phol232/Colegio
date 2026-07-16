-- ============================================
-- OLTP SCHEMA DELTA
-- Alineación schema_oltp.sql ↔ migraciones Laravel
-- Idempotente (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS)
-- ============================================

-- ----------------------------------------
-- 1) usuarios: grado_id / seccion_id
--    (2025_01_30_000010_add_grado_seccion_to_usuarios)
-- ----------------------------------------
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS grado_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS seccion_id BIGINT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_grado_id_foreign'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_grado_id_foreign
            FOREIGN KEY (grado_id) REFERENCES grados(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_seccion_id_foreign'
    ) THEN
        ALTER TABLE usuarios
            ADD CONSTRAINT usuarios_seccion_id_foreign
            FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_usuarios_grado ON usuarios(grado_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_seccion ON usuarios(seccion_id);

-- ----------------------------------------
-- 2) cursos_catalogo
--    (2025_10_22_192031_create_cursos_catalogo_table)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS cursos_catalogo (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nivel VARCHAR(20) NOT NULL DEFAULT 'ambos'
        CHECK (nivel IN ('primaria', 'secundaria', 'ambos')),
    descripcion TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cursos_catalogo (nombre, codigo, nivel, created_at, updated_at) VALUES
    ('Matemática', 'MAT', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Geometría', 'GEO', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Aritmética', 'ARI', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Álgebra', 'ALG', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Historia Universal', 'HIS-UNI', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Historia del Perú', 'HIS-PER', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Ética y Ciudadanía', 'ETI', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Biología', 'BIO', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Química', 'QUI', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Educación Física', 'ED-FIS', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Talleres', 'TAL', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Computación', 'COM', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Inglés', 'ING', 'ambos', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Arte', 'ART', 'primaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Estadística', 'EST', 'secundaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Trigonometría', 'TRI', 'secundaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('Economía', 'ECO', 'secundaria', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (codigo) DO NOTHING;

-- ----------------------------------------
-- 3) cursos: curso_catalogo_id; drop nombre/codigo legado
--    (192031 + 201943_cleanup_cursos_table)
-- ----------------------------------------
ALTER TABLE cursos
    ADD COLUMN IF NOT EXISTS curso_catalogo_id BIGINT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'cursos_curso_catalogo_id_foreign'
    ) THEN
        ALTER TABLE cursos
            ADD CONSTRAINT cursos_curso_catalogo_id_foreign
            FOREIGN KEY (curso_catalogo_id) REFERENCES cursos_catalogo(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cursos_catalogo ON cursos(curso_catalogo_id);

-- Solo forzar NOT NULL si ya hay datos mapeados o la tabla está vacía
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'cursos' AND column_name = 'curso_catalogo_id')
       AND NOT EXISTS (SELECT 1 FROM cursos WHERE curso_catalogo_id IS NULL)
    THEN
        ALTER TABLE cursos ALTER COLUMN curso_catalogo_id SET NOT NULL;
    END IF;
END $$;

-- Drop columnas legadas si existen (post-migración a catálogo)
ALTER TABLE cursos DROP COLUMN IF EXISTS nombre;
ALTER TABLE cursos DROP COLUMN IF EXISTS codigo;

-- ----------------------------------------
-- 4) evaluaciones / notas_detalle / promedios_unidad
--    (2025_01_25_100000 + 2025_01_29 mes)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS evaluaciones (
    id BIGSERIAL PRIMARY KEY,
    curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    unidad SMALLINT NULL,                          -- nullable tras 2025_01_29_000004
    mes INTEGER NOT NULL,                           -- requerido tras 2025_01_29_000004 (3-12)
    nombre VARCHAR(100) NOT NULL,
    tipo_evaluacion VARCHAR(50) NOT NULL,
    peso DECIMAL(5,2) NULL,
    orden SMALLINT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_evaluacion_curso_unidad_nombre UNIQUE (curso_id, unidad, nombre)
);

-- Si la tabla ya existía sin mes:
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS mes INTEGER NULL;

-- Poblar mes desde unidad si falta (2025_01_29_000003)
UPDATE evaluaciones
SET mes = CASE
    WHEN unidad = 1 THEN 3
    WHEN unidad = 2 THEN 6
    WHEN unidad = 3 THEN 9
    WHEN unidad = 4 THEN 12
    ELSE 3
END
WHERE mes IS NULL;

-- Hacer mes NOT NULL si no hay nulos
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM evaluaciones WHERE mes IS NULL) THEN
        ALTER TABLE evaluaciones ALTER COLUMN mes SET NOT NULL;
    END IF;
END $$;

-- unidad nullable (compatibilidad temporal)
ALTER TABLE evaluaciones ALTER COLUMN unidad DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evaluaciones_curso_unidad ON evaluaciones(curso_id, unidad);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_tipo ON evaluaciones(tipo_evaluacion);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_curso_mes ON evaluaciones(curso_id, mes);

COMMENT ON COLUMN evaluaciones.mes IS 'Mes del año (3-12 para marzo-diciembre)';

CREATE TABLE IF NOT EXISTS notas_detalle (
    id BIGSERIAL PRIMARY KEY,
    evaluacion_id BIGINT NOT NULL REFERENCES evaluaciones(id) ON DELETE CASCADE,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    puntaje DECIMAL(4,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_nota_evaluacion_estudiante UNIQUE (evaluacion_id, estudiante_id)
);

CREATE INDEX IF NOT EXISTS idx_notas_detalle_estudiante ON notas_detalle(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_notas_detalle_evaluacion ON notas_detalle(evaluacion_id);

CREATE TABLE IF NOT EXISTS promedios_unidad (
    id BIGSERIAL PRIMARY KEY,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    curso_id BIGINT NOT NULL REFERENCES cursos(id) ON DELETE CASCADE,
    unidad SMALLINT NOT NULL,
    promedio_numerico DECIMAL(4,2) NOT NULL,
    promedio_literal VARCHAR(2) NULL,
    total_evaluaciones SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_promedio_estudiante_curso_unidad UNIQUE (estudiante_id, curso_id, unidad)
);

CREATE INDEX IF NOT EXISTS idx_promedios_curso_unidad ON promedios_unidad(curso_id, unidad);
CREATE INDEX IF NOT EXISTS idx_promedios_estudiante ON promedios_unidad(estudiante_id);

-- ----------------------------------------
-- 5) Drop tabla notas legada (SOLO si ya migraste datos)
--    (2025_01_25_100007) — comentar si aún necesitas notas
-- ----------------------------------------
-- DROP TABLE IF EXISTS notas;

-- ----------------------------------------
-- 6) usuarios: activo (bloqueo de cuenta)
-- ----------------------------------------
ALTER TABLE usuarios
    ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

COMMENT ON COLUMN usuarios.activo IS 'Si es false, la cuenta está bloqueada y no puede iniciar sesión';
