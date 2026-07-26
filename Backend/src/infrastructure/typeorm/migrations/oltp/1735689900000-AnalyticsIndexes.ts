import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Índices para consultas de análisis sobre OLTP.
 * Fuente: Database/migrations_extra/analytics_indexes.sql
 */
export class AnalyticsIndexes1735689900000 implements MigrationInterface {
  name = 'AnalyticsIndexes1735689900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_asistencias_curso_estudiante_fecha
        ON asistencias (curso_id, estudiante_id, fecha)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promedios_curso_estudiante_unidad
        ON promedios_unidad (curso_id, estudiante_id, unidad)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_est_cursos_curso
        ON estudiantes_cursos (curso_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_est_cursos_estudiante
        ON estudiantes_cursos (estudiante_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cursos_docente
        ON cursos (docente_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promedios_curso_unidad
        ON promedios_unidad (curso_id, unidad)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promedios_estudiante
        ON promedios_unidad (estudiante_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_asistencias_curso_estudiante_fecha`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_promedios_curso_estudiante_unidad`,
    );
    // Los demás índices pueden existir desde schema_oltp / deltas; no los
    // eliminamos en down para no romper entornos que los tenían de antes.
  }
}
