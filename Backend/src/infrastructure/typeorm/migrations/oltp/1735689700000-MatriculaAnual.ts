import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Matrícula anual: periodos_academicos, matriculas, decisiones_promocion
 * y columnas de soporte en cursos, estudiantes_cursos y configuracion_sistema.
 */
export class MatriculaAnual1735689700000 implements MigrationInterface {
  name = 'MatriculaAnual1735689700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS periodos_academicos (
        id BIGSERIAL PRIMARY KEY,
        anio SMALLINT NOT NULL UNIQUE,
        estado VARCHAR(20) NOT NULL DEFAULT 'planificacion'
          CHECK (estado IN ('planificacion', 'matricula', 'activo', 'cerrado')),
        matricula_inicio DATE NULL,
        matricula_fin DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_periodos_estado ON periodos_academicos(estado)
    `);

    await queryRunner.query(`
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
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_matriculas_periodo ON matriculas(periodo_academico_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_matriculas_estado ON matriculas(estado)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_matriculas_grado ON matriculas(grado_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_matriculas_seccion ON matriculas(seccion_id)
    `);

    await queryRunner.query(`
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
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_decisiones_resultado ON decisiones_promocion(resultado)
    `);

    await queryRunner.query(`
      ALTER TABLE configuracion_sistema
        ADD COLUMN IF NOT EXISTS periodo_academico_activo_id BIGINT NULL,
        ADD COLUMN IF NOT EXISTS grado_ingreso_id BIGINT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE cursos
        ADD COLUMN IF NOT EXISTS periodo_academico_id BIGINT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE estudiantes_cursos
        ADD COLUMN IF NOT EXISTS matricula_id BIGINT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'config_periodo_activo_fk'
        ) THEN
          ALTER TABLE configuracion_sistema
            ADD CONSTRAINT config_periodo_activo_fk
            FOREIGN KEY (periodo_academico_activo_id) REFERENCES periodos_academicos(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'config_grado_ingreso_fk'
        ) THEN
          ALTER TABLE configuracion_sistema
            ADD CONSTRAINT config_grado_ingreso_fk
            FOREIGN KEY (grado_ingreso_id) REFERENCES grados(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'cursos_periodo_academico_fk'
        ) THEN
          ALTER TABLE cursos
            ADD CONSTRAINT cursos_periodo_academico_fk
            FOREIGN KEY (periodo_academico_id) REFERENCES periodos_academicos(id) ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'est_cursos_matricula_fk'
        ) THEN
          ALTER TABLE estudiantes_cursos
            ADD CONSTRAINT est_cursos_matricula_fk
            FOREIGN KEY (matricula_id) REFERENCES matriculas(id) ON DELETE SET NULL;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cursos_periodo ON cursos(periodo_academico_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_est_cursos_matricula ON estudiantes_cursos(matricula_id)
    `);

    await queryRunner.query(`
      ALTER TABLE estudiantes_cursos
        DROP CONSTRAINT IF EXISTS estudiantes_cursos_estudiante_id_curso_id_key
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uk_est_curso_anio'
        ) THEN
          ALTER TABLE estudiantes_cursos
            ADD CONSTRAINT uk_est_curso_anio UNIQUE (estudiante_id, curso_id, anio_academico);
        END IF;
      END $$
    `);

    await this.backfill(queryRunner);
  }

  private async backfill(queryRunner: QueryRunner): Promise<void> {
    const configRows = await queryRunner.query(`
      SELECT anio_academico FROM configuracion_sistema LIMIT 1
    `);
    const anioConfig =
      configRows.length > 0
        ? Number(configRows[0].anio_academico)
        : new Date().getFullYear();

    const aniosRows = await queryRunner.query(`
      SELECT DISTINCT anio_academico AS anio FROM estudiantes_cursos
      UNION
      SELECT ${anioConfig}::SMALLINT
      ORDER BY anio
    `);

    for (const row of aniosRows) {
      const anio = Number(row.anio);
      await queryRunner.query(
        `
        INSERT INTO periodos_academicos (anio, estado, matricula_inicio, matricula_fin)
        VALUES ($1, $2, NULL, NULL)
        ON CONFLICT (anio) DO NOTHING
      `,
        [anio, anio === anioConfig ? 'matricula' : 'cerrado'],
      );
    }

    await queryRunner.query(`
      UPDATE cursos c
      SET periodo_academico_id = p.id
      FROM periodos_academicos p
      WHERE c.periodo_academico_id IS NULL
        AND p.anio = (
          SELECT COALESCE(
            (SELECT anio_academico FROM configuracion_sistema LIMIT 1),
            EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT
          )
        )
    `);

    await queryRunner.query(`
      INSERT INTO matriculas (
        estudiante_id, periodo_academico_id, grado_id, seccion_id,
        estado, tipo, origen, confirmado_at, created_at, updated_at
      )
      SELECT DISTINCT ON (u.id, p.id)
        u.id,
        p.id,
        COALESCE(u.grado_id, c.grado_id),
        COALESCE(u.seccion_id, c.seccion_id),
        'activa',
        CASE WHEN u.grado_id IS NULL AND c.grado_id IS NOT NULL THEN 'ingreso' ELSE 'continuidad' END,
        'migracion',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM usuarios u
      CROSS JOIN periodos_academicos p
      LEFT JOIN estudiantes_cursos ec ON ec.estudiante_id = u.id AND ec.anio_academico = p.anio
      LEFT JOIN cursos c ON c.id = ec.curso_id
      WHERE u.role = 'estudiante'
        AND (u.grado_id IS NOT NULL OR ec.id IS NOT NULL)
        AND COALESCE(u.grado_id, c.grado_id) IS NOT NULL
      ORDER BY u.id, p.id, ec.created_at DESC NULLS LAST
      ON CONFLICT (estudiante_id, periodo_academico_id) DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE estudiantes_cursos ec
      SET matricula_id = m.id
      FROM matriculas m
      JOIN periodos_academicos p ON p.id = m.periodo_academico_id
      WHERE ec.estudiante_id = m.estudiante_id
        AND ec.anio_academico = p.anio
        AND ec.matricula_id IS NULL
    `);

    await queryRunner.query(`
      UPDATE configuracion_sistema cs
      SET periodo_academico_activo_id = p.id,
          grado_ingreso_id = COALESCE(
            cs.grado_ingreso_id,
            (SELECT id FROM grados WHERE nivel = 'primaria' AND numero = 1 LIMIT 1)
          )
      FROM periodos_academicos p
      WHERE p.anio = cs.anio_academico
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE estudiantes_cursos DROP CONSTRAINT IF EXISTS uk_est_curso_anio
    `);
    await queryRunner.query(`
      ALTER TABLE estudiantes_cursos DROP CONSTRAINT IF EXISTS est_cursos_matricula_fk
    `);
    await queryRunner.query(`
      ALTER TABLE estudiantes_cursos DROP COLUMN IF EXISTS matricula_id
    `);
    await queryRunner.query(`
      ALTER TABLE cursos DROP CONSTRAINT IF EXISTS cursos_periodo_academico_fk
    `);
    await queryRunner.query(`
      ALTER TABLE cursos DROP COLUMN IF EXISTS periodo_academico_id
    `);
    await queryRunner.query(`
      ALTER TABLE configuracion_sistema DROP CONSTRAINT IF EXISTS config_periodo_activo_fk
    `);
    await queryRunner.query(`
      ALTER TABLE configuracion_sistema DROP CONSTRAINT IF EXISTS config_grado_ingreso_fk
    `);
    await queryRunner.query(`
      ALTER TABLE configuracion_sistema
        DROP COLUMN IF EXISTS periodo_academico_activo_id,
        DROP COLUMN IF EXISTS grado_ingreso_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS decisiones_promocion`);
    await queryRunner.query(`DROP TABLE IF EXISTS matriculas`);
    await queryRunner.query(`DROP TABLE IF EXISTS periodos_academicos`);
  }
}
