-- ============================================
-- Matrícula anual (periodos, matrículas, promociones)
-- Idempotente
-- Canónico en runtime: Backend TypeORM MatriculaAnual1735689700000
-- (este SQL es espejo / referencia manual)
-- ============================================

CREATE TABLE IF NOT EXISTS periodos_academicos (
    id BIGSERIAL PRIMARY KEY,
    anio SMALLINT NOT NULL UNIQUE,
    estado VARCHAR(20) NOT NULL DEFAULT 'planificacion'
        CHECK (estado IN ('planificacion', 'matricula', 'activo', 'cerrado')),
    matricula_inicio DATE NULL,
    matricula_fin DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_periodos_estado ON periodos_academicos(estado);

CREATE TABLE IF NOT EXISTS matriculas (
    id BIGSERIAL PRIMARY KEY,
    estudiante_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    periodo_academico_id BIGINT NOT NULL REFERENCES periodos_academicos(id) ON DELETE CASCADE,
    grado_id BIGINT NOT NULL REFERENCES grados(id) ON DELETE CASCADE,
    seccion_id BIGINT NULL REFERENCES secciones(id) ON DELETE SET NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'activa', 'rechazada', 'retirada')),
    tipo VARCHAR(20) NOT NULL
        CHECK (tipo IN ('ingreso', 'continuidad', 'repeticion', 'traslado')),
    origen VARCHAR(20) NOT NULL DEFAULT 'estudiante'
        CHECK (origen IN ('estudiante', 'admin', 'migracion')),
    observaciones TEXT NULL,
    solicitado_por BIGINT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    confirmado_por BIGINT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    confirmado_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_matricula_estudiante_periodo UNIQUE (estudiante_id, periodo_academico_id)
);

CREATE INDEX IF NOT EXISTS idx_matriculas_periodo ON matriculas(periodo_academico_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_estado ON matriculas(estado);
CREATE INDEX IF NOT EXISTS idx_matriculas_grado ON matriculas(grado_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_seccion ON matriculas(seccion_id);

CREATE TABLE IF NOT EXISTS decisiones_promocion (
    id BIGSERIAL PRIMARY KEY,
    matricula_origen_id BIGINT NOT NULL UNIQUE REFERENCES matriculas(id) ON DELETE CASCADE,
    resultado VARCHAR(20) NOT NULL
        CHECK (resultado IN ('promovido', 'repite', 'egresado')),
    grado_destino_id BIGINT NULL REFERENCES grados(id) ON DELETE SET NULL,
    motivo TEXT NULL,
    registrado_por BIGINT NULL REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_decisiones_resultado ON decisiones_promocion(resultado);

ALTER TABLE configuracion_sistema
    ADD COLUMN IF NOT EXISTS periodo_academico_activo_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS grado_ingreso_id BIGINT NULL;

ALTER TABLE cursos
    ADD COLUMN IF NOT EXISTS periodo_academico_id BIGINT NULL;

ALTER TABLE estudiantes_cursos
    ADD COLUMN IF NOT EXISTS matricula_id BIGINT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_periodo_activo_fk') THEN
        ALTER TABLE configuracion_sistema
            ADD CONSTRAINT config_periodo_activo_fk
            FOREIGN KEY (periodo_academico_activo_id) REFERENCES periodos_academicos(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'config_grado_ingreso_fk') THEN
        ALTER TABLE configuracion_sistema
            ADD CONSTRAINT config_grado_ingreso_fk
            FOREIGN KEY (grado_ingreso_id) REFERENCES grados(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cursos_periodo_academico_fk') THEN
        ALTER TABLE cursos
            ADD CONSTRAINT cursos_periodo_academico_fk
            FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'est_cursos_matricula_fk') THEN
        ALTER TABLE estudiantes_cursos
            ADD CONSTRAINT est_cursos_matricula_fk
            FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cursos_periodo ON cursos(periodo_academico_id);
CREATE INDEX IF NOT EXISTS idx_est_cursos_matricula ON estudiantes_cursos(matricula_id);

ALTER TABLE estudiantes_cursos DROP CONSTRAINT IF EXISTS estudiantes_cursos_estudiante_id_curso_id_key;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_est_curso_anio') THEN
        ALTER TABLE estudiantes_cursos
            ADD CONSTRAINT uk_est_curso_anio UNIQUE (estudiante_id, curso_id, anio_academico);
    END IF;
END $$;

-- Backfill período activo desde configuración
INSERT INTO periodos_academicos (anio, estado)
SELECT anio_academico, 'matricula'
FROM configuracion_sistema
WHERE NOT EXISTS (
    SELECT 1 FROM periodos_academicos p
    JOIN configuracion_sistema c ON p.anio = c.anio_academico
)
ON CONFLICT (anio) DO NOTHING;

UPDATE configuracion_sistema cs
SET periodo_academico_activo_id = p.id,
    grado_ingreso_id = COALESCE(
        cs.grado_ingreso_id,
        (SELECT id FROM grados WHERE nivel = 'primaria' AND numero = 1 LIMIT 1)
    )
FROM periodos_academicos p
WHERE p.anio = cs.anio_academico
  AND cs.periodo_academico_activo_id IS NULL;

UPDATE cursos c
SET periodo_academico_id = p.id
FROM periodos_academicos p
JOIN configuracion_sistema cs ON cs.anio_academico = p.anio
WHERE c.periodo_academico_id IS NULL;

INSERT INTO matriculas (
    estudiante_id, periodo_academico_id, grado_id, seccion_id,
    estado, tipo, origen, confirmado_at
)
SELECT DISTINCT ON (u.id, p.id)
    u.id,
    p.id,
    COALESCE(u.grado_id, c.grado_id),
    COALESCE(u.seccion_id, c.seccion_id),
    'activa',
    CASE WHEN u.grado_id IS NULL AND c.grado_id IS NOT NULL THEN 'ingreso' ELSE 'continuidad' END,
    'migracion',
    CURRENT_TIMESTAMP
FROM usuarios u
CROSS JOIN periodos_academicos p
JOIN configuracion_sistema cs ON cs.anio_academico = p.anio
LEFT JOIN estudiantes_cursos ec ON ec.estudiante_id = u.id AND ec.anio_academico = p.anio
LEFT JOIN cursos c ON c.id = ec.curso_id
WHERE u.role = 'estudiante'
  AND (u.grado_id IS NOT NULL OR ec.id IS NOT NULL)
  AND COALESCE(u.grado_id, c.grado_id) IS NOT NULL
ORDER BY u.id, p.id, ec.created_at DESC NULLS LAST
ON CONFLICT (estudiante_id, periodo_academico_id) DO NOTHING;

UPDATE estudiantes_cursos ec
SET matricula_id = m.id
FROM matriculas m
JOIN periodos_academicos p ON p.id = m.periodo_academico_id
WHERE ec.estudiante_id = m.estudiante_id
  AND ec.anio_academico = p.anio
  AND ec.matricula_id IS NULL;
